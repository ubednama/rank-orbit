import { Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import {
  AiCrawlResponse,
  LighthouseMetrics,
  ReadabilityStats,
  TechnicalAnalysis,
} from "@shared/types";
import { spawn } from "child_process";
import * as path from "path";

@Injectable()
export class CrawlService {
  private readonly logger = new Logger(CrawlService.name);

  async extractMetadata(url: string): Promise<AiCrawlResponse> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
      );
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      const metadata = await page.evaluate(() => {
        const getMetaContent = (name: string) =>
          document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ||
          document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ||
          "";

        const images = Array.from(document.images).map((img) => ({
          src: img.src,
          alt: img.alt,
        }));

        const h1 = Array.from(document.querySelectorAll("h1")).map((h) => h.innerText);
        const h2 = Array.from(document.querySelectorAll("h2")).map((h) => h.innerText);
        const h3 = Array.from(document.querySelectorAll("h3")).map((h) => h.innerText);

        return {
          title: document.title,
          description: getMetaContent("description"),
          og_title: getMetaContent("og:title"),
          og_description: getMetaContent("og:description"),
          og_image: getMetaContent("og:image"),
          h1,
          h2,
          h3,
          images,
          missing_alt_count: images.filter((img) => !img.alt).length,
        };
      });

      const htmlContent = await page.content();

      // Sanitize HTML Content for AI Context
      const $ = cheerio.load(htmlContent);
      $("script").remove();
      $("style").remove();
      $("svg").remove();
      $("noscript").remove();
      $("iframe").remove();
      $("link").remove();
      $("meta").remove(); // Metadata is already extracted separately

      // Get cleaned body text and minimal HTML structure
      const page_content = $("body").html()?.replace(/\s+/g, " ").trim() || "";

      // Calculate Readability
      const readability_analysis = this.calculateReadability(page_content);

      return { metadata, page_content, readability_analysis };
    } catch (error) {
      this.logger.error(`Error extracting metadata for ${url}: ${error}`);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  calculateReadability(content: string): ReadabilityStats | null {
    if (!content) return null;
    // Strip HTML for word counting
    const text = content
      .replace(/<[^>]*>?/gm, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words: string[] = text.match(/\b\w+\b/g) || [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = sentences.length || 1;

    // Syllable heuristic
    const countSyllables = (word: string) => {
      word = word.toLowerCase().replace(/[^a-z]/g, "");
      if (word.length <= 3) return 1;
      word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
      word = word.replace(/^y/, "");
      const syllables = word.match(/[aeiouy]{1,2}/g);
      return syllables ? syllables.length : 1;
    };

    const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
    const score = 0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59;

    // Keyword Density
    const frequency: Record<string, number> = {};
    const stopWords = new Set([
      "the",
      "and",
      "a",
      "to",
      "of",
      "in",
      "it",
      "is",
      "that",
      "for",
      "on",
      "was",
      "with",
      "as",
      "at",
      "by",
      "an",
      "be",
      "this",
      "or",
      "are",
      "from",
      "but",
      "not",
      "have",
      "had",
      "has",
    ]);

    words.forEach((w) => {
      const lower = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lower.length > 3 && !stopWords.has(lower) && !/^\d+$/.test(lower)) {
        frequency[lower] = (frequency[lower] || 0) + 1;
      }
    });

    const density = Object.entries(frequency)
      .map(([word, count]) => ({ word, count, percent: (count / wordCount) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return {
      grade: Math.max(0, Math.round(score * 10) / 10),
      wordCount,
      avgSentenceLength: Math.round(wordCount / sentenceCount),
      density,
    };
  }

  calculateTechnicalAnalysis(metrics: LighthouseMetrics): TechnicalAnalysis {
    const results: any = {};

    const getVal = (key: keyof LighthouseMetrics) => {
      const val = metrics[key];
      if (typeof val === "number") return val;
      if (typeof val === "string") return parseFloat(val.split(" ")[0]) || 0;
      return 0;
    };

    // Performance (Assuming 0-1)
    let perf = getVal("performance_score");
    if (perf <= 1) perf *= 100;
    results["Performance"] = {
      value: Math.round(perf),
      status: perf < 50 ? "Poor" : perf < 90 ? "Needs Work" : "Excellent",
    };

    // Accessibility
    let acc = getVal("accessibility_score");
    if (acc <= 1) acc *= 100;
    results["Accessibility"] = {
      value: Math.round(acc),
      status: acc < 90 ? "Needs Work" : "Excellent",
    };

    // LCP (s)
    const lcp = getVal("lcp");
    results["LCP"] = {
      value: `${lcp} s`,
      status: lcp > 4.0 ? "Critical" : lcp > 2.5 ? "Needs Work" : "Good",
    };

    // CLS
    const cls = getVal("cls");
    results["CLS"] = {
      value: cls,
      status: cls > 0.25 ? "Poor" : cls > 0.1 ? "Needs Work" : "Good",
    };

    // TBT (ms)
    const tbt = getVal("tbt");
    results["TBT"] = {
      value: `${Math.round(tbt)} ms`,
      status: tbt > 600 ? "Critical" : tbt > 200 ? "Moderate" : "Good",
    };

    // FCP (s)
    const fcp = getVal("fcp");
    results["FCP"] = {
      value: `${fcp} s`,
      status: fcp > 3.0 ? "Poor" : fcp > 1.8 ? "Moderate" : "Good",
    };

    // Speed Index (s)
    const si = getVal("speed_index");
    results["Speed Index"] = {
      value: `${si} s`,
      status: si > 5.8 ? "Critical" : si > 3.4 ? "Moderate" : "Good",
    };

    return results;
  }

  async runLighthouse(url: string): Promise<LighthouseMetrics> {
    return new Promise((resolve) => {
      // Locate the worker script
      // In dev (nx serve), assets are in dist/apps/crawler-service/assets
      // The CWD when running "node dist/apps/crawler-service/main.js" is the workspace root
      // So we need to point to dist/apps/crawler-service/assets/lighthouse-worker.mjs

      // We can try to resolve it relative to the current working directory
      const workerPath = path.join(
        process.cwd(),
        "dist/apps/crawler-service/assets/lighthouse-worker.mjs",
      );

      this.logger.log(`Spawning Lighthouse worker at: ${workerPath} for url: ${url}`);

      const child = spawn("node", [workerPath, url]);

      let stdoutData = "";
      let stderrData = "";

      child.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      child.on("close", (code) => {
        if (code !== 0) {
          this.logger.error(`Lighthouse worker failed with code ${code}`);
          this.logger.error(`Worker stderr: ${stderrData}`);

          // Try to parse error from stderr if it matches JSON structure
          try {
            const errorJson = JSON.parse(stderrData);
            resolve(this.getErrorMetrics(errorJson.error || "Unknown Worker Error"));
          } catch {
            resolve(this.getErrorMetrics(`Worker failed: ${stderrData}`));
          }
          return;
        }

        try {
          // find the last line that looks like JSON, in case of extra logs
          const lines = stdoutData.trim().split("\n");
          const jsonLine = lines[lines.length - 1];
          const metrics = JSON.parse(jsonLine);
          resolve(metrics);
        } catch (e) {
          this.logger.error(`Failed to parse Lighthouse worker output: ${e}`);
          this.logger.debug(`Stdout: ${stdoutData}`);
          resolve(this.getErrorMetrics("Failed to parse worker output"));
        }
      });

      child.on("error", (err) => {
        this.logger.error(`Failed to spawn Lighthouse worker: ${err}`);
        resolve(this.getErrorMetrics(err.message));
      });
    });
  }

  private getErrorMetrics(message: string): LighthouseMetrics {
    return {
      performance_score: 0,
      accessibility_score: 0,
      lcp: "N/A",
      cls: "N/A",
      tbt: "N/A",
      fcp: "N/A",
      speed_index: "N/A",
      error: message,
    };
  }
}

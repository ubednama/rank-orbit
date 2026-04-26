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
import * as fs from "fs";
import { fileURLToPath } from "url";
import { logger } from "../logger";

/**
 * Web crawling and analysis service using Puppeteer and Lighthouse
 * Extracts SEO metadata, calculates readability metrics, and runs performance audits
 */
export class CrawlService {
  private readonly logger = logger;

  /**
   * Orchestrates full page analysis including metadata extraction and readability calculation
   * Launches headless browser, extracts structured data, and cleans content for AI processing
   *
   * @param url - Target URL to analyze
   * @returns Complete crawl results with metadata, sanitized content, and readability stats
   * @throws Error if page fails to load or critical extraction errors occur
   */
  async extractMetadata(
    url: string,
  ): Promise<Omit<AiCrawlResponse, "lighthouse_metrics" | "technical_analysis">> {
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
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      // tsx + esbuild's --keep-names wraps inner arrow funcs with __name(...) calls.
      // Puppeteer serializes the page.evaluate body and runs it in the browser, where
      // __name doesn't exist. Inject a no-op polyfill before any evaluate() that relies
      // on inner named arrows. (Plain string evaluate bypasses tsx transpilation.)
      await page.evaluate(
        "globalThis.__name = function(t, v) { try { Object.defineProperty(t, 'name', { value: v, configurable: true }); } catch (e) {} return t; };",
      );

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

      /**
       * Content Sanitization Pipeline:
       * Remove all non-content elements to minimize AI token usage
       * while preserving semantic structure for analysis
       */
      const $ = cheerio.load(htmlContent);
      $("script").remove();
      $("style").remove();
      $("svg").remove();
      $("noscript").remove();
      $("iframe").remove();
      $("link").remove();
      $("meta").remove(); // Metadata already extracted programmatically

      // Extract clean body content with normalized whitespace
      const page_content = $("body").html()?.replace(/\s+/g, " ").trim() || "";

      // Generate readability metrics using Flesch Reading Ease algorithm
      const readability_analysis = this.calculateReadability(page_content);

      return { metadata, page_content, readability_analysis };
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Error extracting metadata for ${url}: ${stack}`);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Calculates Flesch Reading Ease score and keyword density analysis
   *
   * Algorithm:
   * - Flesch score = 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
   * - Lower scores indicate more complex text
   * - Extracts top 12 non-stopword keywords with frequency percentages
   *
   * @param content - HTML or plain text content to analyze
   * @returns Readability statistics including grade level, word count, and keyword density
   */
  calculateReadability(content: string): ReadabilityStats | null {
    if (!content) return null;

    // Strip HTML tags for accurate word/sentence counting
    const text = content
      .replace(/<[^>]*>?/gm, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words: string[] = text.match(/\b\w+\b/g) || [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = sentences.length || 1;

    // Heuristic syllable counter using vowel cluster detection
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

    /**
     * Keyword density calculation:
     * Filters stopwords, digit-only tokens, and short words (<= 3 chars)
     * Provides insight into content focus and potential keyword stuffing
     */
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

  /**
   * Categorizes Lighthouse metrics into human-readable technical analysis
   * Maps raw scores and Core Web Vitals to qualitative assessments
   *
   * @param metrics - Raw Lighthouse performance data
   * @returns Categorized technical analysis with status indicators (Good/Moderate/Poor/Critical)
   */
  calculateTechnicalAnalysis(metrics: LighthouseMetrics): TechnicalAnalysis {
    const getVal = (key: keyof LighthouseMetrics) => {
      const val = metrics[key];
      if (typeof val === "number") return val;
      if (typeof val === "string") return parseFloat(val.split(" ")[0]) || 0;
      return 0;
    };

    // Normalize performance score to 0-100 range if provided as decimal
    let perf = getVal("performance_score");
    if (perf <= 1) perf *= 100;

    // Accessibility score evaluation based on WCAG compliance
    let acc = getVal("accessibility_score");
    if (acc <= 1) acc *= 100;

    // Largest Contentful Paint: primary loading performance metric
    const lcp = getVal("lcp");

    // Cumulative Layout Shift: visual stability indicator
    const cls = getVal("cls");

    // Total Blocking Time: interactivity metric
    const tbt = getVal("tbt");

    // First Contentful Paint: perceived load speed
    const fcp = getVal("fcp");

    // Speed Index: visual progress metric
    const si = getVal("speed_index");

    return {
      Performance: {
        value: Math.round(perf),
        status: perf < 50 ? "Poor" : perf < 90 ? "Needs Work" : "Excellent",
      },
      Accessibility: {
        value: Math.round(acc),
        status: acc < 90 ? "Needs Work" : "Excellent",
      },
      LCP: {
        value: `${lcp} s`,
        status: lcp > 4.0 ? "Critical" : lcp > 2.5 ? "Needs Work" : "Good",
      },
      CLS: {
        value: cls,
        status: cls > 0.25 ? "Poor" : cls > 0.1 ? "Needs Work" : "Good",
      },
      TBT: {
        value: `${Math.round(tbt)} ms`,
        status: tbt > 600 ? "Critical" : tbt > 200 ? "Moderate" : "Good",
      },
      FCP: {
        value: `${fcp} s`,
        status: fcp > 3.0 ? "Poor" : fcp > 1.8 ? "Moderate" : "Good",
      },
      "Speed Index": {
        value: `${si} s`,
        status: si > 5.8 ? "Critical" : si > 3.4 ? "Moderate" : "Good",
      },
    };
  }

  /**
   * Executes Lighthouse audit in isolated worker process
   * Isolates Lighthouse in separate process to prevent memory leaks and crashes
   *
   * Architecture:
   * - Main service spawns Node.js child process
   * - Worker runs Lighthouse with desktop config
   * - Results communicated via stdout as JSON
   * - Errors handled gracefully with fallback metrics
   *
   * @param url - URL to audit with Lighthouse
   * @returns Lighthouse performance metrics or error placeholders on failure
   */
  async runLighthouse(url: string): Promise<LighthouseMetrics> {
    const LIGHTHOUSE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

    return new Promise((resolve) => {
      /**
       * Worker script location:
       * - Production (webpack dist): dist/apps/crawler-service/assets/lighthouse-worker.mjs (cwd = workspace root)
       * - Development (tsx): apps/crawler-service/src/assets/lighthouse-worker.mjs (resolved via import.meta.url)
       */
      const distWorker = path.join(
        process.cwd(),
        "dist/apps/crawler-service/assets/lighthouse-worker.mjs",
      );
      const srcWorker = fileURLToPath(new URL("../assets/lighthouse-worker.mjs", import.meta.url));
      const workerPath = fs.existsSync(distWorker) ? distWorker : srcWorker;

      this.logger.info(`Spawning Lighthouse worker at: ${workerPath} for url: ${url}`);

      const child = spawn("node", [workerPath, url]);
      let resolved = false;

      // Kill the worker if it runs longer than LIGHTHOUSE_TIMEOUT_MS
      const killTimer = setTimeout(() => {
        if (!resolved) {
          this.logger.error(`Lighthouse worker timed out after 3 minutes for: ${url}`);
          child.kill("SIGKILL");
          resolved = true;
          resolve(this.getErrorMetrics("Lighthouse timed out after 3 minutes"));
        }
      }, LIGHTHOUSE_TIMEOUT_MS);

      let stdoutData = "";
      let stderrData = "";

      child.stdout.on("data", (data) => {
        const output = data.toString();
        this.logger.debug(`[Worker Output] ${output.substring(0, 100)}...`); // Log partial output
        stdoutData += output;
      });

      child.stderr.on("data", (data) => {
        const errorOutput = data.toString();
        this.logger.error(`[Worker Error] ${errorOutput}`);
        stderrData += errorOutput;
      });

      child.on("close", (code) => {
        clearTimeout(killTimer);
        if (resolved) return; // Already resolved via timeout
        resolved = true;

        if (code !== 0) {
          this.logger.error(`Lighthouse worker failed with code ${code}`);
          this.logger.error(`Worker stderr: ${stderrData}`);

          // Attempt to parse structured error response from worker
          try {
            const errorJson = JSON.parse(stderrData);
            resolve(this.getErrorMetrics(errorJson.error || "Unknown Worker Error"));
          } catch {
            resolve(this.getErrorMetrics(`Worker failed: ${stderrData}`));
          }
          return;
        }

        try {
          // Extract last JSON line from stdout (worker may emit logs before final result)
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
        clearTimeout(killTimer);
        if (!resolved) {
          resolved = true;
          this.logger.error(`Failed to spawn Lighthouse worker: ${err}`);
          resolve(this.getErrorMetrics(err.message));
        }
      });
    });
  }

  /**
   * Generates placeholder metrics for failed Lighthouse audits
   * Prevents downstream errors by returning consistent structure
   *
   * @param message - Error description for troubleshooting
   * @returns Mock metrics with N/A values and error message
   */
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

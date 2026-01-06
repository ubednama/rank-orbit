import { Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { CrawlResponse, LighthouseMetrics } from "@shared/types";
import { spawn } from "child_process";
import * as path from "path";

@Injectable()
export class CrawlService {
  private readonly logger = new Logger(CrawlService.name);

  async extractMetadata(url: string): Promise<CrawlResponse> {
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
      // We keep semantic tags like p, div, h1-h6, ul, li to help AI understand structure
      const page_content = $("body").html()?.replace(/\s+/g, " ").trim() || "";

      return { metadata, page_content };
    } catch (error) {
      this.logger.error(`Error extracting metadata for ${url}: ${error}`);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
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

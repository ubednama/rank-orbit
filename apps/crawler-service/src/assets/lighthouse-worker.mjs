
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { fileURLToPath } from 'url';

// Check if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const url = process.argv[2];
    if (!url) {
        console.error(JSON.stringify({ error: 'No URL provided' }));
        process.exit(1);
    }
    run(url);
}

async function run(url) {
    let chrome;
    try {
        chrome = await chromeLauncher.launch({
            chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });

        const options = {
            output: 'json',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            port: chrome.port,
            logLevel: 'error'
        };

        const runnerResult = await lighthouse(url, options);

        // Extract relevant metrics to match the interface expected by the service
        const audits = runnerResult.lhr.audits;
        const categories = runnerResult.lhr.categories;

        const metrics = {
            performance_score: (categories.performance?.score || 0) * 100,
            accessibility_score: (categories.accessibility?.score || 0) * 100,
            lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
            cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
            tbt: audits['total-blocking-time']?.displayValue || 'N/A',
            fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
            speed_index: audits['speed-index']?.displayValue || 'N/A',
        };

        console.log(JSON.stringify(metrics));

        chrome.kill();
        process.exit(0);
    } catch (e) {
        console.error(JSON.stringify({ error: e.message || String(e) }));
        if (chrome) {
            try { chrome.kill(); } catch (_err) { /* ignore */ }
        }
        process.exit(1);
    }
}

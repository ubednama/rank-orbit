
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function run() {
    const url = 'https://example.com';
    let chrome;
    try {
        chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox'] });
        const options = {
            output: 'json',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            port: chrome.port,
        };
        const runnerResult = await lighthouse(url, options);
        console.log('Report is done for', runnerResult.lhr.finalUrl);
        console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);

        await chrome.kill();
    } catch (e) {
        console.error('Error:', e);
        if (chrome) await chrome.kill();
    }
}

run();

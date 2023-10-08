import { extractFromHtml } from '@extractus/article-extractor';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

async function extractArticleContent(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const content = await page.content();
  const article = await extractFromHtml(content);
  await browser.close();
  return { ...article, html: content };
}

export async function extractContentFromTrends(trends) {
  for (const trend of trends.slice(0, 3)) {
    console.log(`Extracting all content for ${trend.title}\n`);
    for (const article of trend.articles) {
      try {
        const content = await extractArticleContent(article.articleUrl);
        console.log(
          ` Extracting ${article.title}\n              ${article.articleUrl}\n`
        );
        article.title = content.title;
        article.description = content.description;
        article.content = content.content;
        article.html = content.html;
      } catch (error) {
        console.error(
          ` Failed to extract content from ${article.articleUrl}: ${error}`
        );
      }
    }
  }

  return trends;
}

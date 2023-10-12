import { extractFromHtml } from '@extractus/article-extractor';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

async function extractArticleContent(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const content = await page.content();
    const article = await extractFromHtml(content);
    return { ...article, html: content };
  } catch (error) {
    console.error(`Failed to extract content from ${url}: ${error}`);
    throw error;
  } finally {
    await browser.close();
  }
}

async function* batchArticles(articles, batchSize) {
  for (let i = 0; i < articles.length; i += batchSize) {
    yield articles.slice(i, i + batchSize);
  }
}

export async function extractContentFromTrends(trends) {
  for (const trend of trends.slice(0, 2)) {
    console.log(`Extracting all content for ${trend.title}\n`);

    for await (const articleBatch of batchArticles(
      trend.articles,
      trend.articles.length
    )) {
      const articlePromises = articleBatch.map(async (article) => {
        try {
          const content = await extractArticleContent(article.articleUrl);
          console.log(
            ` Extracting ${article.title}\n            ${article.articleUrl}\n`
          );
          article.title = content.title;
          article.description = content.description;
          article.content = content.content;
          article.html = content.html;
          return { status: 'fulfilled', value: article.articleUrl };
        } catch (error) {
          console.error(
            ` Failed to extract content from ${article.articleUrl}: ${error}`
          );
          return { status: 'rejected', reason: article.articleUrl };
        }
      });

      const results = await Promise.allSettled(articlePromises);

      for (const result of results) {
        if (result.status === 'rejected') {
          console.log(`Failed to process article at URL: ${result.reason}`);
        }
      }
    }
  }

  return trends;
}

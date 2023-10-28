import { extractFromHtml } from '@extractus/article-extractor';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { JSDOM } from 'jsdom';
import { fetchWikipediaData } from './wikiFetch';

// Use stealth plugin and adblocker plugin with puppeteer
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Function to extract article content from a given URL
async function extractArticleContent(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(12000); // 12 seconds for page to load or skip
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

// Generator function to batch articles
async function* batchArticles(articles, batchSize) {
  for (let i = 0; i < articles.length; i += batchSize) {
    yield articles.slice(i, i + batchSize);
  }
}

function stripCss(article) {
  const dom = new JSDOM(article.html);
  const { document } = dom.window;
  // Remove all inline styles
  Array.from(document.querySelectorAll('[style]')).forEach(
    (el: Element) => {
      el.removeAttribute('style');
    }
  );

  // Remove all linked stylesheets
  Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(
    (el: Element) => {
      el.parentNode.removeChild(el);
    }
  );
  return dom.serialize();
}

// Function to extract content from trends
export async function extractContentFromTrends(trends) {
  // Loop over each trend
  for (const trend of trends.slice(0, 20)) {
    console.log(`Extracting all content for ${trend.title}\n`);

    // Loop over each batch of articles in the current trend
    for await (const articleBatch of batchArticles(
      trend.articles,
      trend.articles.length
    )) {
      // Map each article to a promise that resolves to the article content
      const articlePromises = articleBatch.map(async (article) => {
        try {
          const content = await extractArticleContent(article.articleUrl);
          console.log(
            ` Extracting ${article.title}\n            ${article.articleUrl}\n`
          );
          // Update the article with the extracted content
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

      // Wait for all article promises to settle
      const results = await Promise.allSettled(articlePromises);

      // Log any articles that failed to process
      for (const result of results) {
        if (result.status === 'rejected') {
          console.log(`Failed to process article at URL: ${result.reason}`);
        }
      }
    }

    // Fetch Wikipedia data for the current trend
    const wikipediaData = await fetchWikipediaData(trend.title);

    if (wikipediaData.length > 0) {
      const { title, content } = wikipediaData[0];

      // Add Wikipedia data to trend object
      trend.wikipedia = `\n\n${title}\n${stripCss(content)}\n\n`;
    }
  }

  // Return the trends with the extracted content and Wikipedia data
  return trends;
}
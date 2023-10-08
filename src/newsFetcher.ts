import Parser from 'rss-parser';
import fs from 'fs';

const newsSourceUrls = [
  // FOX
  'http://feeds.foxnews.com/foxnews/latest',
  // CNN
  'http://rss.cnn.com/rss/cnn_topstories.rss',
  'http://rss.cnn.com/rss/cnn_world.rss',
  'http://rss.cnn.com/rss/cnn_us.rss',
  'http://rss.cnn.com/rss/money_latest.rss',
  'http://rss.cnn.com/rss/cnn_allpolitics.rss',
  'http://rss.cnn.com/rss/cnn_tech.rss',
  'http://rss.cnn.com/rss/cnn_health.rss',
  'http://rss.cnn.com/rss/cnn_showbiz.rss',
  'http://rss.cnn.com/rss/cnn_travel.rss',
  'http://rss.cnn.com/rss/cnn_freevideo.rss',
  'http://rss.cnn.com/services/podcasting/cnn10/rss.xml',
  'http://rss.cnn.com/rss/cnn_latest.rss',
  'http://rss.cnn.com/cnn-underscored',
  // THE_GUARDIAN
  'https://www.theguardian.com/international/rss',
  'https://www.theguardian.com/uk/rss',
  'https://www.theguardian.com/us/rss',
  'https://www.theguardian.com/au/rss',
  // NBC
  'https://feeds.nbcnews.com/nbcnews/public/news',
  // CBS
  'https://www.cbsnews.com/latest/rss/main',
  'https://www.cbsnews.com/latest/rss/us',
  'https://www.cbsnews.com/latest/rss/politics',
  'https://www.cbsnews.com/latest/rss/world',
  'https://www.cbsnews.com/latest/rss/technology',
  'https://www.cbsnews.com/latest/rss/science',
  'https://www.cbsnews.com/latest/rss/moneywatch',
  'https://www.cbsnews.com/latest/rss/health',
  'https://www.cbsnews.com/latest/rss/entertainment',
  // WSJ
  'https://feeds.a.dj.com/rss/RSSOpinion.xml',
  'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
  'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml',
  'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
  'https://feeds.a.dj.com/rss/RSSWSJD.xml',
  'https://feeds.a.dj.com/rss/RSSLifestyle.xml',
  // NYT
  'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/Africa.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/Americas.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/Europe.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml',
  // REUTERS
  'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best',
  'https://www.reutersagency.com/feed/?best-sectors=equities&post_type=best',
  'https://www.reutersagency.com/feed/?best-sectors=foreign-exchange-fixed-income&post_type=best',
  'https://www.reutersagency.com/feed/?best-sectors=economy&post_type=best',
  'https://www.reutersagency.com/feed/?best-sectors=commodities-energy&post_type=best',
  'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best',
  'https://www.reutersagency.com/feed',
  'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
  'https://www.reutersagency.com/feed/?best-topics=deals&post_type=best',
  'https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best',
  'https://www.reutersagency.com/feed/?best-topics=environment&post_type=best',
  'https://www.reutersagency.com/feed/?best-topics=tech&post_type=best',
  'https://www.reutersagency.com/feed/?best-topics=health&post_type=best',
  'https://www.reutersagency.com/feed/?best-topics=sports&post_type=best',
  'https://www.reutersagency.com/feed/?best-topics=lifestyle-entertainment&post_type=best',
  'https://www.reutersagency.com/feed/?best-topics=human-interest&post_type=best',
  'https://www.reutersagency.com/feed/?taxonomy=best-regions&post_type=best',
  'https://www.reutersagency.com/feed/?best-regions=middle-east&post_type=best',
  'https://www.reutersagency.com/feed/?best-regions=africa&post_type=best',
  'https://www.reutersagency.com/feed/?best-regions=europe&post_type=best',
  'https://www.reutersagency.com/feed/?best-regions=north-america&post_type=best',
  'https://www.reutersagency.com/feed/?best-regions=south-america&post_type=best',
  'https://www.reutersagency.com/feed/?best-regions=asia&post_type=best',
  'https://www.reutersagency.com/feed/?taxonomy=best-customer-impacts&post_type=best',
  // WASHINGTON_POST
  'https://www.washingtontimes.com/rss/headlines',
  // HUFFINGTON_POST
  'https://chaski.huffpost.com/us/auto/',
  // NPR
  'https://feeds.npr.org/1001/rss.xml',
  'http://www.npr.org/rss/rss.php?id=1019',
  // BBC
  'http://feeds.bbci.co.uk/news/rss.xml',
  'http://feeds.bbci.co.uk/news/world/rss.xml',
  'http://feeds.bbci.co.uk/news/uk/rss.xml',
  'http://feeds.bbci.co.uk/news/politics/rss.xml',
  'http://feeds.bbci.co.uk/news/business/rss.xml',
  'http://feeds.bbci.co.uk/news/health/rss.xml',
  'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  'http://feeds.bbci.co.uk/news/education/rss.xml',
  'http://feeds.bbci.co.uk/news/technology/rss.xml',
  'http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
  'http://feeds.bbci.co.uk/news/world/africa/rss.xml',
  'http://feeds.bbci.co.uk/news/world/asia/rss.xml',
  'http://feeds.bbci.co.uk/news/world/europe/rss.xml',
  'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  'http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
  // ED_GOV
  'https://www.ed.gov/feed',
  // NASA_PIC_OF_THE_DAY
  'https://www.nasa.gov/rss/dyn/lg_image_of_the_day.rss',
  // WIRED
  'http://feeds.wired.com/wired/index',
  // MACWORLD
  'http://rss.macworld.com/macworld/feeds/main',
  // ABC_AUSTRALIA
  'https://www.abc.net.au/news/feed/4535882/rss.xml',
];

export default async function fetchAndProcessNews(date: string) {
  const desiredDate = date ? new Date(date) : undefined;
  const rssNews = await aggregateNewsFromUrls(newsSourceUrls, desiredDate);

  console.log(`Scraped ${rssNews.length} articles.`);
  return rssNews.slice(0, 250);
}

async function fetchNewsFromUrl(url: string) {
  try {
    const parser = new Parser({
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
      },
    });
    const feed = await parser.parseURL(url);

    // Log raw feed data to a file for debugging
    fs.writeFileSync('rawFeed.json', JSON.stringify(feed, null, 2));

    return feed.items.map((item) => ({
      title: item.title || 'No title',
      link: item.link || 'No link',
      pubDate: item.pubDate || 'No publication date',
      creator: item.creator || 'No creator',
      content: item.content || 'No content',
      contentSnippet: item.contentSnippet || 'No content snippet',
      guid: item.guid || 'No guid',
      categories: item.categories || [],
      isoDate: item.isoDate || 'No ISO date',
      pubDateUTC: formatDateToISO(item.pubDate),
    }));
  } catch (error) {
    console.log(`Error fetching news from ${url}: ${error.message}`);
    return null;
  }
}

async function aggregateNewsFromUrls(urls: string[], date: Date) {
  const fetchPromises = urls.map(fetchNewsFromUrl);
  const newsArrays = await Promise.all(fetchPromises);
  const news = newsArrays.flat();
  const uniqueNews = filterOutDuplicateArticles(news);
  const sortedNews = sortArticlesByDate(uniqueNews);

  return sortedNews;
}

function formatDateToISO(dateStr: string) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) ? date.toISOString() : undefined;
}

function filterOutDuplicateArticles(articles: any[]) {
  const identifiers = new Set();
  return articles.filter((article) => {
    const identifier = `${article.title}${article.link}`;
    if (!identifiers.has(identifier)) {
      identifiers.add(identifier);
      return true;
    }
    return false;
  });
}

function sortArticlesByDate(news: any[]) {
  return news.sort(
    (a, b) =>
      new Date(b.pubDateUTC).getTime() - new Date(a.pubDateUTC).getTime()
  );
}

import googleTrends from 'google-trends-api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DAYS_IN_PAST = 1;

export async function fetchAndProcessTrends() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - DAYS_IN_PAST);

  const allTrendsData = await fetchTrendsForPeriod(startDate, endDate);

  const uniqueTrendsData = removeDuplicateTrends(allTrendsData);

  sortArticlesInTrends(uniqueTrendsData);
  sortTrendsByNewestArticle(uniqueTrendsData);

  console.log(
    `Fetched data for ${
      uniqueTrendsData.length
    } unique trends from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`
  );

  return uniqueTrendsData;
}

async function fetchTrendsForPeriod(startDate: Date, endDate: Date) {
  const allTrendsData = [];

  for (
    let date = startDate;
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    try {
      const trends = await fetchDailyTrends(date);

      allTrendsData.push(...trends);
      console.log(
        `Fetched ${trends.length} trends for date ${date.toLocaleDateString()}`
      );

      // Log all trend titles as they are fetched
      console.log(`\nTrend titles fetched for ${date}: \n`);
      trends.forEach((trend, index) => {
        console.log(`${index + 1}. ${trend.title}`);
      });

      await sleep(500);
    } catch (error) {
      console.error(`Failed to fetch trends for date ${date}: ${error}`);
    }
  }
  return allTrendsData;
}

function removeDuplicateTrends(trendsData) {
  return trendsData.filter(
    (trend, index, self) =>
      index === self.findIndex((t) => t.title === trend.title)
  );
}

function sortArticlesInTrends(trendsData) {
  trendsData.forEach((trend) => {
    trend.articles.sort((a, b) => {
      const dateA = timeAgoToDate(a.timeAgo).getTime();
      const dateB = timeAgoToDate(b.timeAgo).getTime();
      return dateB - dateA;
    });
  });
}

function sortTrendsByNewestArticle(trendsData) {
  trendsData.sort((a, b) => {
    if (a.articles[0] && b.articles[0]) {
      return (
        timeAgoToDate(b.articles[0].timeAgo).getTime() -
        timeAgoToDate(a.articles[0].timeAgo).getTime()
      );
    }
    return 0;
  });
}

function timeAgoToDate(timeAgo) {
  const units = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    mo: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  const value = parseInt(timeAgo);
  const unitKey = timeAgo.replace(/\d+/g, '').replace(' ago', '').trim();
  const unit = units[unitKey] || 1;

  return new Date(Date.now() - value * unit);
}

async function fetchDailyTrends(trendDate: Date) {
  const response = await googleTrends.dailyTrends({ trendDate, geo: 'US' });
  const data = JSON.parse(response);
  const trendingSearchesDays = data.default.trendingSearchesDays;

  const cleanedTrendingSearchesDays = trendingSearchesDays.map((day) => {
    const trendingSearches = day.trendingSearches;

    return trendingSearches.map((trend) => ({
      title: trend.title.query,
      // traffic: trend.formattedTraffic,
      relatedQueries: trend.relatedQueries.map((query) => ({
        query: query.query,
        // link: query.exploreLink,
      })),
      // image: {
      // newsUrl: trend.image.newsUrl,
      // source: trend.image.source,
      // imageUrl: trend.image.imageUrl,
      // },
      articles: trend.articles.map((article) => ({
        title: article.title,
        timeAgo: article.timeAgo,
        // source: article.source,
        // imageUrl: article.image?.imageUrl,
        articleUrl: article.url,
        snippet: article.snippet,
      })),
      // shareUrl: trend.shareUrl,
    }));
  });

  return cleanedTrendingSearchesDays.flat();
}

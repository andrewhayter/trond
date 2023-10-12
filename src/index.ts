// import fetchAndProcessNews from './newsFetcher';
import { fetchAndProcessTrends } from './trendsFetcher';
import { extractContentFromTrends } from './contentExtractor';
import { analyzeDocuments } from './contentAnalyzer';
import fs from 'fs';

async function main() {
  console.time('Total time');

  // Fetch and process trends data
  const trends = await fetchAndProcessTrends();
  fs.writeFileSync('data/trends.json', JSON.stringify(trends, null, 2));
  console.log('Trends data has been written to data/trends.json\n');

  // Fetch trending news articles from trends data
  const trendsWithContent = await extractContentFromTrends(trends);
  fs.writeFileSync(
    'data/trendsWithContent.json',
    JSON.stringify(trendsWithContent, null, 2)
  );
  console.log(
    'Trends with content data has been written to data/trendsWithContent.json\n'
  );

  // // Analyze content and SEO signals from content of trend data
  const trendsWithContentAndAnalysis =
    await analyzeDocuments(trendsWithContent);
  fs.writeFileSync(
    'data/trendsWithContentAndAnalysis.json',
    JSON.stringify(trendsWithContentAndAnalysis, null, 2)
  );
  console.log(
    'Trends with content and analysis data has been written to data/trendsWithContentAndAnalysis.json\n'
  );

  console.timeEnd('Total time');
}

main();

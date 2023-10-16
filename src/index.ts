import { fetchAndProcessTrends } from './trendsFetcher';
import { extractContentFromTrends } from './contentExtractor';
import { analyzeDocuments } from './contentAnalyzer';
import { processTrends } from './langchain';
import fs from 'fs';

async function main() {
  console.time('Total time: ');

  // // Fetch and process trends data
  // const trends = await fetchAndProcessTrends();
  // fs.writeFileSync('data/trends.json', JSON.stringify(trends, null, 2));
  // console.log('Trends data has been written to data/trends.json\n');

  // // Fetch trending news articles from trends data
  // const trendsWithContent = await extractContentFromTrends(trends);
  // fs.writeFileSync(
  //   'data/trendsWithContent.json',
  //   JSON.stringify(trendsWithContent, null, 2)
  // );
  // console.log(
  //   'Trends with content data has been written to data/trendsWithContent.json\n'
  // );

  // // Analyze content and SEO signals from content of trend data
  // const trendsWithContentAndAnalysis =
  //   await analyzeDocuments(trendsWithContent);
  // fs.writeFileSync(
  //   'data/trendsWithContentAndAnalysis.json',
  //   JSON.stringify(trendsWithContentAndAnalysis, null, 2)
  // );
  // console.log(
  //   'Trends with content and analysis data has been written to data/trendsWithContentAndAnalysis.json\n'
  // );


  const trendsWithContentAndAnalysis = JSON.parse(fs.readFileSync('data/trendsWithContentAndAnalysis.json', 'utf-8'));
  // Process the trends data with the utility function from langchain.ts
  const trendsWithSummaries = await processTrends(trendsWithContentAndAnalysis);
  fs.writeFileSync(
    'data/trendsWithSummaries.json',
    JSON.stringify(trendsWithSummaries, null, 2)
  );
  console.log(
    'Trends with summaries data has been written to data/trendsWithSummaries.json\n'
  );

  console.timeEnd('Total time: ');
}

main();

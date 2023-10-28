import { fetchAndProcessTrends } from './trendsFetcher';
import { extractContentFromTrends } from './contentExtractor';
import { analyzeDocuments } from './contentAnalyzer';
import { processTrends } from './langchain';
import { addDocumentsToStore, retrieveFromStore } from './vectorStore';
import fs from 'fs';

async function main() {
  try {
    console.time('Total time: ');

    // Fetch and process trends data
    let trends = await fetchAndProcessTrends();
    trends = trends.slice(0, 20)
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

    // Analyze content and SEO signals from content of trend data
    const trendsWithContentAndAnalysis =
      await analyzeDocuments(trendsWithContent);
    fs.writeFileSync(
      'data/trendsWithContentAndAnalysis.json',
      JSON.stringify(trendsWithContentAndAnalysis, null, 2)
    );
    console.log(
      'Trends with content and analysis data has been written to data/trendsWithContentAndAnalysis.json\n'
    );

    // No need to pass the client
    await addDocumentsToStore(trendsWithContentAndAnalysis);

    // Retrieve documents from the vector store
    // const query = `Write a 200w paragraph about ${trendsWithContentAndAnalysis[0].title}. use only the content from our vector store.`
    // console.log(`Query: ${query}`);

    // No need to pass the client
    const retrievedDocs = await retrieveFromStore(trendsWithContentAndAnalysis[0].title);
    console.log(retrievedDocs);

    console.timeEnd('Total time: ');
  } catch (error) {
    console.error("Error in main function: ", error);
  }
}

main();
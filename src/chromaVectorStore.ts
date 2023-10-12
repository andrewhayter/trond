// import { Chroma } from 'langchain/vectorstores/chroma';
// import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
// import { summarize } from 'langchain/chains/popular/summarize';

// export async function passContentToChroma(trendsWithContent) {
//   const embeddings = new OpenAIEmbeddings();
//   const addedArticles = new Set();

//   const documents = [];

//   for (const trend of trendsWithContent) {
//     for (const article of trend.articles) {
//       const identifier = `${article.title}-${article.source}`;

//       if (!addedArticles.has(identifier)) {
//         const summarizedContent = await summarize(article.content);
//         documents.push({
//           pageContent: summarizedContent,
//           metadata: { identifier },
//         });
//         addedArticles.add(identifier);
//       }
//     }
//   }

//   const vectorStore = new Chroma(embeddings, {
//     collectionName: 'collection-name',
//   });

//   await vectorStore.addDocuments(documents);
// }

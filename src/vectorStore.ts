import { Document } from "langchain/document";
import { OllamaEmbeddings } from "langchain/embeddings/ollama";
import { Chroma, ChromaLibArgs } from "langchain/vectorstores/chroma";
import { ChromaClient } from "chromadb";

// Create the client, embedder, and Chroma instance here
export const client = new ChromaClient();

const embedder = new OllamaEmbeddings({
  model: "mistral",
});
const chromaArgs: ChromaLibArgs = {
  index: client,
  collectionName: "trends",
};

const chroma = new Chroma(embedder, chromaArgs);

function extractContentFromDoc(doc) {
  let content = doc.title;

  if (doc.articles && Array.isArray(doc.articles)) {
    doc.articles.forEach(article => {
      content += "\n\n" + `${article.title}\n${article.content}`;
    });
  }

  if (doc.wikipedia && Array.isArray(doc.wikipedia)) {
    doc.wikipedia.forEach(entry => {
      content += "\n\n" + `${entry.title}\n${entry.content}\n\n`;
    });
  }

  const metadata = {
    title: doc.title,
    relatedQueries: doc.relatedQueries,
  };

  return { content, metadata };
}

export async function addDocumentsToStore(documents: Document[]) {
  try {
    console.log(`Attempting to add ${documents.length} documents to store...`)

    const newDocuments = documents.map(doc => {
      const { content, metadata } = extractContentFromDoc(doc);
      return new Document({ pageContent: content, metadata });
    });

    // Generate ids, embeddings, and metadatas for each document
    const ids = newDocuments.map((doc, index) => `doc-${index}`);
    const embeddings = await Promise.all(newDocuments.map(doc => embedder.embedDocuments([doc.pageContent])));
    const metadatas = newDocuments.map(doc => doc.metadata);

    console.log(`Attempting to upsert ${newDocuments.length} documents to '${chroma.collectionName}' store...`)
    await chroma.addDocuments(newDocuments, { ids });

    console.log(`Successfully upserted ${newDocuments.length} documents to '${chroma.collectionName}' store.`)

    const count = await chroma.collection?.count()

    console.log(`${count} documents added to store successfully`);

    // Test to ensure documents have been added correctly
    if (count !== newDocuments.length) {
      throw new Error(`Expected ${newDocuments.length} documents to be added, but only ${count} were added.`);
    }

    return chroma.collection;
  } catch (error) {
    console.error("Error adding documents to store: ", error);
    throw error;
  }
}

export async function retrieveFromStore(query: string) {
  try {
    const collection = await client.getCollection({
      name: "trends",
      embeddingFunction: {
        generate: (texts: string[]): Promise<number[][]> => embedder.embedDocuments(texts),
      },
    });

    // Perform a similarity search on the vector store
    const queryEmbedding = await embedder.embedDocuments([query]);
    const firstEmbedding = queryEmbedding[0];
    const retrievedDocs = await chroma.similaritySearchVectorWithScore(firstEmbedding, 10);

    // Log the first retrieved document
    // console.log(retrievedDocs);

    // Process the retrieved documents
    // const processedDocs = retrievedDocs.map(([doc, score]) => {
    // Extract the metadata from the document
    // const metadata = doc.metadata;
    // console.log(`Page Content: ${doc.pageContent}`)
    // console.log("Score: ", score);
    // console.log("Metadata: ", metadata);

    // return doc;
    // });
    return retrievedDocs;
  } catch (error) {
    console.error("Error retrieving documents from store: ", error);
    throw error;
  }
}

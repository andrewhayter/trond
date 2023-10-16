// src/langchain.ts
import { SimpleSequentialChain, LLMChain } from 'langchain/chains';
import { Ollama } from 'langchain/llms/ollama';
import { PromptTemplate } from 'langchain/prompts';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import 'dotenv/config';
require('dotenv').config();

// This is an LLMChain to analyze an article and create an outline.
const llmOutline = new Ollama({
  baseUrl: 'http://localhost:11434',
  model: 'mistral',
});
const outlineTemplate = `Given the article, it is your job to analyze it and create an outline.
 
  Article: {article}
  Analysis: This is an outline for the above article:`;
const outlinePromptTemplate = new PromptTemplate({
  template: outlineTemplate,
  inputVariables: ['article'],
});
const outlineChain = new LLMChain({
  llm: llmOutline,
  prompt: outlinePromptTemplate,
});

// This is an LLMChain to write an article given an outline.
const llmArticle = new Ollama({
  baseUrl: 'http://localhost:11434',
  model: 'mistral',
});
const articleTemplate = `Given the outline of an article, it is your job to write the article.
 
  Outline:
  {outline}
  Article:`;
const articlePromptTemplate = new PromptTemplate({
  template: articleTemplate,
  inputVariables: ['outline'],
});
const articleChain = new LLMChain({
  llm: llmArticle,
  prompt: articlePromptTemplate,
});

const overallChain = new SimpleSequentialChain({
  chains: [outlineChain, articleChain],
  verbose: true,
});

export async function processTrends(trendsWithContentAndAnalysis) {
  try {
    const articles = [];

    for (const trend of trendsWithContentAndAnalysis) {
      console.log(`Processing ${trend.title}...`);
      console.log(`Processing ${trend.articles.length} articles...`);

      // Skip trends with no articles
      if (trend.articles.length === 0) {
        continue;
      }

      // Create a text splitter
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 7500,
      });

      // Concatenate all articles' content into a single string
      const allArticlesContent = trend.articles
        .map((article) => article.content)
        .join('\n\n');

      const docs = await textSplitter.createDocuments([allArticlesContent]);

      const outline = await outlineChain.run(docs[0]);
      const finalArticle = await articleChain.run(outline);

      articles.push(finalArticle);
    }

    console.log(`Articles: ${JSON.stringify(articles)}\n`);
    return articles;
  } catch (error) {
    console.error(`An error occurred while processing trends: ${error}`);
    return [];
  }
}

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

const outlineTemplate = `
Given a list of articles, it is your job to analyze them, provide the latest news first, then add more context about the topic to create an outline.

  Article: {article}

  Analysis:
  Title: [Incorporate the latest news title along with a relevant keyword]
  Introduction:
    - Latest News Highlight: [Summary of the latest news regarding the topic]
    - Problem Statement: [Problem or challenge the article aims to address]
    - Benefit Highlight: [Benefits readers will gain from the article]

  Body:
    - Subheading 1: [Latest News Details]
        - [Expound on the latest news, providing key details and insights]
    - Subheading 2: [Background Context]
        - [Delve into the broader topic, offering historical or background context]
    - Subheading 3: [Practical Implications]
        - [Discuss the implications or applications of the news and topic]

  Conclusion:
    - Recap: [Summarize the key points discussed]
    - Call to Action: [Encourage readers to engage further with the topic]

  SEO Optimization:
    - Keyword Usage: [Target and related keywords]
    - Meta Tags: [Optimized meta title and description]
`;

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
const articleTemplate = `
Given the outline of an article, it is your job to craft a well-structured, SEO-optimized long-form article, ensuring to cover the latest news first before delving into broader context.

  Outline:
  {outline}
  
  Article:
  Title: [Provide a catchy and SEO-friendly title]

  Introduction:
    - Engagement Hook: [Start with an engaging hook]
    - Latest News Highlight: [Highlight the latest news regarding the topic]
    - Broader Context: [Briefly introduce the broader topic or issue]

  Body:
    - Subheading 1: Delving into the Details
        - [Provide a deeper analysis of the latest news]
    - Subheading 2: Historical Background
        - [Discuss the historical or background information of the topic]
    - Subheading 3: Implications and Insights
        - [Discuss the implications of the news and provide actionable insights]

  Conclusion:
    - Recap: [Summarize the key points]
    - Call to Action: [End with a compelling call to action]

  SEO Optimization:
    - Keyword Usage: [Ensure natural incorporation of target keywords]
    - Meta Tags: 
        - Meta Title: [Craft a compelling meta title]
        - Meta Description: [Craft an engaging meta description]
`;

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
      // Skip trends with no articles
      if (trend.articles.length === 0) continue;

      console.log(`Processing ${trend.title}...`);
      console.log(`Processing ${trend.articles.length} articles...`);

      // Create a text splitter
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 5000,
        chunkOverlap: 300,
      });

      // Concatenate all articles' content into a single string
      const allArticlesContent = trend.articles
        .map((article) => article.content)
        .join('\n\n');

      console.log(`All articles content: ${allArticlesContent}`);

      const docs = await textSplitter.createDocuments([allArticlesContent]);

      console.log(`Docs: ${JSON.stringify(docs)}`);

      const outline = await outlineChain.run(docs);

      console.log(`Outline: ${JSON.stringify(outline)}`);

      const finalArticle = await articleChain.run(outline);

      console.log(`Final article: ${JSON.stringify(finalArticle)}`);

      articles.push(finalArticle);
    }

    console.log(`Articles: ${JSON.stringify(articles)}\n`);
    return articles;
  } catch (error) {
    console.error(`An error occurred while processing trends: ${error}`);
    return [];
  }
}
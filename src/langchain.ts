// src/langchain.ts
import { SequentialChain, LLMChain } from 'langchain/chains';
import { Ollama } from 'langchain/llms/ollama';
import { PromptTemplate } from 'langchain/prompts';
import 'dotenv/config';
require('dotenv').config();

// This is an LLMChain to analyze an article and create an outline.
const llmOutline = new Ollama({
  baseUrl: 'http://localhost:11434',
  model: 'mistral',
  temperature: 0.1,
});

const outlineTemplate = `
Given a list of articles about {topic}, it is your job to analyze them, provide the latest news first that we have provided in the article(s) below, then add more context about the topic to create an outline.

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
  inputVariables: ['article', 'topic'],
});
const outlineChain = new LLMChain({
  llm: llmOutline,
  prompt: outlinePromptTemplate,
  outputKey: "outline",
});

// This is an LLMChain to write an article given an outline.
const llmArticle = new Ollama({
  baseUrl: 'http://localhost:11434',
  model: 'mistral',
  temperature: 0.5,
});
const articleTemplate = `
Given the outline of an article about {topic}, it is your job to craft a well-structured, SEO-optimized long-form article, ensuring to cover the latest news first before delving into broader context.

  Outline:
  {outline}
  
  Article:
  Title: [Provide a catchy and SEO-friendly title about {topic}]

  Introduction:
    - Engagement Hook: [Start with an engaging hook]
    - Latest News Highlight: [Highlight the latest news regarding {topic}]
    - Broader Context: [Briefly introduce the broader topic or issue]

  Body:
    - Subheading 1: Delving into the latest news Detail about {topic}
        - [Provide a deeper analysis of the latest news]
    - Subheading 2: Historical Background about  {topic}
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
  inputVariables: ['outline', 'topic'],
});
const articleChain = new LLMChain({
  llm: llmArticle,
  prompt: articlePromptTemplate,
  outputKey: "generated_article",
});

const overallChain = new SequentialChain({
  chains: [outlineChain, articleChain],
  inputVariables: ['article', 'topic'],
  verbose: true,
});

export async function processTrends(trendsWithContentAndAnalysis) {
  try {

    const articles = [];

    for (const trend of trendsWithContentAndAnalysis) {
      // Skip trends with no articles
      if (trend.articles.length === 0) continue;
      console.log(`Processing ${trend.articles.length} articles about... ${trend.title}\n`);

      // Concatenate all articles' content into a single string
      const allArticlesContent = trend.articles
        .map((article) => {
          return `\n\n${article.title}\n ${article.datePublished ? `(Published: ${article.datePublished})` : ''} \n${article.content}`
        })
        .join('\n\n');

      console.log(`All articles content: ${allArticlesContent}`);
      const finalArticle = await overallChain.call({
        article: allArticlesContent,
        topic: trend.title,
        ...(trend.relatedTopics && { related_topics: trend.relatedTopics }),
      });

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
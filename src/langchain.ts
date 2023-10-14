// src/langchain.ts
import { OpenAI } from 'langchain/llms/openai';
import { loadSummarizationChain } from 'langchain/chains';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PromptTemplate } from 'langchain/prompts';
import 'dotenv/config';
require('dotenv').config();

export async function processTrends(trendsWithContentAndAnalysis) {
  try {
    // Initialize the LLM to use to answer the question.
    const model = new OpenAI({
      modelName: 'gpt-3.5-turbo-16k',
      temperature: 0.7,
    });

    // Create prompt templates
    const summaryTemplate = `
      You are an expert in summarizing articles.
      Your goal is to create a summary of an article.
      Below you find the text of an article:
      --------
      {text}
      --------
      The text of the article will also be used as the basis for a question and answer bot.
      Provide some examples questions and answers that could be asked about the article. Make these questions very specific.
      Total output will be a summary of the article and a list of example questions the user could ask of the article.
      SUMMARY AND QUESTIONS:
    `;
    const SUMMARY_PROMPT = PromptTemplate.fromTemplate(summaryTemplate);

    const summaryRefineTemplate = `
      You are an expert in summarizing articles.
      Your goal is to create a summary of an article.
      We have provided an existing summary up to a certain point: {existing_answer}
      Below you find the text of an article:
      --------
      {text}
      --------
      Given the new context, refine the summary and example questions.
      The text of the article will also be used as the basis for a question and answer bot.
      Provide some examples questions and answers that could be asked about the article. Make
      these questions very specific.
      If the context isn't useful, return the original summary and questions.
      Total output will be a summary of the article and a list of example questions the user could ask of the article.
      SUMMARY AND QUESTIONS:
    `;
    const SUMMARY_REFINE_PROMPT = PromptTemplate.fromTemplate(
      summaryRefineTemplate
    );

    const summaries = [];

    for (const trend of trendsWithContentAndAnalysis) {
      console.log(`Processing ${trend.title}...`);
      console.log(`Processing ${trend.articles.length} articles...`);

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 10000,
        chunkOverlap: 250,
      });

      // Concatenate all articles related to a topic into a single string
      let allArticlesText = '';
      for (const article of trend.articles) {
        allArticlesText += `
          TITLE: ${article.title} 
          DESCRIPTION: ${article.description}
          ${article.datePublished ? `DATE: ${article.datePublished}` : ''}
          CONTENT: ${article.content}
        `;
      }

      // Create a Document object
      const articleDocs = await textSplitter.createDocuments([allArticlesText]);
      console.log(
        'After splitting documents, before loading summarization chain'
      );

      // Create a chain that uses a refine chain.
      const chain = loadSummarizationChain(model, {
        type: 'refine',
        verbose: true,
        questionPrompt: SUMMARY_PROMPT,
        refinePrompt: SUMMARY_REFINE_PROMPT,
      });

      console.log(`After loading summarization chain, before running chain\n`);

      // Process each chunk with the model
      for (const doc of articleDocs) {
        console.log(`Processing document: ${JSON.stringify(doc)}\n`);

        const summary = await chain.call({
          input_documents: [doc],
        });
        console.log(`Generated summary: ${summary}\n`);
        summaries.push(summary);
      }
    }

    return summaries;
  } catch (error) {
    console.error(`An error occurred while processing trends: ${error}`);
    return [];
  }
}

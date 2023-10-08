// This module is responsible for analyzing the extracted article content to understand the context of the article.
import { JSDOM } from 'jsdom';
import * as natural from 'natural';
import { convert } from 'html-to-text';

export async function analyzeSEO(trendsWithContent) {
  await Promise.all(
    trendsWithContent.slice(0, 3).map(async (trend) => {
      console.log(`\nAnalyzing Content and SEO Signals for: ${trend.title}\n`);

      const analyzedArticles = await Promise.all(
        trend.articles.map(async (article) => {
          if (!article.html || !article.content) {
            console.log(`No content found for ${article.title}`);
            return article;
          }

          console.log(` Analyzing ${article.title}`);

          const htmlDOM = new JSDOM(article.html);
          const htmlDocument = htmlDOM.window.document;

          const contentDOM = new JSDOM(article.content);
          const contentDocument = contentDOM.window.document;

          const strippedContent = convert(article.content);

          const analysis = {
            metadata: extractMetadata(htmlDocument),
            structuredData: extractStructuredData(htmlDocument),
            contentStructure: extractContentStructure(contentDocument),
            contentLength: strippedContent.split(' ').length,
            keywordUsage: extractKeywordUsage(contentDocument),
            links: extractLinks(contentDocument),
            questionsAddressed: extractQuestions(contentDocument),
            imageAnalysis: extractImages(contentDocument),
            videoAnalysis: extractVideos(contentDocument),
            socialMediaEmbeds: extractSocialMediaEmbeds(contentDocument),
            sentimentAnalysis: performSentimentAnalysis(strippedContent),
            tfidf: extractTfIdf(contentDocument),
            stemmedTokens: extractStemmedTokens(contentDocument),
          };

          // Remove html from the article object
          delete article.html;

          // Convert HTML content to plain text
          article.content = strippedContent;

          return { ...article, analysis };
        })
      );

      trend.articles = analyzedArticles;
    })
  );

  return trendsWithContent;
}

// Extracts metadata such as title, description, and keywords
function extractMetadata(document) {
  return {
    title: document.title,
    description:
      document.querySelector('meta[name="description"]')?.content ||
      'No description provided',
    keywords:
      document.querySelector('meta[name="keywords"]')?.content.split(',') || [],
  };
}

// Extracts structured data in JSON-LD format if present
function extractStructuredData(document) {
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd) {
    try {
      return JSON.parse(jsonLd.textContent);
    } catch (error) {
      console.error('Error parsing JSON-LD:', error);
    }
  }
  return null;
}

// Extracts content structure information such as headings, paragraphs, lists, and tables
function extractContentStructure(document) {
  const headings = extractHeadings(document);
  return {
    headings,
    paragraphs: Array.from(document.querySelectorAll('p')).map(
      (p) => (p as HTMLElement).textContent
    ),
    lists: Array.from(document.querySelectorAll('ul, ol')).map(
      (list) => (list as HTMLElement).outerHTML
    ),
    tables: Array.from(document.querySelectorAll('table')).map(
      (table) => (table as HTMLElement).outerHTML
    ),
    totalHeadings: Object.values(headings).flat().length,
  };
}

// Extracts all headings categorized by heading level (H1 through H6)
function extractHeadings(document) {
  const headings = {
    H1: [],
    H2: [],
    H3: [],
    H4: [],
    H5: [],
    H6: [],
  };
  for (let i = 1; i <= 6; i++) {
    const levelHeadings = document.querySelectorAll(`h${i}`);
    levelHeadings.forEach((heading) => {
      headings[`H${i}`].push(heading.textContent);
    });
  }
  return headings;
}

// Extracts keyword usage based on predefined keywords
function extractKeywordUsage(document) {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(document.body.textContent);
  const bigrams = natural.NGrams.bigrams(tokens);
  const trigrams = natural.NGrams.trigrams(tokens);
  const phrases = [
    ...tokens.filter((token) => !natural.stopwords.includes(token)),
    ...bigrams.map((bigram) => bigram.join(' ')),
    ...trigrams.map((trigram) => trigram.join(' ')),
  ];

  const keywordUsage = {};

  phrases.forEach((phrase) => {
    keywordUsage[phrase] = (
      document.body.textContent.match(new RegExp(`\\b${phrase}\\b`, 'g')) || []
    ).length;
  });

  // Convert the keywordUsage object to an array, sort it in descending order of usage, and take the top 10
  const sortedKeywordUsage = Object.entries(keywordUsage)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10)
    .reduce((obj, [key, value]) => ({ ...obj, [key]: Number(value) }), {});

  return sortedKeywordUsage;
}

// Extracts internal and external links
function extractLinks(document) {
  const links = Array.from(document.querySelectorAll('a'));
  const hostname = document.location.hostname;
  const result = {
    internal: { count: 0, links: [] },
    external: { count: 0, links: [] },
  };

  links.forEach((link) => {
    let href = (link as HTMLElement).getAttribute('href');
    if (href) {
      try {
        // Remove trailing '#' from the URL
        href = href.endsWith('#') ? href.slice(0, -1) : href;
        const url = new URL(
          href,
          href.startsWith('/') ? `http://${hostname}` : undefined
        ); // Resolve relative URLs
        if (url.hostname === hostname) {
          result.internal.count++;
          result.internal.links.push(href);
        } else {
          result.external.count++;
          result.external.links.push(href);
        }
      } catch (error) {
        console.error(`Error parsing URL "${href}":`, error);
      }
    }
  });

  return result;
}

// Extracts questions from the text content
function extractQuestions(document) {
  const textContent = document.body.textContent;
  const questionRegex = /[^.!?]*[?]/g;
  const questions = textContent.match(questionRegex) || [];

  return {
    count: questions.length,
    questions: questions,
  };
}

// Function to extract TF-IDF
function extractTfIdf(document) {
  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();
  tfidf.addDocument(document.body.textContent);
  const importantKeywords = [];
  tfidf.listTerms(0 /*document index*/).forEach((item) => {
    importantKeywords.push({ term: item.term, tfidf: item.tfidf });
  });
  return importantKeywords.slice(0, 10);
}

// Function to extract stemmed tokens
function extractStemmedTokens(document) {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(document.body.textContent);
  const stemmer = natural.PorterStemmer;
  const stemmedTokens = tokens.map((token) => stemmer.stem(token));
  return stemmedTokens.slice(0, 10);
}

// Function to perform sentiment analysis
function performSentimentAnalysis(document) {
  const analyzer = new natural.SentimentAnalyzer(
    'English',
    natural.PorterStemmer,
    'afinn'
  );
  const sentiment = analyzer.getSentiment(document.split(' '));
  return {
    score: sentiment,
    interpretation:
      sentiment > 0 ? 'Positive' : sentiment < 0 ? 'Negative' : 'Neutral',
  };
}

// Extracts image elements along with their src and alt attributes
function extractImages(document) {
  const images = Array.from(document.querySelectorAll('img'));
  return {
    count: images.length,
    images: images.map((img) => ({
      src: (img as HTMLImageElement).src,
      alt: (img as HTMLImageElement).alt,
    })),
  };
}

// Extracts video elements along with their src and poster attributes
function extractVideos(document) {
  const videos = Array.from(document.querySelectorAll('video'));
  return {
    count: videos.length,
    videos: videos.map((video) => ({
      src: (video as HTMLVideoElement).src,
      poster: (video as HTMLVideoElement).poster,
    })),
  };
}

// Extracts social media embeds from Twitter, YouTube, and TikTok
function extractSocialMediaEmbeds(document) {
  const embeds = {
    twitter: [],
    youtube: [],
    tiktok: [],
  };

  // Twitter embeds
  const twitterEmbeds = Array.from(
    document.querySelectorAll(
      'blockquote.twitter-tweet, iframe[src*="twitter.com"]'
    )
  );
  twitterEmbeds.forEach((embed) => {
    embeds.twitter.push((embed as HTMLElement).outerHTML);
  });

  // YouTube embeds
  const youtubeEmbeds = Array.from(
    document.querySelectorAll(
      'iframe[src*="youtube.com"], iframe[src*="youtu.be"]'
    )
  );
  youtubeEmbeds.forEach((embed) => {
    embeds.youtube.push({
      src: (embed as HTMLIFrameElement).src,
      html: (embed as HTMLElement).outerHTML,
    });
  });

  // TikTok embeds
  const tiktokEmbeds = Array.from(
    document.querySelectorAll('iframe[src*="tiktok.com"]')
  );
  tiktokEmbeds.forEach((embed) => {
    embeds.tiktok.push({
      src: (embed as HTMLIFrameElement).src,
      html: (embed as HTMLElement).outerHTML,
    });
  });

  return embeds;
}

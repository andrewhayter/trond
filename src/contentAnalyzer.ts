import { JSDOM } from 'jsdom';
import { convert } from 'html-to-text';

// Define a delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stripLinks(content) {
  // Regular expression to match markdown links
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  // Replace markdown links with the link text
  content = content.replace(markdownLinkRegex, '$1');

  // Regular expression to match HTML links
  const htmlLinkRegex = /<a[^>]*>(.*?)<\/a>/gi;

  // Replace HTML links with the link text
  content = content.replace(htmlLinkRegex, '$1');

  // Regular expression to match newline characters
  const newlineRegex = /\n/g;

  // Replace newline characters with a space
  return content.replace(newlineRegex, ' ');
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function cleanKeywords(keywords) {
  // Regular expression to match special characters
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

  return keywords
    .filter(keyword => keyword.trim() !== '') // Remove empty strings
    .map(keyword => keyword.trim().toLowerCase()) // Trim whitespace and convert to lowercase for case-insensitive deduplication
    .filter(keyword => !specialCharRegex.test(keyword)) // Remove keywords with special characters
    .flatMap(keyword => keyword.split(',')) // Split comma-separated strings
    .filter((keyword, index, self) => self.indexOf(keyword) === index) // Remove duplicates
    .map(keyword => toTitleCase(keyword)); // Convert to title case
}

async function processArticle(article) {
  try {
    if (!article.html || !article.content) {
      return null;
    }

    // Create a DOM from the HTML content
    const htmlDOM = new JSDOM(article.html);
    const htmlDocument = htmlDOM.window.document;

    // Remove all inline styles
    Array.from(htmlDocument.querySelectorAll('[style]')).forEach(
      (el: Element) => {
        el.removeAttribute('style');
      }
    );

    // Remove all linked stylesheets
    Array.from(htmlDocument.querySelectorAll('link[rel="stylesheet"]')).forEach(
      (el: Element) => {
        el.parentNode.removeChild(el);
      }
    );

    // Convert HTML content to plain text with error handling
    let strippedContent = convert(article.content);

    // Strip links and remove newline characters from the content
    strippedContent = stripLinks(strippedContent);

    const analysis = {
      contentWordcount: strippedContent.split(' ').length,
    };

    let structuredData = extractStructuredData(htmlDocument);
    let metadata = extractMetadata(htmlDocument);

    // Extract keywords from structuredData and metadata
    let keywords = [];
    if (structuredData && structuredData.keywords) {
      keywords = keywords.concat(structuredData.keywords);
    }
    if (metadata && metadata.keywords) {
      keywords = keywords.concat(metadata.keywords);
    }

    // Extract social media embeds
    const socialMediaEmbeds = extractSocialMediaEmbeds(htmlDocument);

    // Convert HTML content to plain text
    article.content = strippedContent;
    delete article.html;

    // Add datePublished, dateCreated, and dateModified from structuredData to article
    if (structuredData) {
      if (structuredData.datePublished) {
        article.datePublished = structuredData.datePublished;
      }
      if (structuredData.dateCreated) {
        article.dateCreated = structuredData.dateCreated;
      }
      if (structuredData.dateModified) {
        article.dateModified = structuredData.dateModified;
      }
    }

    return {
      ...article,
      metadata,
      structuredData,
      analysis,
      socialMediaEmbeds,
      keywords,
    };
  } catch (error) {
    console.error(`Error processing article: ${article.title}`);
  }
}

export async function analyzeDocuments(trendsWithContent) {
  // Define a batch size
  const batchSize = 100;

  // Create a copy of the trends array
  const trendsCopy = [...trendsWithContent];

  // Create an array to hold the results
  const results = [];

  while (trendsCopy.length) {
    // Get the next batch of trends
    const batch = trendsCopy.splice(0, batchSize);

    // Process the batch
    const batchResults = await Promise.all(
      batch.map(async (trend) => {
        // Transform relatedQueries into an array of strings
        trend.relatedQueries = trend.relatedQueries.map(
          (queryObj) => queryObj.query
        );

        const analyzedArticles = await Promise.all(
          trend.articles.map((article) => processArticle(article))
        );

        // Collect keywords from all articles and add to relatedQueries
        analyzedArticles.forEach((article) => {
          if (article && article.keywords) {
            trend.relatedQueries = Array.from(new Set([...trend.relatedQueries, ...article.keywords]));
          }
        });

        // Clean up relatedQueries
        trend.relatedQueries = cleanKeywords(trend.relatedQueries);

        trend.articles = analyzedArticles.filter((article) => article !== null);
        return trend;
      })
    );

    // Add the batch results to the results array
    results.push(...batchResults);

    // Wait for a second before processing the next batch
    await delay(500);
  }

  return results;
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
      let data = JSON.parse(jsonLd.textContent);
      // let data = JSON.parse(sanitizeJSON(jsonLd.textContent));

      // List of properties to exclude
      const excludeProps = [
        '@context',
        'publisher',
        'mainEntityOfPage',
        'url',
        'image',
        'author',
        'speakable',
        'copyrightHolder',
        'copyrightYear',
        'isPartOf',
        'creator',
        'associatedMedia',
        'video',
        'thumbnailUrl',
        'isAccessibleForFree',
        'name',
        'sameAs',
        '@id',
        'itemListElement',
        'identifier',
        'logo',
        'legalName',
        '@type',
        'potentialAction',
        'provider',
        'hasPart',
        'articleSection',
        'uploadDate',
        'contentUrl',
        'embedUrl',
        'caption',
        'metadata',
        'isBasedOn',
        'topics',
        'articleId',
        'sourceOrganization',
        'inLanguage',
        'about',
        'timeRequired',
      ];

      // If data is an array, iterate over each item
      if (Array.isArray(data)) {
        data = data.map((item) => {
          // Remove excluded properties
          excludeProps.forEach((prop) => {
            if (item.hasOwnProperty(prop)) {
              delete item[prop];
            }
          });
          return item;
        });
      } else {
        // Remove excluded properties
        excludeProps.forEach((prop) => {
          if (data.hasOwnProperty(prop)) {
            delete data[prop];
          }
        });
      }

      // Clean up and remove empty objects from the data array
      if (Array.isArray(data)) {
        data = data.filter((obj) => Object.keys(obj).length !== 0);
      }

      return data;
    } catch (error) {
      console.error('Error parsing JSON-LD:', error.message);
      return null;
    }
  }
  return null;
}

// Extracts social media embeds from Twitter, YouTube, and TikTok
function extractSocialMediaEmbeds(document) {
  const embeds = {
    twitter: [],
    youtube: [],
    tiktok: [],
    instagram: [],
  };

  // Twitter embeds
  const twitterEmbeds = Array.from(document.querySelectorAll('.twitter-tweet'));
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

  // Instagram embeds
  const instagramEmbeds = Array.from(
    document.querySelectorAll('iframe[src*="instagram.com/p/"]')
  );
  instagramEmbeds.forEach((embed) => {
    embeds.instagram.push({
      src: (embed as HTMLIFrameElement).src,
      html: (embed as HTMLElement).outerHTML,
    });
  });

  return embeds;
}

// Extracts content structure information such as headings, paragraphs, lists, and tables
// function extractContentStructure(document) {
//   const headings = extractHeadings(document);
//   return {
//     headings,
//     paragraphs: Array.from(document.querySelectorAll('p')).map(
//       (p) => (p as HTMLElement).textContent
//     ),
//     lists: Array.from(document.querySelectorAll('ul, ol')).map(
//       (list) => (list as HTMLElement).outerHTML
//     ),
//     tables: Array.from(document.querySelectorAll('table')).map(
//       (table) => (table as HTMLElement).outerHTML
//     ),
//     totalHeadings: Object.values(headings).flat().length,
//   };
// }

// Extracts all headings categorized by heading level (H1 through H6)
// function extractHeadings(document) {
//   const headings = {
//     H1: [],
//     H2: [],
//     H3: [],
//     H4: [],
//     H5: [],
//     H6: [],
//   };
//   for (let i = 1; i <= 6; i++) {
//     const levelHeadings = document.querySelectorAll(`h${ i }`);
//     levelHeadings.forEach((heading) => {
//       headings[`H${ i }`].push(heading.textContent);
//     });
//   }
//   return headings;
// }

// Extracts keyword usage based on predefined keywords
// function extractKeywordUsage(document) {
//   const tokenizer = new natural.WordTokenizer();
//   const tokens = tokenizer.tokenize(document.body.textContent);
//   const bigrams = natural.NGrams.bigrams(tokens);
//   const trigrams = natural.NGrams.trigrams(tokens);
//   const phrases = [
//     ...tokens.filter((token) => !natural.stopwords.includes(token)),
//     ...bigrams.map((bigram) => bigram.join(' ')),
//     ...trigrams.map((trigram) => trigram.join(' ')),
//   ];

//   const keywordUsage = {};

//   phrases.forEach((phrase) => {
//     keywordUsage[phrase] = (
//       document.body.textContent.match(new RegExp(`\\b${ phrase }\\b`, 'g')) || []
//     ).length;
//   });

// Convert the keywordUsage object to an array, sort it in descending order of usage, and take the top 10
//   const sortedKeywordUsage = Object.entries(keywordUsage)
//     .sort((a, b) => Number(b[1]) - Number(a[1]))
//     .slice(0, 10)
//     .reduce((obj, [key, value]) => ({ ...obj, [key]: Number(value) }), {});

//   return sortedKeywordUsage;
// }

// Extracts internal and external links
// function extractLinks(document) {
//   const links = Array.from(document.querySelectorAll('a'));
//   const hostname = document.location.hostname;
//   const result = {
//     internal: { count: 0, links: [] },
//     external: { count: 0, links: [] },
//   };

//   links.forEach((link) => {
//     let href = (link as HTMLElement).getAttribute('href');
//     if (href) {
//       try {
//         // Remove trailing '#' from the URL
//         href = href.endsWith('#') ? href.slice(0, -1) : href;
//         const url = new URL(
//           href,
//           href.startsWith('/') ? `http://${hostname}` : undefined
//         ); // Resolve relative URLs
//         if (url.hostname === hostname) {
//           result.internal.count++;
//           result.internal.links.push(href);
//         } else {
//           result.external.count++;
//           result.external.links.push(href);
//         }
//       } catch (error) {
//         console.error(`Error parsing URL "${href}":`, error);
//       }
//     }
//   });

//   return result;
// }

// // Extracts questions from the text content
// function extractQuestions(document) {
//   const textContent = document.body.textContent;
//   const questionRegex = /[^.!?]*[?]/g;
//   const questions = textContent.match(questionRegex) || [];

//   return {
//     count: questions.length,
//     questions: questions,
//   };
// }

// // Function to extract TF-IDF
// function extractTfIdf(document) {
//   const TfIdf = natural.TfIdf;
//   const tfidf = new TfIdf();
//   tfidf.addDocument(document.body.textContent);
//   const importantKeywords = [];
//   tfidf.listTerms(0 /*document index*/).forEach((item) => {
//     importantKeywords.push({ term: item.term, tfidf: item.tfidf });
//   });
//   return importantKeywords.slice(0, 10);
// }

// // Function to extract stemmed tokens
// function extractStemmedTokens(document) {
//   const tokenizer = new natural.WordTokenizer();
//   const tokens = tokenizer.tokenize(document.body.textContent);
//   const stemmer = natural.PorterStemmer;
//   const stemmedTokens = tokens.map((token) => stemmer.stem(token));
//   return stemmedTokens.slice(0, 10);
// }

// // Function to perform sentiment analysis
// function performSentimentAnalysis(document) {
//   const analyzer = new natural.SentimentAnalyzer(
//     'English',
//     natural.PorterStemmer,
//     'afinn'
//   );
//   const sentiment = analyzer.getSentiment(document.split(' '));
//   return {
//     score: sentiment,
//     interpretation:
//       sentiment > 0 ? 'Positive' : sentiment < 0 ? 'Negative' : 'Neutral',
//   };
// }

// // Extracts image elements along with their src and alt attributes
// function extractImages(document) {
//   const images = Array.from(document.querySelectorAll('img'));
//   return {
//     count: images.length,
//     images: images.map((img) => ({
//       src: (img as HTMLImageElement).src,
//       alt: (img as HTMLImageElement).alt,
//     })),
//   };
// }

// // Extracts video elements along with their src and poster attributes
// function extractVideos(document) {
//   const videos = Array.from(document.querySelectorAll('video'));
//   return {
//     count: videos.length,
//     videos: videos.map((video) => ({
//       src: (video as HTMLVideoElement).src,
//       poster: (video as HTMLVideoElement).poster,
//     })),
//   };
// }

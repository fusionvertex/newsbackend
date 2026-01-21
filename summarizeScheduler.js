
/**
 * summarizeScheduler.js
 * Handles periodic summarization of news articles using OpenAI.
 * Exports summarization functions and a scheduler starter.
 */
const { readArticlesFromFile, filterArticlesByStatus } = require('./newsdataUtils');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const filePath = path.join(__dirname, 'newsdata.json');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Summarizes a news article using OpenAI.
 * @param {string} text - The article content.
 * @returns {Promise<string>} - The summary.
 */
async function openaiSummarize(text) {
  if (!text) return '';
  try {
    const response = await openai.responses.create({
      model: 'gpt-4',
      instructions:
        'Write a human-like, natural summary of the following news article in Telugu within 400-500 letters or maximum 400 characters. The summary should read as if written by a person, not a machine. Some places use easy words.',
      input: text,
    });
    return response.output_text?.trim() || '';
  } catch (err) {
    console.error('OpenAI error:', err);
    // Fallback to local summarize if OpenAI fails
    return '[Fallback] ' + (text.split(' ').slice(0, 30).join(' ') + '...');
  }
}

/**
 * Summarizes and updates the first article with status 'inactive'.
 * Updates its summary and sets status to 'active'.
 * Only one article is processed per call.
 * @returns {Promise<{articles: Array, totalResults: number}|{error: string, status: number}>}
 */
async function summarizeAndUpdateArticles() {
  let allArticles = readArticlesFromFile();
  let inactiveArticles = filterArticlesByStatus(allArticles, 'inactive');
  if (!inactiveArticles || inactiveArticles.length === 0) {
    return { error: 'No inactive articles found.', status: 404 };
  }
  // Sort inactive articles by pubDate ascending (oldest first)
  inactiveArticles = inactiveArticles.slice().sort((a, b) => new Date(a.pubDate) - new Date(b.pubDate));
  const article = inactiveArticles[0];
  const summary = await openaiSummarize(article.content);
  allArticles = allArticles.map((orig) =>
    orig.link === article.link ? { ...orig, summary, status: 'active' } : orig
  );
  try {
    fs.writeFileSync(filePath, JSON.stringify({ articles: allArticles }, null, 2));
  } catch (err) {
    console.error('File write error:', err);
    return { error: 'Failed to write file', status: 500 };
  }
  console.log(`Summarized and activated: ${article.title}`);
  return { articles: [allArticles.find((a) => a.link === article.link)], totalResults: 1 };
}

/**
 * Starts the summarization scheduler: runs immediately and then every 1 minute.
 */
function startSummarizeScheduler() {
  (async () => {
    try {
      const result = await summarizeAndUpdateArticles();
      if (result.error) {
        console.error(`[${new Date().toISOString()}] Startup summarize error:`, result.error);
      } else {
        console.log(`[${new Date().toISOString()}] Startup summarized ${result.articles.length} articles.`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Startup summarize exception:`, err);
    }
  })();

  setInterval(async () => {
    try {
      const result = await summarizeAndUpdateArticles();
      if (result.error) {
        console.error(`[${new Date().toISOString()}] Summarize error:`, result.error);
      } else {
        console.log(`[${new Date().toISOString()}] Summarized ${result.articles.length} articles.`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Summarize exception:`, err);
    }
  }, 60 * 1000); // 1 minute
}

module.exports = {
  summarizeAndUpdateArticles,
  openaiSummarize,
  startSummarizeScheduler
};

// If this file is run directly, start the scheduler immediately
if (require.main === module) {
  startSummarizeScheduler();
}

// =======================
// Imports and Configuration
// =======================
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const getAllNews = require('./getAllNews');
const { startSummarizeScheduler } = require('./summarizeScheduler');

// Constants and config
const PORT = process.env.PORT || 3002;
const API_KEY = process.env.NEWSDATA_API_KEY || 'pub_d0e3a786058949ae9bc58599ea8d5457';
const BASE_URL = 'https://newsdata.io/api/1/latest';
const filePath = path.join(__dirname, 'newsdata.json');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Fetches the latest news from NewsData.io, merges with existing articles, and saves to file.
 * @param {object} query - Optional query params to override defaults.
 * @returns {Promise<object>} - Result object with articles, totalResults, nextPage, or error.
 */
async function fetchAndSaveLatestNews(query = {}) {
  const defaultParams = {
    apikey: API_KEY,
    timezone: 'asia/kolkata',
    full_content: 1,
    image: 1,
    timeframe: '30m',
    removeduplicate: 1,
    sort: 'pubdateasc',
    excludefield: 'duplicate',
    size: 50,
    language: 'te',
  };
  const params = {
    ...defaultParams,
    ...query,
  };
  try {
    const response = await axios.get(BASE_URL, { params });
    if (response.data.status !== 'success') {
      return { error: 'Failed to fetch news', details: response.data, status: 500 };
    }
    const articles = (response.data.results || []).map((article) => ({
      link: article.link,
      title: article.title,
      content: article.content,
      language: article.language,
      category: article.category,
      pubDate: article.pubDate,
      source_name: article.source_name,
      source_id: article.source_id,
      image_url: article.image_url,
      video_url: article.video_url,
      country: article.country,
      source_url: article.source_url,
      status: 'inactive',
      summary: '',
    }));
    let existingData = { articles: [] };
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        existingData = JSON.parse(fileContent);
      } catch (err) {
        existingData = { articles: [] };
      }
    }
    const allArticles = [...articles, ...existingData.articles].reduce((acc, curr) => {
      if (!acc.find((a) => a.link === curr.link)) {
        acc.push(curr);
      }
      return acc;
    }, []);
    fs.writeFileSync(filePath, JSON.stringify({ articles: allArticles }, null, 2));
    return { articles, totalResults: response.data.totalResults, nextPage: response.data.nextPage };
  } catch (error) {
    return { error: 'Failed to fetch news', details: error.message, status: 500 };
  }
}

/**
 * Helper to run fetchAndSaveLatestNews and log the result.
 * @param {string} context - Context for logging (e.g., 'Startup', 'Scheduled').
 */
async function runFetchAndSaveLatestNewsWithLog(context = 'Scheduled') {
  try {
    const result = await fetchAndSaveLatestNews();
    if (result.error) {
      console.error(`${context} fetch error:`, result.error, result.details || '');
    } else {
      console.log(`[${new Date().toISOString()}] ${context} fetch: ${result.articles.length} new articles fetched.`);
    }
  } catch (err) {
    console.error(`${context} fetch exception:`, err);
  }
}

// Then run every 10 minutes
setInterval(() => runFetchAndSaveLatestNewsWithLog('Scheduled'), 10 * 60 * 1000); // 10 minutes

// =======================
// Get All News from JSON File (modular)
// =======================
app.get('/api/newsdata/all', (req, res) => {
  const result = getAllNews();
  if (result.error) {
    return res.status(500).json(result);
  }
  res.json(result);
});

// Start the server
app.listen(PORT, () => {
  console.log(`NewsData.io API server running on http://localhost:${PORT}`);
});


// Run immediately on startup
runFetchAndSaveLatestNewsWithLog('Startup');
startSummarizeScheduler();
// =======================
// End of File
// =======================
// getAllNews.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'newsdata.json');

/**
 * Reads all news articles from the JSON file, sorted by pubDate descending.
 * @returns {{ articles: Array, totalResults: number } | { error: string, details: string }}
 */
function getAllNews() {
  try {
    let articles = [];
    let totalResults = 0;
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      // Filter for active articles only
      articles = (data.articles || []).filter(a => a.status === 'active');
      // Sort by pubDate descending (latest first)
      articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      totalResults = articles.length;
    }
    return { articles, totalResults };
  } catch (error) {
    return { error: 'Failed to read news data', details: error.message };
  }
}

module.exports = getAllNews;

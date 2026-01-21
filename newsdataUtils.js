const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'newsdata.json');

function readArticlesFromFile() {
  if (!fs.existsSync(filePath)) {
    throw new Error('newsdata.json file not found');
  }
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContent);
  // Sort articles by pubDate descending (latest first)
  const articles = data.articles || [];
  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return articles;
}

function filterArticlesByStatus(articles, status = 'inactive') {
  return articles.filter(article => article.status === status);
}

module.exports = {
  readArticlesFromFile,
  filterArticlesByStatus,
};

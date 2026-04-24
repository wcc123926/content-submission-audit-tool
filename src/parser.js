const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const cheerio = require('cheerio');

async function parseMarkdown(filePath, baseDir) {
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const relativePath = path.relative(baseDir, filePath);
  
  let frontmatter = {};
  let body = content;
  let hasFrontmatter = false;
  
  try {
    const parsed = matter(content);
    frontmatter = parsed.data || {};
    body = parsed.content;
    hasFrontmatter = Object.keys(frontmatter).length > 0;
  } catch (e) {
    frontmatter = {};
  }
  
  const title = extractTitle(frontmatter, body, fileName);
  const abstract = extractAbstract(frontmatter, body);
  const coverImage = extractCoverImage(frontmatter, body);
  const category = extractCategory(frontmatter);
  const status = extractStatus(frontmatter);
  const images = extractImages(body);
  const wordCount = countWords(body);
  
  return {
    title,
    abstract,
    coverImage,
    category,
    status,
    date: frontmatter.date || null,
    author: frontmatter.author || null,
    tags: frontmatter.tags || [],
    filePath,
    relativePath,
    fileName,
    hasFrontmatter,
    frontmatter,
    images,
    wordCount,
    parseErrors: []
  };
}

function extractTitle(frontmatter, body, fileName) {
  if (frontmatter.title) {
    return frontmatter.title;
  }
  
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  
  return fileName.replace(/\.(md|markdown)$/i, '');
}

function extractAbstract(frontmatter, body) {
  if (frontmatter.abstract || frontmatter.description || frontmatter.summary) {
    return frontmatter.abstract || frontmatter.description || frontmatter.summary;
  }
  
  const paragraphs = body
    .split(/\n\n+/)
    .filter(p => !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('!['))
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  if (paragraphs.length > 0) {
    const firstPara = paragraphs[0];
    return firstPara.length > 200 ? firstPara.substring(0, 200) + '...' : firstPara;
  }
  
  return null;
}

function extractCoverImage(frontmatter, body) {
  if (frontmatter.cover_image || frontmatter.coverImage || frontmatter.image) {
    return frontmatter.cover_image || frontmatter.coverImage || frontmatter.image;
  }
  
  const firstImageMatch = body.match(/!\[.*?\]\(([^)]+)\)/);
  if (firstImageMatch) {
    return firstImageMatch[1];
  }
  
  return null;
}

function extractCategory(frontmatter) {
  const category = frontmatter.category || frontmatter.categories || frontmatter.section;
  if (Array.isArray(category)) {
    return category[0];
  }
  return category || null;
}

function extractStatus(frontmatter) {
  const status = frontmatter.status || frontmatter.publish_status;
  if (!status) {
    if (frontmatter.draft === true) return '草稿';
    if (frontmatter.published === true) return '已发布';
  }
  return status || null;
}

function extractImages(body) {
  const images = [];
  const regex = /!\[.*?\]\(([^)]+)\)/g;
  let match;
  
  while ((match = regex.exec(body)) !== null) {
    const imagePath = match[1];
    if (imagePath && !imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
      images.push(imagePath);
    }
  }
  
  return images;
}

function countWords(text) {
  const plainText = text
    .replace(/!\[.*?\]\([^)]+\)/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '')
    .replace(/#+\s+/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/[*_~]+/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  
  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;
  
  return chineseChars + Math.ceil(englishWords / 2);
}

module.exports = {
  parseMarkdown
};

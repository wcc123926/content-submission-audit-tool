const fs = require('fs').promises;
const path = require('path');
const { parseMarkdown } = require('./parser');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'];
const TABLE_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.ods'];
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

async function scanDirectory(targetDir) {
  const markdownFiles = [];
  const imageFiles = [];
  const tableFiles = [];
  
  await scanRecursive(targetDir, targetDir, markdownFiles, imageFiles, tableFiles);
  
  const markdowns = await Promise.all(
    markdownFiles.map(file => parseMarkdown(file.absolutePath, targetDir))
  );
  
  const allReferencedImages = new Set();
  markdowns.forEach(doc => {
    if (doc.coverImage && !doc.coverImage.startsWith('http://') && !doc.coverImage.startsWith('https://')) {
      const absoluteImgPath = path.resolve(path.dirname(doc.filePath), doc.coverImage);
      allReferencedImages.add(absoluteImgPath.toLowerCase());
    }
    
    if (doc.images) {
      doc.images.forEach(img => {
        const absoluteImgPath = path.resolve(path.dirname(doc.filePath), img);
        allReferencedImages.add(absoluteImgPath.toLowerCase());
      });
    }
  });
  
  const images = imageFiles.map(file => ({
    ...file,
    isUsed: allReferencedImages.has(file.absolutePath.toLowerCase()),
    referencedBy: []
  }));
  
  markdowns.forEach(doc => {
    if (doc.coverImage && !doc.coverImage.startsWith('http://') && !doc.coverImage.startsWith('https://')) {
      const absoluteImgPath = path.resolve(path.dirname(doc.filePath), doc.coverImage);
      const imageIndex = images.findIndex(i => 
        i.absolutePath.toLowerCase() === absoluteImgPath.toLowerCase()
      );
      if (imageIndex !== -1) {
        images[imageIndex].referencedBy.push(doc.relativePath);
      }
    }
    
    if (doc.images) {
      doc.images.forEach(img => {
        const absoluteImgPath = path.resolve(path.dirname(doc.filePath), img);
        const imageIndex = images.findIndex(i => 
          i.absolutePath.toLowerCase() === absoluteImgPath.toLowerCase()
        );
        if (imageIndex !== -1) {
          images[imageIndex].referencedBy.push(doc.relativePath);
        }
      });
    }
  });
  
  return {
    markdowns,
    images,
    tables: tableFiles,
    sourceDirectory: targetDir
  };
}

async function scanRecursive(dir, baseDir, markdowns, images, tables) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      await scanRecursive(fullPath, baseDir, markdowns, images, tables);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const fileInfo = {
        name: entry.name,
        extension: ext.substring(1),
        absolutePath: fullPath,
        relativePath: relativePath,
        size: 0
      };
      
      try {
        const stats = await fs.stat(fullPath);
        fileInfo.size = stats.size;
      } catch (e) {
      }
      
      if (MARKDOWN_EXTENSIONS.includes(ext)) {
        markdowns.push(fileInfo);
      } else if (IMAGE_EXTENSIONS.includes(ext)) {
        images.push(fileInfo);
      } else if (TABLE_EXTENSIONS.includes(ext)) {
        tables.push(fileInfo);
      }
    }
  }
}

module.exports = {
  scanDirectory
};

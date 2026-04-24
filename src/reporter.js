const fs = require('fs').promises;
const path = require('path');

function generateReport(scanResults) {
  const { markdowns, images, tables, sourceDirectory } = scanResults;
  
  const hasCoverImage = markdowns.filter(m => m.coverImage).length;
  const hasCategory = markdowns.filter(m => m.category).length;
  const hasStatus = markdowns.filter(m => m.status).length;
  
  const issues = detectIssues(markdowns, images);
  
  const categoryDistribution = {};
  markdowns.forEach(doc => {
    const cat = doc.category || '未分类';
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
  });
  
  const statusDistribution = {};
  markdowns.forEach(doc => {
    const status = doc.status || '未设置';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });
  
  return {
    scanTime: new Date().toISOString(),
    sourceDirectory,
    statistics: {
      totalMarkdowns: markdowns.length,
      totalImages: images.length,
      totalTables: tables.length,
      hasCoverImage,
      hasCategory,
      hasStatus,
      totalIssues: issues.length,
      categoryDistribution,
      statusDistribution
    },
    markdowns,
    images,
    tables,
    issues
  };
}

function detectIssues(markdowns, images) {
  const issues = [];
  
  markdowns.forEach(doc => {
    if (!doc.title) {
      issues.push({
        type: 'missing_title',
        file: doc.relativePath,
        message: '文档缺少标题',
        severity: 'warning'
      });
    }
    
    if (!doc.abstract) {
      issues.push({
        type: 'missing_abstract',
        file: doc.relativePath,
        message: '文档缺少摘要',
        severity: 'warning'
      });
    }
    
    if (!doc.coverImage) {
      issues.push({
        type: 'missing_cover',
        file: doc.relativePath,
        message: '文档缺少封面图',
        severity: 'info'
      });
    }
    
    if (!doc.category) {
      issues.push({
        type: 'missing_category',
        file: doc.relativePath,
        message: '文档缺少栏目信息',
        severity: 'warning'
      });
    }
    
    if (!doc.status) {
      issues.push({
        type: 'missing_status',
        file: doc.relativePath,
        message: '文档缺少状态信息',
        severity: 'warning'
      });
    }
  });
  
  const allImagePaths = new Set(images.map(i => i.absolutePath.toLowerCase()));
  
  markdowns.forEach(doc => {
    if (doc.coverImage && !doc.coverImage.startsWith('http://') && !doc.coverImage.startsWith('https://')) {
      const absoluteImgPath = path.resolve(path.dirname(doc.filePath), doc.coverImage);
      if (!allImagePaths.has(absoluteImgPath.toLowerCase())) {
        issues.push({
          type: 'missing_image',
          file: doc.relativePath,
          message: `引用的封面图不存在: ${doc.coverImage}`,
          severity: 'error',
          details: {
            referencedImage: doc.coverImage,
            absolutePath: absoluteImgPath,
            isCover: true
          }
        });
      }
    }
    
    if (doc.images && doc.images.length > 0) {
      doc.images.forEach(imgRef => {
        const absoluteImgPath = path.resolve(path.dirname(doc.filePath), imgRef);
        if (!allImagePaths.has(absoluteImgPath.toLowerCase())) {
          issues.push({
            type: 'missing_image',
            file: doc.relativePath,
            message: `引用的图片不存在: ${imgRef}`,
            severity: 'error',
            details: {
              referencedImage: imgRef,
              absolutePath: absoluteImgPath
            }
          });
        }
      });
    }
  });
  
  images.forEach(img => {
    if (!img.isUsed) {
      issues.push({
        type: 'orphan_image',
        file: img.relativePath,
        message: '图片未在任何文档中引用',
        severity: 'info'
      });
    }
  });
  
  return issues;
}

async function saveReport(report, outputDir) {
  const timestamp = new Date();
  const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = timestamp.toTimeString().slice(0, 8).replace(/:/g, '');
  const fileName = `report-${dateStr}-${timeStr}.json`;
  
  const outputPath = path.resolve(outputDir);
  await fs.mkdir(outputPath, { recursive: true });
  
  const filePath = path.join(outputPath, fileName);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  
  return filePath;
}

module.exports = {
  generateReport,
  saveReport
};

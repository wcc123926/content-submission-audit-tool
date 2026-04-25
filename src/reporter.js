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

function generateHtmlReport(report) {
  const timestamp = new Date(report.scanTime);
  const scanTime = timestamp.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const stats = report.statistics;
  const issuesBySeverity = {
    error: [],
    warning: [],
    info: []
  };
  
  report.issues.forEach(issue => {
    const severity = issue.severity || 'warning';
    if (issuesBySeverity[severity]) {
      issuesBySeverity[severity].push(issue);
    }
  });

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>内容提交审核报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      padding: 2rem;
      color: #f8fafc;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 2.5rem;
      padding: 2rem;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
      border-radius: 16px;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }
    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }
    .header .subtitle {
      color: #94a3b8;
      font-size: 0.9375rem;
    }
    .header .meta {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(99, 102, 241, 0.2);
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .header .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
      text-align: center;
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: #6366f1;
    }
    .stat-card.warning {
      border-left: 3px solid #f59e0b;
    }
    .stat-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .stat-value {
      font-size: 2.25rem;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1;
    }
    .stat-label {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }
    .section {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
      margin-bottom: 1.5rem;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .issue-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .issue-item {
      padding: 1rem;
      border-radius: 8px;
      border-left: 3px solid;
      background: rgba(51, 65, 85, 0.5);
    }
    .issue-item.severity-error {
      border-left-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    .issue-item.severity-warning {
      border-left-color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }
    .issue-item.severity-info {
      border-left-color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    .issue-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.25rem;
    }
    .issue-type {
      font-weight: 600;
      color: #f8fafc;
    }
    .issue-severity {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }
    .issue-severity.error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .issue-severity.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .issue-severity.info { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .issue-file {
      font-size: 0.875rem;
      color: #94a3b8;
      font-family: 'Fira Code', Consolas, Monaco, monospace;
      margin-bottom: 0.25rem;
    }
    .issue-message {
      font-size: 0.875rem;
      color: #cbd5e1;
    }
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .progress-item {
      background: rgba(51, 65, 85, 0.5);
      border-radius: 8px;
      padding: 1rem;
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .progress-label {
      font-weight: 500;
    }
    .progress-value {
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .progress-bar {
      height: 8px;
      background: #334155;
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
      border-radius: 9999px;
    }
    .empty-text {
      text-align: center;
      padding: 2rem;
      color: #64748b;
      font-style: italic;
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #334155;
      color: #64748b;
      font-size: 0.875rem;
    }
    .severity-count {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .severity-count.error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .severity-count.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .severity-count.info { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    @media print {
      body {
        background: white;
        color: #1e293b;
        padding: 0;
      }
      .header, .stat-card, .section {
        background: white;
        border: 1px solid #e2e8f0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .header h1 {
        -webkit-text-fill-color: #6366f1;
      }
      .header .subtitle, .stat-label, .issue-file, .issue-message, .footer {
        color: #64748b;
      }
      .stat-value, .section-title, .issue-type {
        color: #1e293b;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 内容提交审核报告</h1>
      <p class="subtitle">内容合规性检查与资源分析报告</p>
      <div class="meta">
        <span class="meta-item">📁 扫描目录: ${report.sourceDirectory || '未知'}</span>
        <span class="meta-item">🕐 扫描时间: ${scanTime}</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📄</div>
        <div class="stat-value">${stats.totalMarkdowns}</div>
        <div class="stat-label">Markdown 文档</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🖼️</div>
        <div class="stat-value">${stats.totalImages}</div>
        <div class="stat-label">图片文件</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${stats.totalTables}</div>
        <div class="stat-label">表格文件</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">${stats.totalIssues}</div>
        <div class="stat-label">待处理问题</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📈 完成度统计</h2>
      <div class="progress-section">
        <div class="progress-item">
          <div class="progress-header">
            <span class="progress-label">有封面图的文档</span>
            <span class="progress-value">${stats.hasCoverImage}/${stats.totalMarkdowns} (${stats.totalMarkdowns > 0 ? Math.round((stats.hasCoverImage / stats.totalMarkdowns) * 100) : 0}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.totalMarkdowns > 0 ? (stats.hasCoverImage / stats.totalMarkdowns) * 100 : 0}%"></div>
          </div>
        </div>
        <div class="progress-item">
          <div class="progress-header">
            <span class="progress-label">有栏目信息的文档</span>
            <span class="progress-value">${stats.hasCategory}/${stats.totalMarkdowns} (${stats.totalMarkdowns > 0 ? Math.round((stats.hasCategory / stats.totalMarkdowns) * 100) : 0}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.totalMarkdowns > 0 ? (stats.hasCategory / stats.totalMarkdowns) * 100 : 0}%"></div>
          </div>
        </div>
        <div class="progress-item">
          <div class="progress-header">
            <span class="progress-label">有状态信息的文档</span>
            <span class="progress-value">${stats.hasStatus}/${stats.totalMarkdowns} (${stats.totalMarkdowns > 0 ? Math.round((stats.hasStatus / stats.totalMarkdowns) * 100) : 0}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.totalMarkdowns > 0 ? (stats.hasStatus / stats.totalMarkdowns) * 100 : 0}%"></div>
          </div>
        </div>
      </div>
    </div>

    ${issuesBySeverity.error.length > 0 ? `
    <div class="section">
      <h2 class="section-title">🚨 错误问题 (${issuesBySeverity.error.length})</h2>
      <div class="issue-list">
        ${issuesBySeverity.error.map(issue => `
        <div class="issue-item severity-error">
          <div class="issue-header">
            <span class="issue-type">${getIssueLabel(issue.type)}</span>
            <span class="issue-severity error">错误</span>
          </div>
          <div class="issue-file">${issue.file}</div>
          <div class="issue-message">${issue.message}</div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${issuesBySeverity.warning.length > 0 ? `
    <div class="section">
      <h2 class="section-title">⚠️ 警告问题 (${issuesBySeverity.warning.length})</h2>
      <div class="issue-list">
        ${issuesBySeverity.warning.map(issue => `
        <div class="issue-item severity-warning">
          <div class="issue-header">
            <span class="issue-type">${getIssueLabel(issue.type)}</span>
            <span class="issue-severity warning">警告</span>
          </div>
          <div class="issue-file">${issue.file}</div>
          <div class="issue-message">${issue.message}</div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${issuesBySeverity.info.length > 0 ? `
    <div class="section">
      <h2 class="section-title">ℹ️ 提示信息 (${issuesBySeverity.info.length})</h2>
      <div class="issue-list">
        ${issuesBySeverity.info.map(issue => `
        <div class="issue-item severity-info">
          <div class="issue-header">
            <span class="issue-type">${getIssueLabel(issue.type)}</span>
            <span class="issue-severity info">提示</span>
          </div>
          <div class="issue-file">${issue.file}</div>
          <div class="issue-message">${issue.message}</div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${stats.totalIssues === 0 ? `
    <div class="section">
      <h2 class="section-title">✅ 检查结果</h2>
      <p class="empty-text">所有文档检查通过，未发现任何问题！</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>此报告由内容提交审核工具生成 | ${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

function getIssueLabel(type) {
  const labels = {
    'missing_title': '缺少标题',
    'missing_abstract': '缺少摘要',
    'missing_cover': '缺少封面图',
    'missing_category': '缺少栏目',
    'missing_status': '缺少状态',
    'invalid_frontmatter': '无效的 Frontmatter',
    'orphan_image': '孤立图片',
    'missing_image': '引用的图片不存在'
  };
  return labels[type] || type;
}

async function saveReport(report, outputDir) {
  const timestamp = new Date();
  const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = timestamp.toTimeString().slice(0, 8).replace(/:/g, '');
  const timestampStr = `${dateStr}-${timeStr}`;
  
  const outputPath = path.resolve(outputDir);
  await fs.mkdir(outputPath, { recursive: true });
  
  const jsonFileName = `report-${timestampStr}.json`;
  const htmlFileName = `report-${timestampStr}.html`;
  
  const jsonFilePath = path.join(outputPath, jsonFileName);
  const htmlFilePath = path.join(outputPath, htmlFileName);
  
  await fs.writeFile(jsonFilePath, JSON.stringify(report, null, 2), 'utf-8');
  
  const htmlContent = generateHtmlReport(report);
  await fs.writeFile(htmlFilePath, htmlContent, 'utf-8');
  
  return {
    jsonPath: jsonFilePath,
    htmlPath: htmlFilePath,
    outputDir: outputPath,
    timestamp: timestampStr,
    files: [
      { name: jsonFileName, type: 'json', path: jsonFilePath },
      { name: htmlFileName, type: 'html', path: htmlFilePath }
    ]
  };
}

module.exports = {
  generateReport,
  saveReport
};

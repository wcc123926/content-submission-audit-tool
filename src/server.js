const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { scanDirectory } = require('./scanner');
const { generateReport, saveReport } = require('./reporter');

let currentReport = null;
const RECENT_PATHS_FILE = path.join(__dirname, '..', '.recent-paths.json');
const MAX_RECENT_PATHS = 5;

async function getRecentPaths() {
  try {
    const data = await fs.readFile(RECENT_PATHS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

async function addRecentPath(dirPath) {
  try {
    let paths = await getRecentPaths();
    paths = paths.filter(p => p !== dirPath);
    paths.unshift(dirPath);
    if (paths.length > MAX_RECENT_PATHS) {
      paths = paths.slice(0, MAX_RECENT_PATHS);
    }
    await fs.writeFile(RECENT_PATHS_FILE, JSON.stringify(paths, null, 2), 'utf-8');
    return paths;
  } catch (e) {
    return [];
  }
}

function validateDirectory(dirPath) {
  try {
    const fsSync = require('fs');
    if (!fsSync.existsSync(dirPath)) {
      return { valid: false, reason: '路径不存在' };
    }
    const stats = fsSync.statSync(dirPath);
    if (!stats.isDirectory()) {
      return { valid: false, reason: '路径不是目录' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, reason: '无法访问路径: ' + e.message };
  }
}

function isDirectoryEmpty(dirPath) {
  try {
    const fsSync = require('fs');
    const entries = fsSync.readdirSync(dirPath);
    return entries.length === 0;
  } catch (e) {
    return false;
  }
}

function startServer(port, initialReport) {
  currentReport = initialReport;
  
  const app = express();
  const publicPath = path.join(__dirname, '..', 'public');
  
  app.use(express.static(publicPath));
  app.use(express.json());
  
  app.get('/api/report', (req, res) => {
    if (currentReport) {
      res.json(currentReport);
    } else {
      res.status(404).json({ error: 'No report available' });
    }
  });
  
  app.post('/api/scan', async (req, res) => {
    try {
      const { directory } = req.body;
      
      if (!directory) {
        return res.status(400).json({ 
          success: false, 
          status: 'invalid_path',
          message: '请提供目录路径' 
        });
      }
      
      const validation = validateDirectory(directory);
      if (!validation.valid) {
        return res.status(400).json({ 
          success: false, 
          status: 'invalid_path',
          message: validation.reason 
        });
      }
      
      if (isDirectoryEmpty(directory)) {
        return res.json({ 
          success: true, 
          status: 'empty_directory',
          message: '目录为空，没有找到任何文件',
          report: null
        });
      }
      
      const scanResults = await scanDirectory(directory);
      
      if (scanResults.markdowns.length === 0 && 
          scanResults.images.length === 0 && 
          scanResults.tables.length === 0) {
        return res.json({ 
          success: true, 
          status: 'empty_directory',
          message: '目录中没有找到相关文件（Markdown、图片或表格）',
          report: null
        });
      }
      
      const report = generateReport(scanResults);
      currentReport = report;
      
      await addRecentPath(directory);
      
      res.json({
        success: true,
        status: 'success',
        message: '扫描完成',
        report: report
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'failed',
        message: '扫描失败: ' + error.message,
        error: error.stack
      });
    }
  });
  
  app.get('/api/recent-paths', async (req, res) => {
    try {
      const paths = await getRecentPaths();
      res.json({ success: true, paths });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.post('/api/save-report', async (req, res) => {
    try {
      if (!currentReport) {
        return res.status(400).json({ 
          success: false, 
          message: '没有可保存的报告，请先扫描目录' 
        });
      }
      
      const { outputPath = './output' } = req.body;
      const result = await saveReport(currentReport, outputPath);
      
      res.json({
        success: true,
        message: '报告已保存',
        outputDir: result.outputDir,
        timestamp: result.timestamp,
        files: result.files,
        paths: {
          json: result.jsonPath,
          html: result.htmlPath
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '保存报告失败: ' + error.message,
        error: error.stack
      });
    }
  });
  
  app.get('/api/documents', (req, res) => {
    if (!currentReport) {
      return res.json([]);
    }
    
    let docs = [...currentReport.markdowns];
    
    const category = req.query.category;
    const status = req.query.status;
    const search = req.query.search;
    
    if (category) {
      docs = docs.filter(d => d.category === category);
    }
    
    if (status) {
      docs = docs.filter(d => d.status === status);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      docs = docs.filter(d => 
        d.title?.toLowerCase().includes(searchLower) ||
        d.relativePath?.toLowerCase().includes(searchLower) ||
        d.abstract?.toLowerCase().includes(searchLower)
      );
    }
    
    res.json(docs);
  });
  
  app.get('/api/documents/:id', (req, res) => {
    if (!currentReport) {
      return res.status(404).json({ error: 'No report available' });
    }
    
    const id = parseInt(req.params.id);
    if (id >= 0 && id < currentReport.markdowns.length) {
      res.json(currentReport.markdowns[id]);
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  });
  
  app.get('/api/images', (req, res) => {
    if (!currentReport) {
      return res.json([]);
    }
    
    let images = [...currentReport.images];
    
    const type = req.query.type;
    const usage = req.query.usage;
    
    if (type) {
      images = images.filter(i => i.extension.toLowerCase() === type.toLowerCase());
    }
    
    if (usage === 'used') {
      images = images.filter(i => i.isUsed);
    } else if (usage === 'unused') {
      images = images.filter(i => !i.isUsed);
    }
    
    res.json(images);
  });
  
  app.get('/api/issues', (req, res) => {
    if (!currentReport) {
      return res.json([]);
    }
    
    let issues = [...currentReport.issues];
    
    const type = req.query.type;
    if (type) {
      issues = issues.filter(i => i.type === type);
    }
    
    res.json(issues);
  });
  
  app.get('/api/stats', (req, res) => {
    if (!currentReport) {
      return res.status(404).json({ error: 'No report available' });
    }
    
    res.json(currentReport.statistics);
  });
  
  app.get('/api/categories', (req, res) => {
    if (!currentReport) {
      return res.json([]);
    }
    
    const categories = new Set();
    currentReport.markdowns.forEach(doc => {
      if (doc.category) {
        categories.add(doc.category);
      }
    });
    
    res.json(Array.from(categories));
  });
  
  app.get('/api/statuses', (req, res) => {
    if (!currentReport) {
      return res.json([]);
    }
    
    const statuses = new Set();
    currentReport.markdowns.forEach(doc => {
      if (doc.status) {
        statuses.add(doc.status);
      }
    });
    
    res.json(Array.from(statuses));
  });
  
  app.get('/api/issue-types', (req, res) => {
    if (!currentReport) {
      return res.json([]);
    }
    
    const types = new Set();
    currentReport.issues.forEach(issue => {
      types.add(issue.type);
    });
    
    res.json(Array.from(types));
  });
  
  const server = app.listen(port, () => {
  });
  
  return server;
}

function updateReport(report) {
  currentReport = report;
}

module.exports = {
  startServer,
  updateReport
};

if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000');
  const server = startServer(port, null);
  const host = server.address()?.address || 'localhost';
  const actualPort = server.address()?.port || port;
  console.log('\n🌐 内容提交审核工作台已启动');
  console.log(`   访问地址: http://localhost:${actualPort}`);
  console.log('   按 Ctrl+C 停止服务器\n');
}

const express = require('express');
const path = require('path');

let currentReport = null;

function startServer(port, report) {
  currentReport = report;
  
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

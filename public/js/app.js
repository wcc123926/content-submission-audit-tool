document.addEventListener('DOMContentLoaded', async function() {
  let reportData = null;
  
  await loadReport();
  initTabs();
  initFilters();
  initModal();
  
  async function loadReport() {
    try {
      const response = await fetch('/api/report');
      reportData = await response.json();
      renderReport();
    } catch (error) {
      console.error('Failed to load report:', error);
    }
  }
  
  function renderReport() {
    if (!reportData) return;
    
    const stats = reportData.statistics;
    
    document.getElementById('scanTime').textContent = '扫描时间: ' + new Date(reportData.scanTime).toLocaleString('zh-CN');
    
    document.getElementById('stat-docs').textContent = stats.totalMarkdowns;
    document.getElementById('stat-images').textContent = stats.totalImages;
    document.getElementById('stat-tables').textContent = stats.totalTables;
    document.getElementById('stat-issues').textContent = stats.totalIssues;
    
    document.getElementById('doc-count').textContent = stats.totalMarkdowns;
    document.getElementById('image-count').textContent = stats.totalImages;
    document.getElementById('table-count').textContent = stats.totalTables;
    document.getElementById('issue-count').textContent = stats.totalIssues;
    
    updateProgress('cover', stats.hasCoverImage, stats.totalMarkdowns);
    updateProgress('category', stats.hasCategory, stats.totalMarkdowns);
    updateProgress('status', stats.hasStatus, stats.totalMarkdowns);
    
    renderCategoryDistribution(stats.categoryDistribution);
    renderStatusDistribution(stats.statusDistribution);
    
    renderDocuments(reportData.markdowns);
    renderImages(reportData.images);
    renderTables(reportData.tables);
    renderIssues(reportData.issues);
    
    populateFilters();
  }
  
  function updateProgress(type, current, total) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    document.getElementById(`${type}-progress`).style.width = percentage + '%';
    document.getElementById(`${type}-progress-text`).textContent = `${current}/${total} (${percentage}%)`;
  }
  
  function renderCategoryDistribution(distribution) {
    const container = document.getElementById('category-distribution');
    if (!distribution || Object.keys(distribution).length === 0) {
      container.innerHTML = '<p class="empty-text">暂无数据</p>';
      return;
    }
    
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    let html = '';
    
    Object.entries(distribution).forEach(([category, count]) => {
      const percentage = Math.round((count / total) * 100);
      html += `
        <div class="distribution-item">
          <div class="distribution-header">
            <span class="distribution-label">${escapeHtml(category)}</span>
            <span class="distribution-count">${count} 篇 (${percentage}%)</span>
          </div>
          <div class="distribution-bar">
            <div class="distribution-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function renderStatusDistribution(distribution) {
    const container = document.getElementById('status-distribution');
    if (!distribution || Object.keys(distribution).length === 0) {
      container.innerHTML = '<p class="empty-text">暂无数据</p>';
      return;
    }
    
    const statusColors = {
      '已发布': 'status-published',
      'published': 'status-published',
      '草稿': 'status-draft',
      'draft': 'status-draft',
      '审核中': 'status-review',
      'review': 'status-review',
      '已归档': 'status-archived',
      'archived': 'status-archived'
    };
    
    let html = '';
    
    Object.entries(distribution).forEach(([status, count]) => {
      const colorClass = statusColors[status] || '';
      html += `
        <div class="status-item ${colorClass}">
          <span class="status-badge">${escapeHtml(status)}</span>
          <span class="status-count">${count} 篇</span>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function renderDocuments(documents) {
    const container = document.getElementById('documents-list');
    if (!documents || documents.length === 0) {
      container.innerHTML = '<p class="empty-text">暂无文档</p>';
      return;
    }
    
    let html = '';
    documents.forEach((doc, index) => {
      const statusClass = getStatusClass(doc.status);
      html += `
        <div class="document-card" data-index="${index}">
          <div class="document-header">
            <h4 class="document-title">${escapeHtml(doc.title)}</h4>
            <span class="document-status ${statusClass}">${escapeHtml(doc.status || '未设置')}</span>
          </div>
          <div class="document-meta">
            <span class="meta-item">
              <span class="meta-label">栏目:</span>
              <span class="meta-value">${escapeHtml(doc.category || '未设置')}</span>
            </span>
            <span class="meta-item">
              <span class="meta-label">路径:</span>
              <span class="meta-value">${escapeHtml(doc.relativePath)}</span>
            </span>
          </div>
          ${doc.abstract ? `<p class="document-abstract">${escapeHtml(doc.abstract)}</p>` : ''}
          <div class="document-footer">
            <span class="word-count">${doc.wordCount || 0} 字</span>
            ${doc.coverImage ? '<span class="has-cover">✓ 有封面</span>' : '<span class="no-cover">✗ 无封面</span>'}
            <button class="view-detail-btn" data-type="document" data-index="${index}">查看详情</button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function renderImages(images) {
    const container = document.getElementById('images-list');
    if (!images || images.length === 0) {
      container.innerHTML = '<p class="empty-text">暂无图片</p>';
      return;
    }
    
    let html = '';
    images.forEach((img, index) => {
      const usedClass = img.isUsed ? 'used' : 'unused';
      const usedText = img.isUsed ? '已引用' : '未引用';
      html += `
        <div class="image-card ${usedClass}" data-index="${index}">
          <div class="image-preview">
            <div class="image-placeholder">
              <span class="image-ext">${img.extension.toUpperCase()}</span>
            </div>
          </div>
          <div class="image-info">
            <h4 class="image-name">${escapeHtml(img.name)}</h4>
            <p class="image-path">${escapeHtml(img.relativePath)}</p>
            <div class="image-meta">
              <span class="image-size">${formatFileSize(img.size)}</span>
              <span class="image-status ${usedClass}">${usedText}</span>
            </div>
          </div>
          <button class="view-detail-btn" data-type="image" data-index="${index}">详情</button>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function renderTables(tables) {
    const container = document.getElementById('tables-list');
    if (!tables || tables.length === 0) {
      container.innerHTML = '<p class="empty-text">暂无表格文件</p>';
      return;
    }
    
    let html = '';
    tables.forEach((table, index) => {
      html += `
        <div class="table-card" data-index="${index}">
          <div class="table-icon">
            <span>📊</span>
          </div>
          <div class="table-info">
            <h4 class="table-name">${escapeHtml(table.name)}</h4>
            <p class="table-path">${escapeHtml(table.relativePath)}</p>
            <div class="table-meta">
              <span class="table-size">${formatFileSize(table.size)}</span>
              <span class="table-type">${table.extension.toUpperCase()}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function renderIssues(issues) {
    const container = document.getElementById('issues-list');
    if (!issues || issues.length === 0) {
      container.innerHTML = '<p class="empty-text">暂无问题</p>';
      return;
    }
    
    let html = '';
    issues.forEach((issue, index) => {
      const severityClass = `severity-${issue.severity || 'warning'}`;
      const issueIcon = getIssueIcon(issue.type);
      const issueLabel = getIssueLabel(issue.type);
      
      html += `
        <div class="issue-card ${severityClass}" data-index="${index}">
          <div class="issue-icon">${issueIcon}</div>
          <div class="issue-content">
            <div class="issue-header">
              <span class="issue-type">${issueLabel}</span>
              <span class="issue-severity">${getSeverityLabel(issue.severity)}</span>
            </div>
            <p class="issue-file">${escapeHtml(issue.file)}</p>
            <p class="issue-message">${escapeHtml(issue.message)}</p>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function populateFilters() {
    if (!reportData) return;
    
    const categorySelect = document.getElementById('filter-category');
    const categories = new Set();
    reportData.markdowns.forEach(doc => {
      if (doc.category) categories.add(doc.category);
    });
    
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
    
    const statusSelect = document.getElementById('filter-status');
    const statuses = new Set();
    reportData.markdowns.forEach(doc => {
      if (doc.status) statuses.add(doc.status);
    });
    
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      statusSelect.appendChild(option);
    });
    
    const imageTypeSelect = document.getElementById('filter-image-type');
    const imageTypes = new Set();
    reportData.images.forEach(img => {
      imageTypes.add(img.extension.toLowerCase());
    });
    
    imageTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type.toUpperCase();
      imageTypeSelect.appendChild(option);
    });
    
    const issueTypeSelect = document.getElementById('filter-issue-type');
    const issueTypes = new Set();
    reportData.issues.forEach(issue => {
      issueTypes.add(issue.type);
    });
    
    issueTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = getIssueLabel(type);
      issueTypeSelect.appendChild(option);
    });
  }
  
  function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const targetTab = this.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        this.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });
  }
  
  function initFilters() {
    document.getElementById('filter-category').addEventListener('change', filterDocuments);
    document.getElementById('filter-status').addEventListener('change', filterDocuments);
    document.getElementById('search-docs').addEventListener('input', filterDocuments);
    
    document.getElementById('filter-image-type').addEventListener('change', filterImages);
    document.getElementById('filter-image-usage').addEventListener('change', filterImages);
    
    document.getElementById('filter-issue-type').addEventListener('change', filterIssues);
  }
  
  function filterDocuments() {
    if (!reportData) return;
    
    const category = document.getElementById('filter-category').value;
    const status = document.getElementById('filter-status').value;
    const search = document.getElementById('search-docs').value.toLowerCase();
    
    let filtered = [...reportData.markdowns];
    
    if (category) {
      filtered = filtered.filter(d => d.category === category);
    }
    
    if (status) {
      filtered = filtered.filter(d => d.status === status);
    }
    
    if (search) {
      filtered = filtered.filter(d => 
        d.title?.toLowerCase().includes(search) ||
        d.relativePath?.toLowerCase().includes(search) ||
        d.abstract?.toLowerCase().includes(search)
      );
    }
    
    renderDocuments(filtered);
  }
  
  function filterImages() {
    if (!reportData) return;
    
    const type = document.getElementById('filter-image-type').value;
    const usage = document.getElementById('filter-image-usage').value;
    
    let filtered = [...reportData.images];
    
    if (type) {
      filtered = filtered.filter(i => i.extension.toLowerCase() === type.toLowerCase());
    }
    
    if (usage === 'used') {
      filtered = filtered.filter(i => i.isUsed);
    } else if (usage === 'unused') {
      filtered = filtered.filter(i => !i.isUsed);
    }
    
    renderImages(filtered);
  }
  
  function filterIssues() {
    if (!reportData) return;
    
    const type = document.getElementById('filter-issue-type').value;
    
    let filtered = [...reportData.issues];
    
    if (type) {
      filtered = filtered.filter(i => i.type === type);
    }
    
    renderIssues(filtered);
  }
  
  function initModal() {
    const modal = document.getElementById('modal');
    const closeBtn = document.getElementById('modal-close');
    
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
    
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.view-detail-btn');
      if (btn) {
        const type = btn.dataset.type;
        const index = parseInt(btn.dataset.index);
        showDetail(type, index);
      }
    });
  }
  
  function showDetail(type, index) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    let content = '';
    
    if (type === 'document' && reportData) {
      const doc = reportData.markdowns[index];
      if (doc) {
        modalTitle.textContent = doc.title;
        content = `
          <div class="detail-section">
            <h5>基本信息</h5>
            <table class="detail-table">
              <tr><td>文件路径</td><td>${escapeHtml(doc.relativePath)}</td></tr>
              <tr><td>栏目</td><td>${escapeHtml(doc.category || '未设置')}</td></tr>
              <tr><td>状态</td><td>${escapeHtml(doc.status || '未设置')}</td></tr>
              <tr><td>作者</td><td>${escapeHtml(doc.author || '未知')}</td></tr>
              <tr><td>日期</td><td>${escapeHtml(doc.date || '未知')}</td></tr>
              <tr><td>字数</td><td>${doc.wordCount || 0} 字</td></tr>
            </table>
          </div>
          ${doc.abstract ? `
          <div class="detail-section">
            <h5>摘要</h5>
            <p>${escapeHtml(doc.abstract)}</p>
          </div>
          ` : ''}
          ${doc.coverImage ? `
          <div class="detail-section">
            <h5>封面图</h5>
            <p>${escapeHtml(doc.coverImage)}</p>
          </div>
          ` : ''}
          ${doc.images && doc.images.length > 0 ? `
          <div class="detail-section">
            <h5>引用图片 (${doc.images.length})</h5>
            <ul>
              ${doc.images.map(img => `<li>${escapeHtml(img)}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          ${doc.tags && doc.tags.length > 0 ? `
          <div class="detail-section">
            <h5>标签</h5>
            <div class="tags">
              ${doc.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
          ` : ''}
        `;
      }
    } else if (type === 'image' && reportData) {
      const img = reportData.images[index];
      if (img) {
        modalTitle.textContent = img.name;
        content = `
          <div class="detail-section">
            <table class="detail-table">
              <tr><td>文件路径</td><td>${escapeHtml(img.relativePath)}</td></tr>
              <tr><td>文件类型</td><td>${img.extension.toUpperCase()}</td></tr>
              <tr><td>文件大小</td><td>${formatFileSize(img.size)}</td></tr>
              <tr><td>引用状态</td><td>${img.isUsed ? '已引用' : '未引用'}</td></tr>
            </table>
          </div>
          ${img.referencedBy && img.referencedBy.length > 0 ? `
          <div class="detail-section">
            <h5>被以下文档引用 (${img.referencedBy.length})</h5>
            <ul>
              ${img.referencedBy.map(ref => `<li>${escapeHtml(ref)}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        `;
      }
    }
    
    modalBody.innerHTML = content;
    modal.classList.add('active');
  }
  
  function getStatusClass(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s === '已发布' || s === 'published') return 'status-published';
    if (s === '草稿' || s === 'draft') return 'status-draft';
    if (s === '审核中' || s === 'review') return 'status-review';
    if (s === '已归档' || s === 'archived') return 'status-archived';
    return '';
  }
  
  function getIssueIcon(type) {
    const icons = {
      'missing_title': '📝',
      'missing_abstract': '📝',
      'missing_cover': '🖼️',
      'missing_category': '🏷️',
      'missing_status': '📌',
      'invalid_frontmatter': '⚠️',
      'orphan_image': '🖼️',
      'missing_image': '❌'
    };
    return icons[type] || '⚠️';
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
  
  function getSeverityLabel(severity) {
    const labels = {
      'error': '错误',
      'warning': '警告',
      'info': '提示'
    };
    return labels[severity] || '警告';
  }
  
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});

document.addEventListener('DOMContentLoaded', function() {
  let reportData = null;
  let currentDirectory = null;
  let isScanning = false;
  
  init();
  
  async function init() {
    await loadRecentPaths();
    initEventListeners();
    initTabs();
    
    try {
      const response = await fetch('/api/report');
      if (response.ok) {
        reportData = await response.json();
        if (reportData && reportData.statistics) {
          showResults();
          renderReport();
        }
      }
    } catch (e) {
    }
  }
  
  function initEventListeners() {
    const scanBtn = document.getElementById('scan-btn');
    const directoryInput = document.getElementById('directory-input');
    const browseBtn = document.getElementById('browse-btn');
    const saveReportBtn = document.getElementById('save-report-btn');
    const rescanBtn = document.getElementById('rescan-btn');
    
    scanBtn.addEventListener('click', handleScan);
    
    directoryInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleScan();
      }
    });
    
    browseBtn.addEventListener('click', handleBrowse);
    
    if (saveReportBtn) {
      saveReportBtn.addEventListener('click', handleSaveReport);
    }
    
    if (rescanBtn) {
      rescanBtn.addEventListener('click', () => {
        if (currentDirectory) {
          document.getElementById('directory-input').value = currentDirectory;
          handleScan();
        }
      });
    }
    
    const filterCategory = document.getElementById('filter-category');
    const filterStatus = document.getElementById('filter-status');
    const searchDocs = document.getElementById('search-docs');
    const filterDocIssues = document.getElementById('filter-doc-issues');
    const filterImageType = document.getElementById('filter-image-type');
    const filterImageUsage = document.getElementById('filter-image-usage');
    const filterIssueType = document.getElementById('filter-issue-type');
    const filterIssueSeverity = document.getElementById('filter-issue-severity');
    
    if (filterCategory) filterCategory.addEventListener('change', filterDocuments);
    if (filterStatus) filterStatus.addEventListener('change', filterDocuments);
    if (searchDocs) searchDocs.addEventListener('input', filterDocuments);
    if (filterDocIssues) filterDocIssues.addEventListener('change', filterDocuments);
    if (filterImageType) filterImageType.addEventListener('change', filterImages);
    if (filterImageUsage) filterImageUsage.addEventListener('change', filterImages);
    if (filterIssueType) filterIssueType.addEventListener('change', filterIssues);
    if (filterIssueSeverity) filterIssueSeverity.addEventListener('change', filterIssues);
    
    initModal();
  }
  
  async function loadRecentPaths() {
    try {
      const response = await fetch('/api/recent-paths');
      const data = await response.json();
      
      if (data.success && data.paths && data.paths.length > 0) {
        renderRecentPaths(data.paths);
      }
    } catch (e) {
    }
  }
  
  function renderRecentPaths(paths) {
    const section = document.getElementById('recent-paths-section');
    const list = document.getElementById('recent-paths-list');
    
    if (!section || !list) return;
    
    section.style.display = 'block';
    
    let html = '';
    paths.forEach((path, index) => {
      html += `
        <button class="recent-path-item" data-path="${escapeHtml(path)}" title="${escapeHtml(path)}">
          <span class="recent-path-icon">🕐</span>
          <span class="recent-path-text">${escapeHtml(truncatePath(path, 50))}</span>
        </button>
      `;
    });
    
    list.innerHTML = html;
    
    list.querySelectorAll('.recent-path-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        document.getElementById('directory-input').value = path;
      });
    });
  }
  
  function truncatePath(path, maxLength) {
    if (path.length <= maxLength) return path;
    const start = path.substring(0, Math.floor(maxLength / 2) - 2);
    const end = path.substring(path.length - Math.floor(maxLength / 2) + 2);
    return start + '...' + end;
  }
  
  async function handleScan() {
    if (isScanning) return;
    
    const directory = document.getElementById('directory-input').value.trim();
    
    if (!directory) {
      showToast('请输入目录路径', 'error');
      return;
    }
    
    currentDirectory = directory;
    isScanning = true;
    
    updateScanButtonState(true);
    hideStatus();
    hideResults();
    
    showStatus('scanning', '正在扫描...', '请稍候，正在分析目录内容...');
    
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ directory })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.status === 'empty_directory') {
          showStatus('empty', '目录为空', data.message);
          showToast(data.message, 'warning');
        } else if (data.report) {
          reportData = data.report;
          showResults();
          renderReport();
          await loadRecentPaths();
          showToast('扫描完成！', 'success');
        }
      } else {
        if (data.status === 'invalid_path') {
          showStatus('error', '无效路径', data.message);
        } else {
          showStatus('error', '扫描失败', data.message);
        }
        showToast(data.message, 'error');
      }
      
    } catch (error) {
      showStatus('error', '扫描失败', '网络错误: ' + error.message);
      showToast('扫描失败: ' + error.message, 'error');
    } finally {
      isScanning = false;
      updateScanButtonState(false);
    }
  }
  
  function handleBrowse() {
    showToast('请手动输入目录路径，或选择最近路径', 'info');
    document.getElementById('directory-input').focus();
  }
  
  async function handleSaveReport() {
    if (!reportData) {
      showToast('没有可保存的报告', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/save-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ outputPath: './output' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('报告已保存到: ' + data.path, 'success');
      } else {
        showToast(data.message, 'error');
      }
    } catch (error) {
      showToast('保存失败: ' + error.message, 'error');
    }
  }
  
  function updateScanButtonState(scanning) {
    const scanBtn = document.getElementById('scan-btn');
    const scanIcon = document.getElementById('scan-icon');
    const scanText = document.getElementById('scan-text');
    
    if (scanning) {
      scanBtn.disabled = true;
      scanBtn.classList.add('btn-loading');
      scanIcon.textContent = '⏳';
      scanText.textContent = '扫描中...';
    } else {
      scanBtn.disabled = false;
      scanBtn.classList.remove('btn-loading');
      scanIcon.textContent = '🔍';
      scanText.textContent = '开始扫描';
    }
  }
  
  function showStatus(type, title, message) {
    const panel = document.getElementById('status-panel');
    const icon = document.getElementById('status-icon');
    const titleEl = document.getElementById('status-title');
    const messageEl = document.getElementById('status-message');
    const actionEl = document.getElementById('status-action');
    
    const icons = {
      scanning: '⏳',
      success: '✅',
      error: '❌',
      empty: '📁',
      invalid_path: '🚫'
    };
    
    const classes = {
      scanning: 'status-scanning',
      success: 'status-success',
      error: 'status-error',
      empty: 'status-empty',
      invalid_path: 'status-error'
    };
    
    panel.className = 'status-panel ' + (classes[type] || '');
    panel.style.display = 'block';
    
    icon.textContent = icons[type] || 'ℹ️';
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    actionEl.innerHTML = '';
    
    if (type === 'empty' || type === 'error' || type === 'invalid_path') {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn-outline btn-sm';
      retryBtn.innerHTML = '<span class="btn-icon">🔄</span> 重试';
      retryBtn.addEventListener('click', () => {
        document.getElementById('directory-input').focus();
        document.getElementById('directory-input').select();
      });
      actionEl.appendChild(retryBtn);
    }
  }
  
  function hideStatus() {
    const panel = document.getElementById('status-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }
  
  function showResults() {
    const resultsSection = document.getElementById('results-section');
    const saveReportBtn = document.getElementById('save-report-btn');
    
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
    if (saveReportBtn) {
      saveReportBtn.style.display = 'inline-flex';
    }
  }
  
  function hideResults() {
    const resultsSection = document.getElementById('results-section');
    const saveReportBtn = document.getElementById('save-report-btn');
    
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }
    if (saveReportBtn) {
      saveReportBtn.style.display = 'none';
    }
  }
  
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-message');
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const classes = {
      success: 'toast-success',
      error: 'toast-error',
      warning: 'toast-warning',
      info: 'toast-info'
    };
    
    toast.className = 'toast ' + (classes[type] || 'toast-info');
    icon.textContent = icons[type] || 'ℹ️';
    msg.textContent = message;
    
    toast.classList.add('toast-show');
    
    setTimeout(() => {
      toast.classList.remove('toast-show');
    }, 3000);
  }
  
  function renderReport() {
    if (!reportData) return;
    
    const stats = reportData.statistics;
    
    document.getElementById('stat-docs').textContent = stats.totalMarkdowns;
    document.getElementById('stat-images').textContent = stats.totalImages;
    document.getElementById('stat-tables').textContent = stats.totalTables;
    document.getElementById('stat-issues').textContent = stats.totalIssues;
    
    document.getElementById('doc-count').textContent = stats.totalMarkdowns;
    document.getElementById('image-count').textContent = stats.totalImages;
    document.getElementById('issue-count').textContent = stats.totalIssues;
    
    updateProgress('cover', stats.hasCoverImage, stats.totalMarkdowns);
    updateProgress('category', stats.hasCategory, stats.totalMarkdowns);
    updateProgress('status', stats.hasStatus, stats.totalMarkdowns);
    
    renderCategoryDistribution(stats.categoryDistribution);
    renderStatusDistribution(stats.statusDistribution);
    
    renderDocuments(reportData.markdowns);
    renderImages(reportData.images);
    renderIssues(reportData.issues);
    
    populateFilters();
  }
  
  function updateProgress(type, current, total) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const progressEl = document.getElementById(`${type}-progress`);
    const textEl = document.getElementById(`${type}-progress-text`);
    
    if (progressEl) {
      progressEl.style.width = percentage + '%';
    }
    if (textEl) {
      textEl.textContent = `${current}/${total} (${percentage}%)`;
    }
  }
  
  function renderCategoryDistribution(distribution) {
    const container = document.getElementById('category-distribution');
    if (!container) return;
    
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
    if (!container) return;
    
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
  
  function getDocumentIssues(docPath) {
    if (!reportData || !reportData.issues) return [];
    return reportData.issues.filter(issue => issue.file === docPath);
  }
  
  function renderDocuments(documents) {
    const container = document.getElementById('documents-list');
    if (!container) return;
    
    if (!documents || documents.length === 0) {
      container.innerHTML = '<p class="empty-text">暂无文档</p>';
      return;
    }
    
    let html = '';
    documents.forEach((doc, index) => {
      const statusClass = getStatusClass(doc.status);
      const docIssues = getDocumentIssues(doc.relativePath);
      const hasIssues = docIssues.length > 0;
      
      html += `
        <div class="document-card ${hasIssues ? 'has-issues' : ''}" data-index="${index}" data-path="${escapeHtml(doc.relativePath)}">
          <div class="document-header">
            <h4 class="document-title">
              ${hasIssues ? '<span class="issue-indicator" title="存在问题">⚠️</span>' : ''}
              ${escapeHtml(doc.title)}
            </h4>
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
            <div class="footer-left">
              <span class="word-count">${doc.wordCount || 0} 字</span>
              ${doc.coverImage ? '<span class="has-cover">✓ 有封面</span>' : '<span class="no-cover">✗ 无封面</span>'}
              ${hasIssues ? `<span class="issue-count">⚠️ ${docIssues.length} 个问题</span>` : ''}
            </div>
            <button class="view-detail-btn" data-type="document" data-index="${index}">查看详情</button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function renderImages(images) {
    const container = document.getElementById('images-list');
    if (!container) return;
    
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
  
  function renderIssues(issues) {
    const container = document.getElementById('issues-list');
    if (!container) return;
    
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
    const statusSelect = document.getElementById('filter-status');
    const imageTypeSelect = document.getElementById('filter-image-type');
    const issueTypeSelect = document.getElementById('filter-issue-type');
    
    if (categorySelect) {
      const currentValue = categorySelect.value;
      categorySelect.innerHTML = '<option value="">全部栏目</option>';
      
      const categories = new Set();
      reportData.markdowns.forEach(doc => {
        if (doc.category) categories.add(doc.category);
      });
      
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === currentValue) option.selected = true;
        categorySelect.appendChild(option);
      });
    }
    
    if (statusSelect) {
      const currentValue = statusSelect.value;
      statusSelect.innerHTML = '<option value="">全部状态</option>';
      
      const statuses = new Set();
      reportData.markdowns.forEach(doc => {
        if (doc.status) statuses.add(doc.status);
      });
      
      statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        if (status === currentValue) option.selected = true;
        statusSelect.appendChild(option);
      });
    }
    
    if (imageTypeSelect) {
      const currentValue = imageTypeSelect.value;
      imageTypeSelect.innerHTML = '<option value="">全部类型</option>';
      
      const imageTypes = new Set();
      reportData.images.forEach(img => {
        imageTypes.add(img.extension.toLowerCase());
      });
      
      imageTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.toUpperCase();
        if (type === currentValue) option.selected = true;
        imageTypeSelect.appendChild(option);
      });
    }
    
    if (issueTypeSelect) {
      const currentValue = issueTypeSelect.value;
      issueTypeSelect.innerHTML = '<option value="">全部类型</option>';
      
      const issueTypes = new Set();
      reportData.issues.forEach(issue => {
        issueTypes.add(issue.type);
      });
      
      issueTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = getIssueLabel(type);
        if (type === currentValue) option.selected = true;
        issueTypeSelect.appendChild(option);
      });
    }
  }
  
  function filterDocuments() {
    if (!reportData) return;
    
    const category = document.getElementById('filter-category')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    const search = (document.getElementById('search-docs')?.value || '').toLowerCase();
    const issueFilter = document.getElementById('filter-doc-issues')?.value || '';
    
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
    
    if (issueFilter === 'has_issues') {
      filtered = filtered.filter(d => getDocumentIssues(d.relativePath).length > 0);
    } else if (issueFilter === 'no_issues') {
      filtered = filtered.filter(d => getDocumentIssues(d.relativePath).length === 0);
    }
    
    renderDocuments(filtered);
  }
  
  function filterImages() {
    if (!reportData) return;
    
    const type = document.getElementById('filter-image-type')?.value || '';
    const usage = document.getElementById('filter-image-usage')?.value || '';
    
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
    
    const type = document.getElementById('filter-issue-type')?.value || '';
    const severity = document.getElementById('filter-issue-severity')?.value || '';
    
    let filtered = [...reportData.issues];
    
    if (type) {
      filtered = filtered.filter(i => i.type === type);
    }
    
    if (severity) {
      filtered = filtered.filter(i => i.severity === severity);
    }
    
    renderIssues(filtered);
  }
  
  function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const targetTab = this.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        this.classList.add('active');
        document.getElementById(targetTab)?.classList.add('active');
      });
    });
  }
  
  function initModal() {
    const modal = document.getElementById('modal');
    const closeBtn = document.getElementById('modal-close');
    
    if (!modal) return;
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }
    
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
    
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.document-card');
      const isBtn = e.target.closest('.view-detail-btn');
      
      if (card && !isBtn) {
        const index = parseInt(card.dataset.index);
        showDetail('document', index);
      }
    });
  }
  
  function showDetail(type, index) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    let content = '';
    
    if (type === 'document' && reportData) {
      const doc = reportData.markdowns[index];
      if (doc) {
        const docIssues = getDocumentIssues(doc.relativePath);
        
        modalTitle.textContent = doc.title;
        content = `
          <div class="detail-section">
            <h5>📋 基本信息</h5>
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
            <h5>📝 摘要</h5>
            <p>${escapeHtml(doc.abstract)}</p>
          </div>
          ` : ''}
          ${doc.coverImage ? `
          <div class="detail-section">
            <h5>🖼️ 封面图</h5>
            <p class="cover-path">${escapeHtml(doc.coverImage)}</p>
          </div>
          ` : ''}
          ${doc.images && doc.images.length > 0 ? `
          <div class="detail-section">
            <h5>📷 引用图片 (${doc.images.length})</h5>
            <ul class="image-list">
              ${doc.images.map(img => `<li>📁 ${escapeHtml(img)}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          ${docIssues.length > 0 ? `
          <div class="detail-section">
            <h5>⚠️ 相关问题 (${docIssues.length})</h5>
            <div class="issue-mini-list">
              ${docIssues.map(issue => `
                <div class="issue-mini severity-${issue.severity}">
                  <span class="issue-mini-icon">${getIssueIcon(issue.type)}</span>
                  <span class="issue-mini-type">${getIssueLabel(issue.type)}</span>
                  <span class="issue-mini-msg">${escapeHtml(issue.message)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          ${doc.tags && doc.tags.length > 0 ? `
          <div class="detail-section">
            <h5>🏷️ 标签</h5>
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
              <tr><td>引用状态</td><td>${img.isUsed ? '✅ 已引用' : '⚠️ 未引用'}</td></tr>
            </table>
          </div>
          ${img.referencedBy && img.referencedBy.length > 0 ? `
          <div class="detail-section">
            <h5>📄 被以下文档引用 (${img.referencedBy.length})</h5>
            <ul>
              ${img.referencedBy.map(ref => `<li>📄 ${escapeHtml(ref)}</li>`).join('')}
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

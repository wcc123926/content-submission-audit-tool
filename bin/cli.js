#!/usr/bin/env node

const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const { scanDirectory } = require('../src/scanner');
const { generateReport, saveReport } = require('../src/reporter');
const { startServer } = require('../src/server');

program
  .name('cs-audit')
  .description('内容提交审核工具 - 扫描目录中的 Markdown 文档、图片和表格文件')
  .version('1.0.0');

program
  .command('scan')
  .description('扫描指定目录')
  .argument('<directory>', '要扫描的目录路径')
  .option('-o, --output <path>', '报告输出目录', './output')
  .option('--no-server', '不启动 Web 服务器')
  .option('-p, --port <number>', 'Web 服务器端口', '3000')
  .action(async (directory, options) => {
    console.log(chalk.blue('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.blue('║      内容提交审核工具                        ║'));
    console.log(chalk.blue('╚════════════════════════════════════════════╝\n'));

    const targetDir = path.resolve(directory);
    
    console.log(chalk.gray(`扫描目录: ${targetDir}`));
    console.log(chalk.gray(`报告输出: ${path.resolve(options.output)}\n`));

    try {
      console.log(chalk.yellow('正在扫描文件...\n'));
      
      const scanResults = await scanDirectory(targetDir);
      
      console.log(chalk.green('✓ 扫描完成\n'));
      
      const report = generateReport(scanResults);
      
      printConsoleReport(report);
      
      const reportPath = await saveReport(report, options.output);
      console.log(chalk.green(`\n✓ 报告已保存到: ${reportPath}\n`));
      
      if (options.server !== false) {
        const port = parseInt(options.port);
        startServer(port, report);
        console.log(chalk.cyan(`\n🌐 Web 服务器已启动: http://localhost:${port}`));
        console.log(chalk.gray('   按 Ctrl+C 停止服务器\n'));
      }
      
    } catch (error) {
      console.error(chalk.red('\n✗ 错误:'), error.message);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('启动 Web 服务器查看报告')
  .argument('<reportFile>', '报告文件路径 (.json)')
  .option('-p, --port <number>', 'Web 服务器端口', '3000')
  .action(async (reportFile, options) => {
    const fs = require('fs').promises;
    
    try {
      const reportPath = path.resolve(reportFile);
      const reportData = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportData);
      
      const port = parseInt(options.port);
      startServer(port, report);
      
      console.log(chalk.cyan(`\n🌐 Web 服务器已启动: http://localhost:${port}`));
      console.log(chalk.gray(`   加载报告: ${reportPath}`));
      console.log(chalk.gray('   按 Ctrl+C 停止服务器\n'));
      
    } catch (error) {
      console.error(chalk.red('\n✗ 错误:'), error.message);
      process.exit(1);
    }
  });

function printConsoleReport(report) {
  const { statistics, markdowns, images, tables, issues } = report;
  
  console.log(chalk.bold.underline('📊 统计概览'));
  console.log(`
  Markdown 文档: ${statistics.totalMarkdowns} 个
  图片文件: ${statistics.totalImages} 个
  表格文件: ${statistics.totalTables} 个
  
  有封面图的文档: ${statistics.hasCoverImage} 个
  有栏目信息的文档: ${statistics.hasCategory} 个
  有状态信息的文档: ${statistics.hasStatus} 个
  `);
  
  if (markdowns.length > 0) {
    console.log(chalk.bold.underline('📄 Markdown 文档列表'));
    console.log('');
    
    markdowns.forEach((doc, index) => {
      const statusColor = getStatusColor(doc.status);
      const statusText = doc.status || '未设置';
      const categoryText = doc.category || '未设置';
      
      console.log(chalk.gray(`${index + 1}.`) + ` ${chalk.bold(doc.title)}`);
      console.log(`   ${chalk.gray('路径:')} ${doc.relativePath}`);
      console.log(`   ${chalk.gray('栏目:')} ${categoryText} | ${chalk.gray('状态:')} ${statusColor(statusText)}`);
      
      if (doc.coverImage) {
        console.log(`   ${chalk.gray('封面:')} ${doc.coverImage}`);
      }
      
      if (doc.abstract) {
        console.log(`   ${chalk.gray('摘要:')} ${doc.abstract.substring(0, 100)}${doc.abstract.length > 100 ? '...' : ''}`);
      }
      
      console.log('');
    });
  }
  
  if (images.length > 0) {
    console.log(chalk.bold.underline('🖼️ 图片文件列表'));
    console.log('');
    
    images.forEach((img, index) => {
      const sizeStr = formatFileSize(img.size);
      console.log(chalk.gray(`${index + 1}.`) + ` ${chalk.bold(img.name)}`);
      console.log(`   ${chalk.gray('路径:')} ${img.relativePath}`);
      console.log(`   ${chalk.gray('大小:')} ${sizeStr} | ${chalk.gray('类型:')} ${img.extension.toUpperCase()}`);
      console.log('');
    });
  }
  
  if (tables.length > 0) {
    console.log(chalk.bold.underline('📊 表格文件列表'));
    console.log('');
    
    tables.forEach((table, index) => {
      const sizeStr = formatFileSize(table.size);
      console.log(chalk.gray(`${index + 1}.`) + ` ${chalk.bold(table.name)}`);
      console.log(`   ${chalk.gray('路径:')} ${table.relativePath}`);
      console.log(`   ${chalk.gray('大小:')} ${sizeStr} | ${chalk.gray('类型:')} ${table.extension.toUpperCase()}`);
      console.log('');
    });
  }
  
  if (issues.length > 0) {
    console.log(chalk.bold.underline('⚠️ 问题清单'));
    console.log('');
    
    const issueGroups = {};
    issues.forEach(issue => {
      if (!issueGroups[issue.type]) {
        issueGroups[issue.type] = [];
      }
      issueGroups[issue.type].push(issue);
    });
    
    Object.keys(issueGroups).forEach(type => {
      const groupIssues = issueGroups[type];
      console.log(chalk.yellow(`  ${getIssueTypeLabel(type)} (${groupIssues.length} 项)`));
      
      groupIssues.forEach((issue, idx) => {
        console.log(`    ${idx + 1}. ${issue.file} - ${issue.message}`);
      });
      console.log('');
    });
  }
  
  console.log(chalk.gray('─'.repeat(50)));
}

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'published':
    case '已发布':
      return chalk.green;
    case 'draft':
    case '草稿':
      return chalk.yellow;
    case 'review':
    case '审核中':
      return chalk.blue;
    case 'archived':
    case '已归档':
      return chalk.gray;
    default:
      return chalk.white;
  }
}

function getIssueTypeLabel(type) {
  const labels = {
    'missing_title': '缺少标题',
    'missing_abstract': '缺少摘要',
    'missing_cover': '缺少封面图',
    'missing_category': '缺少栏目',
    'missing_status': '缺少状态',
    'invalid_frontmatter': '无效的 Frontmatter',
    'orphan_image': '孤立图片（未在文档中引用）',
    'missing_image': '引用的图片不存在'
  };
  return labels[type] || type;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

program.parse(process.argv);

# 内容提交审核工具 (Content Submission Audit Tool)

一个用于本地审核内容提交的 Node.js 工具，支持扫描 Markdown 文档、图片和表格文件，提取元数据并生成可视化报告。

## 功能特性

- 📄 **Markdown 文档解析**：自动提取标题、摘要、封面图、栏目、状态等元数据
- 🖼️ **图片资源管理**：检测图片引用关系，识别孤立图片和缺失图片
- 📊 **表格文件统计**：支持 CSV、Excel 等表格文件的识别和统计
- 📋 **问题自动检测**：自动检测缺少标题、摘要、封面图、栏目、状态等问题
- 📈 **可视化报告**：命令行输出清晰易读，同时生成 JSON 报告
- 🌐 **本地 Web 界面**：启动本地服务器，通过浏览器查看详细报告
- 🔍 **智能筛选搜索**：支持按栏目、状态筛选，关键词搜索

## 项目结构

```
content-submission-audit-tool/
├── bin/
│   └── cli.js              # 命令行入口
├── src/
│   ├── index.js            # 主入口
│   ├── scanner.js          # 文件扫描器
│   ├── parser.js           # Markdown 解析器
│   ├── reporter.js         # 报告生成器
│   └── server.js           # Web 服务器
├── public/
│   ├── index.html          # 前端页面
│   ├── css/
│   │   └── style.css       # 样式文件
│   └── js/
│       └── app.js          # 前端逻辑
├── examples/
│   └── content/            # 示例数据
│       ├── tech/           # 技术文档
│       ├── design/         # 设计文档
│       ├── blog/           # 博客文章
│       ├── drafts/         # 草稿
│       ├── images/         # 图片资源
│       └── data/           # 表格数据
├── output/                 # 报告输出目录（运行时生成）
├── package.json
└── README.md
```

## 安装

```bash
# 安装依赖
npm install

# 可选：全局安装命令
npm link
```

## 使用方法

### 1. 扫描目录

扫描指定目录，生成报告并启动 Web 服务器：

```bash
# 使用 npx
npx cs-audit scan <目录路径>

# 或全局安装后
cs-audit scan <目录路径>

# 或使用 npm script
npm run audit -- <目录路径>
```

**示例：**

```bash
# 扫描示例数据目录
npx cs-audit scan examples/content

# 指定输出目录
npx cs-audit scan examples/content -o ./my-report

# 不启动 Web 服务器
npx cs-audit scan examples/content --no-server

# 指定 Web 服务器端口
npx cs-audit scan examples/content -p 8080
```

### 2. 查看已有报告

启动 Web 服务器查看已保存的 JSON 报告：

```bash
npx cs-audit serve <报告文件路径>

# 示例
npx cs-audit serve output/report-20240115-123456.json
```

### 3. 命令行参数

#### `scan` 命令

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--output` | `-o` | 报告输出目录 | `./output` |
| `--port` | `-p` | Web 服务器端口 | `3000` |
| `--no-server` | - | 不启动 Web 服务器 | false |

#### `serve` 命令

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--port` | `-p` | Web 服务器端口 | `3000` |

## Markdown 文档格式

工具会自动解析 Markdown 文件的 **Frontmatter**（YAML 格式）来提取元数据。

### 完整示例

```markdown
---
title: 文章标题
abstract: 文章摘要，简要描述文章内容
cover_image: ./images/cover.png
category: 技术教程
status: 已发布
date: 2024-01-15
author: 作者名
tags:
  - 标签1
  - 标签2
---

# 文章正文

这里是文章内容...
```

### Frontmatter 字段说明

| 字段 | 必需 | 说明 | 示例值 |
|------|------|------|--------|
| `title` | 推荐 | 文章标题 | Vue 3 入门指南 |
| `abstract` | 推荐 | 文章摘要 | 本文介绍 Vue 3 的核心特性... |
| `cover_image` | 推荐 | 封面图路径（相对或绝对） | ./images/cover.png |
| `category` | 推荐 | 栏目分类 | 技术教程 / 设计指南 |
| `status` | 推荐 | 文档状态 | 草稿 / 审核中 / 已发布 |
| `date` | 可选 | 发布日期 | 2024-01-15 |
| `author` | 可选 | 作者 | 张三 |
| `tags` | 可选 | 标签列表 | [Vue3, JavaScript] |

### 状态值建议

- `草稿` / `draft` - 正在撰写中
- `审核中` / `review` - 等待审核
- `已发布` / `published` - 已发布
- `已归档` / `archived` - 已归档

## 问题检测类型

工具会自动检测以下问题：

| 问题类型 | 说明 |
|----------|------|
| `missing_title` | 缺少标题（无 H1 标题或 Frontmatter title） |
| `missing_abstract` | 缺少摘要（无 Frontmatter abstract） |
| `missing_cover` | 缺少封面图（无 Frontmatter cover_image） |
| `missing_category` | 缺少栏目（无 Frontmatter category） |
| `missing_status` | 缺少状态（无 Frontmatter status） |
| `invalid_frontmatter` | Frontmatter 格式错误 |
| `orphan_image` | 孤立图片（存在但未在任何文档中引用） |
| `missing_image` | 引用的图片不存在 |

## Web 界面功能

启动 Web 服务器后，访问 `http://localhost:3000` 可以看到：

### 📊 概览页面
- 统计卡片：文档数、图片数、表格数、问题数
- 完成度进度条：封面图、栏目、状态的完成情况
- 栏目分布和状态分布统计

### 📄 文档列表
- 按栏目、状态筛选
- 标题/路径关键词搜索
- 点击查看详情弹窗

### 🖼️ 图片资源
- 按图片类型筛选
- 按使用情况筛选（已引用/未引用）
- 查看图片详情

### 📊 表格文件
- 表格文件列表
- 文件大小和类型信息

### ⚠️ 问题清单
- 按问题类型筛选
- 点击查看问题详情
- 快速定位问题文件

## 示例数据

项目包含 `examples/content/` 示例数据目录，用于演示工具功能：

```
examples/content/
├── tech/
│   ├── vue3-guide.md          # 完整示例文档
│   └── nodejs-performance.md  # 缺少封面图
├── design/
│   └── ui-principles.md       # 完整示例文档
├── blog/
│   └── my-journey.md          # 缺少部分信息
├── drafts/
│   └── incomplete-doc.md      # 不完整文档（用于测试问题检测）
├── images/
│   ├── vue3-cover.png
│   ├── vue3-api.png
│   ├── nodejs-benchmark.jpg
│   ├── design-mockup.png
│   └── unused-image.gif       # 孤立图片（未引用）
└── data/
    ├── product-stats.csv
    └── traffic-report.csv
```

**运行示例：**

```bash
# 扫描示例数据
npm install
npx cs-audit scan examples/content
```

然后访问 http://localhost:3000 查看报告。

## 输出格式

报告以 JSON 格式保存到输出目录，文件名格式为 `report-YYYYMMDD-HHMMSS.json`。

### JSON 结构

```json
{
  "scanTime": "2024-01-15T12:34:56.789Z",
  "sourceDirectory": "/path/to/content",
  "statistics": {
    "totalMarkdowns": 5,
    "totalImages": 6,
    "totalTables": 2,
    "hasCoverImage": 3,
    "hasCategory": 4,
    "hasStatus": 4,
    "totalIssues": 8
  },
  "markdowns": [
    {
      "title": "文章标题",
      "abstract": "摘要...",
      "coverImage": "./images/cover.png",
      "category": "技术教程",
      "status": "已发布",
      "date": "2024-01-15",
      "author": "张三",
      "tags": ["Vue3", "JavaScript"],
      "filePath": "/absolute/path/to/doc.md",
      "relativePath": "tech/doc.md",
      "fileName": "doc.md",
      "frontmatter": { ... },
      "images": ["./images/img1.png"],
      "wordCount": 1500
    }
  ],
  "images": [
    {
      "name": "vue3-cover.png",
      "extension": "png",
      "absolutePath": "/path/to/images/vue3-cover.png",
      "relativePath": "images/vue3-cover.png",
      "size": 102400,
      "isUsed": true,
      "referencedBy": ["tech/vue3-guide.md"]
    }
  ],
  "tables": [
    {
      "name": "product-stats.csv",
      "extension": "csv",
      "absolutePath": "/path/to/data/product-stats.csv",
      "relativePath": "data/product-stats.csv",
      "size": 512
    }
  ],
  "issues": [
    {
      "type": "missing_cover",
      "file": "tech/nodejs-performance.md",
      "message": "文档缺少封面图",
      "severity": "warning"
    }
  ]
}
```

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML/CSS/JavaScript（无框架依赖）
- **依赖库**：
  - `commander` - 命令行解析
  - `chalk` - 终端颜色输出
  - `gray-matter` - Frontmatter 解析
  - `marked` - Markdown 解析
  - `cheerio` - HTML 解析
  - `express` - Web 服务器

## 注意事项

1. **图片路径**：工具会检测 Markdown 中引用的图片路径（`![alt](path)` 格式），相对路径相对于 Markdown 文件所在目录。

2. **Frontmatter 格式**：确保 Frontmatter 使用正确的 YAML 格式，使用 `---` 包裹。

3. **文件编码**：建议使用 UTF-8 编码保存文件。

4. **大目录**：扫描包含大量文件的目录可能需要较长时间，工具会在控制台显示进度。

## 许可证

MIT License

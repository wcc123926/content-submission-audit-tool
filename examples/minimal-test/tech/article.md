---
title: 技术文章测试
abstract: 这是一个测试文章，只有 tech 和 images 两个目录。
cover_image: ../images/test-cover.jpg
category: 技术教程
status: 已发布
date: 2024-01-10
author: 测试作者
---

# 技术文章测试

这是一个位于 tech 目录下的文章。

封面图路径: `../images/test-cover.jpg`

目录结构:
```
minimal-test/
├── tech/
│   └── article.md
└── images/
    └── test-cover.jpg
```

路径解析:
- 文档位置: `tech/article.md`
- 封面图: `../images/test-cover.jpg`
- 解析后: `tech/../images/test-cover.jpg` → `images/test-cover.jpg`

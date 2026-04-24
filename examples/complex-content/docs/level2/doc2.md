---
title: 二层目录文档示例
abstract: 这是一个位于二级目录中的文档，使用 ../ 引用上层目录的图片。
cover_image: ../images/shared-cover.png
category: 路径测试
status: 审核中
date: 2024-01-21
author: 测试作者
tags:
  - 相对路径
  - 二层目录
---

# 二层目录文档

这是一个位于 `docs/level2/` 目录下的文档。

封面图路径：`../images/shared-cover.png`

解析过程：
- 当前文档位置: `docs/level2/doc2.md`
- 封面图路径: `../images/shared-cover.png`
- 解析后: `docs/level2/../images/shared-cover.png` → `docs/images/shared-cover.png`

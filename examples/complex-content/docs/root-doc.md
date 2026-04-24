---
title: 根级目录文档
abstract: 这是一个位于 docs 根目录的文档，使用 ./ 引用同级子目录的图片。
cover_image: ./images/root-cover.png
category: 路径测试
status: 已发布
date: 2024-01-23
author: 测试作者
tags:
  - 相对路径
  - 根目录
---

# 根级目录文档

这是一个位于 `docs/` 目录下的文档。

封面图路径：`./images/root-cover.png`

解析过程：
- 当前文档位置: `docs/root-doc.md`
- 封面图路径: `./images/root-cover.png`
- 解析后: `docs/images/root-cover.png`

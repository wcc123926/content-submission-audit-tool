---
title: 三层深度目录文档
abstract: 这是一个更深层级的文档，演示跨多层目录引用图片。
cover_image: ../../images/shared-cover.png
category: 深度测试
status: 草稿
date: 2024-01-22
author: 测试作者
tags:
  - 相对路径
  - 三层目录
---

# 三层深度目录

这是一个位于 `docs/level2/deeper/` 目录下的文档。

封面图路径：`../../images/shared-cover.png`

解析过程：
- 当前文档位置: `docs/level2/deeper/doc3.md`
- 封面图路径: `../../images/shared-cover.png`
- 解析后: `docs/level2/deeper/../../images/shared-cover.png` → `docs/images/shared-cover.png`

注意：这个文档和 doc2.md 引用的是**同一张图片**，尽管它们的相对路径写法不同。

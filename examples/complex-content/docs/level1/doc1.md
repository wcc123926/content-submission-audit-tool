---
title: 深度目录文档示例一
abstract: 这是一个位于深度目录中的文档，使用 ../../ 引用上层目录的图片。
cover_image: ../../images/cover.png
category: 深度测试
status: 已发布
date: 2024-01-20
author: 测试作者
tags:
  - 相对路径
  - 深度目录
---

# 深度目录文档

这是一个位于 `docs/level1/` 目录下的文档。

本文档使用的封面图路径：`../../images/cover.png`

这个路径会相对于当前文档所在目录解析：
- 当前文档位置: `docs/level1/doc1.md`
- 封面图路径: `../../images/cover.png`
- 解析后: `docs/level1/../../images/cover.png` → `images/cover.png`

![本地图片](./images/local-cover.jpg)

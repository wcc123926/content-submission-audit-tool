---
title: 使用 assets 目录的文档
abstract: 这篇文档引用了 assets 目录中的特殊图片。
cover_image: ../../assets/special-cover.svg
category: 路径测试
status: 已发布
date: 2024-01-25
author: 测试作者
tags:
  - assets目录
  - svg图片
---

# Assets 目录测试

这篇文档引用了 `assets/` 目录中的图片：
- 封面图: `../../assets/special-cover.svg`

路径解析：
- 当前文档位置: `docs/level1/assets-test.md`
- `..` → `docs/`
- `../..` → 根目录
- `../../assets/special-cover.svg` → `assets/special-cover.svg`

这演示了图片可以存储在不同的目录中，只要相对路径正确就能被正确识别。

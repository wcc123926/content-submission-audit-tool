---
title: 复杂路径测试示例说明
abstract: 这是一个用于测试复杂相对路径引用的示例内容集合。
cover_image: ./images/cover.png
category: 示例说明
status: 已发布
---

# 复杂相对路径测试示例

## 目录结构

```
complex-content/
├── images/                    # 顶层图片目录
│   ├── cover.png            # 被 doc1.md 引用 (../../images/cover.png)
│   └── unused-image.gif     # 未被任何文档引用（孤立图片）
│
├── assets/
│   └── special-cover.svg    # 被 assets-test.md 引用
│
├── docs/
│   ├── images/               # docs 层级的图片目录
│   │   ├── shared-cover.png # 被 doc2.md 和 doc3.md 共同引用
│   │   └── root-cover.png   # 被 root-doc.md 引用
│   │
│   ├── root-doc.md           # 引用: ./images/root-cover.png
│   │
│   ├── level1/
│   │   ├── doc1.md           # 引用: ../../images/cover.png
│   │   ├── assets-test.md    # 引用: ../assets/special-cover.svg
│   │   └── images/
│   │       └── local-cover.jpg # 被 doc1.md 正文引用
│   │
│   └── level2/
│       ├── doc2.md           # 引用: ../images/shared-cover.png
│       ├── missing-image-test.md # 引用不存在的图片
│       └── deeper/
│           └── doc3.md       # 引用: ../../images/shared-cover.png
│
└── README.md                 # 本文档
```

## 测试场景

### 1. 共享图片引用（核心测试场景）

**doc2.md** 和 **doc3.md** 都引用了同一张图片，但使用的相对路径不同：

- `docs/level2/doc2.md` → `../images/shared-cover.png`
- `docs/level2/deeper/doc3.md` → `../../images/shared-cover.png`

解析后都指向：`docs/images/shared-cover.png`

**预期行为：**
- 图片列表中 `shared-cover.png` 的 `isUsed` 应为 `true`
- `referencedBy` 应包含两个文档路径
- 问题清单中不应有"孤立图片"问题
- 两个文档的封面图都应被正确识别为"已引用"

### 2. 不同层级的路径解析

| 文档 | 相对路径 | 解析后路径 |
|------|----------|------------|
| `docs/root-doc.md` | `./images/root-cover.png` | `docs/images/root-cover.png` |
| `docs/level1/doc1.md` | `../../images/cover.png` | `images/cover.png` |
| `docs/level2/doc2.md` | `../images/shared-cover.png` | `docs/images/shared-cover.png` |
| `docs/level2/deeper/doc3.md` | `../../images/shared-cover.png` | `docs/images/shared-cover.png` |

### 3. 孤立图片检测

- `images/unused-image.gif` - 未被任何文档引用
- 预期：出现在问题清单的"孤立图片"中

### 4. 缺失图片检测

- `docs/level2/missing-image-test.md` 引用了：
  - 封面图: `../assets/nonexistent-image.png`（不存在）
  - 正文图片: `../images/another-missing.jpg`（不存在）
- 预期：问题清单中应有"引用的图片不存在"问题

### 5. 正文图片引用

- `docs/level1/doc1.md` 正文中引用了 `./images/local-cover.jpg`
- 预期：这张图片也应被标记为"已引用"

## 验证要点

运行扫描后，验证以下几点：

1. **图片资源列表**：
   - `shared-cover.png` - 显示"已引用"，引用者数量=2
   - `cover.png` - 显示"已引用"，引用者数量=1
   - `root-cover.png` - 显示"已引用"
   - `local-cover.jpg` - 显示"已引用"
   - `special-cover.svg` - 显示"已引用"
   - `unused-image.gif` - 显示"未引用"

2. **问题清单**：
   - 应有 1 个"孤立图片"问题（unused-image.gif）
   - 应有 2 个"引用的图片不存在"问题（missing-image-test.md 中的两个引用）

3. **文档列表**：
   - 所有有封面图的文档应正确显示封面图路径
   - 封面图存在的文档不应有"缺少封面图"问题

# 📖 Comic Reader

一款基于 Tauri 2 + Vue 3 的桌面漫画阅读器，支持竖屏滚动阅读，能够从压缩包或文件夹加载图片。

![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB.svg)
![Vue](https://img.shields.io/badge/Vue-3.5-42b883.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg)

## ✨ 功能特性

- 📚 **多格式支持** - 支持 ZIP/CBZ 压缩包和图片文件夹
- 📜 **竖屏滚动** - 流畅的竖屏滚动阅读体验
- 🌲 **文件树导航** - 树状图展示漫画目录结构
- 📍 **阅读进度** - 自动保存和恢复阅读位置
- 🔖 **书签收藏** - 添加书签，快速定位到喜欢的页面
- 🔍 **缩放功能** - 支持适应宽度、原始尺寸、自定义缩放
- 🎨 **主题切换** - 支持浅色/深色主题
- 🖥️ **全屏模式** - 沉浸式阅读体验
- 📐 **宽高比锁定** - 可自定义图片显示宽高比

## 🖼️ 截图

> *即将添加...*

## 🛠️ 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 状态管理
- **Vue Router** - Vue 官方路由
- **VueUse** - Vue 组合式 API 工具集

### 后端
- **Tauri 2** - 轻量级跨平台桌面应用框架
- **Rust** - 系统级编程语言

### 主要依赖
| 依赖 | 用途 |
|------|------|
| `zip` | ZIP/CBZ 压缩包读取 |
| `image` | 图片处理 |
| `walkdir` | 递归目录遍历 |
| `natord` | 自然排序（正确排序 1, 2, 10） |
| `base64` | 图片编码传输 |

## 📦 安装

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.77.2
- 根据您的操作系统，需要安装 [Tauri 先决条件](https://tauri.app/start/prerequisites/)

### 克隆仓库

```bash
git clone https://github.com/jnuse/Comic.git
cd Comic
```

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run tauri dev
```

### 构建发布版本

```bash
npm run tauri build
```

## 🚀 使用说明

1. **选择文件夹** - 点击左侧「选择文件夹」按钮，选择包含漫画的根目录
2. **浏览漫画** - 在文件树中展开文件夹，找到要阅读的漫画
   - 📦 压缩包图标表示 ZIP/CBZ 漫画
   - 📖 书本图标表示图片文件夹
3. **阅读漫画** - 点击漫画开始阅读，支持竖向滚动
4. **快捷操作**
   - 使用滚轮缩放图片
   - 点击全屏按钮进入沉浸式阅读
   - 点击书签按钮添加/管理书签

## 📁 项目结构

```
Comic/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   │   ├── ComicViewer.vue    # 漫画阅读器
│   │   ├── FileTree.vue       # 文件树
│   │   ├── FileTreeNode.vue   # 文件树节点
│   │   ├── BookmarksPanel.vue # 书签面板
│   │   ├── SettingsPanel.vue  # 设置面板
│   │   └── ThemeToggle.vue    # 主题切换
│   ├── stores/             # Pinia 状态管理
│   │   ├── comic.ts           # 漫画状态
│   │   ├── settings.ts        # 设置状态
│   │   └── bookmarks.ts       # 书签状态
│   ├── types/              # TypeScript 类型定义
│   └── App.vue             # 主入口组件
├── src-tauri/              # Tauri/Rust 后端
│   ├── src/                # Rust 源码
│   └── Cargo.toml          # Rust 依赖配置
├── package.json            # 前端依赖配置
└── vite.config.ts          # Vite 配置
```

## 🔧 开发相关

### 推荐 IDE 配置

- [VS Code](https://code.visualstudio.com/) + 以下插件：
  - [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### 常用命令

```bash
# 前端开发（不启动 Tauri）
npm run dev

# Tauri 开发模式
npm run tauri dev

# 类型检查 + 构建前端
npm run build

# 构建 Tauri 应用
npm run tauri build
```

## 📄 许可证

本项目采用 [GNU General Public License v3.0](LICENSE) 许可证。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ using Tauri + Vue

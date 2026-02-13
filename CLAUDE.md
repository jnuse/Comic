# Comic Reader 项目概览

## 技术栈

### 编程语言
- **TypeScript** - 前端主要语言
- **Vue 3 SFC** - 单文件组件 (HTML/CSS/TS)
- **Rust** - 后端系统语言

### 前端框架与库 (package.json)
- `vue@3.5.13` - 渐进式 JavaScript 框架
- `vite@6.0.3` - 构建工具
- `typescript@5.6.2` - 类型系统
- `pinia@3.0.4` - 状态管理
- `@vueuse/core@14.1.0` - 组合式 API 工具集
- `@tauri-apps/api@^2` - Tauri JavaScript API
- `@tauri-apps/plugin-dialog@2.6.0` - 文件对话框
- `@tauri-apps/plugin-fs@2.4.5` - 文件系统
- `@tauri-apps/plugin-opener@^2` - 打开文件/URL

### 后端框架与库 (Cargo.toml)
- `tauri@2` - 跨平台桌面应用框架
- `serde@1` + `serde_json@1` - 序列化
- `zip@2` - ZIP/CBZ 压缩包读取
- `base64@0.22` - Base64 编码
- `image@0.25` - 图片处理 (jpeg, png, gif, webp, bmp)
- `walkdir@2` - 递归目录遍历
- `natord@1.0` - 自然排序
- `tokio@1` - 异步运行时

## 项目结构

```
Comic/
├── .devcontainer/
│   └── devcontainer.json          # Dev Container 配置
├── .github/
│   └── workflows/
│       └── build.yml              # GitHub Actions 构建流程
├── .vscode/
│   └── extensions.json            # VS Code 推荐扩展
├── index.html                     # HTML 入口
├── package.json                   # 前端依赖配置
├── tsconfig.json                  # TypeScript 配置
├── tsconfig.node.json             # Node TypeScript 配置
├── vite.config.ts                 # Vite 构建配置 (端口 1420)
├── PLAN.md                        # 项目开发计划
├── README.md                      # 项目说明
├── LICENSE                        # GPL v3.0
├── public/                        # 静态资源
│   ├── tauri.svg
│   └── vite.svg
├── src/                           # 前端源码 (Vue 3 + TypeScript)
│   ├── main.ts                    # 应用入口，创建 Vue 实例，注册 Pinia
│   ├── App.vue                    # 主应用组件，侧边栏 + 阅读器 + 全屏模式
│   ├── vite-env.d.ts              # Vite 类型声明
│   ├── assets/
│   │   └── vue.svg
│   ├── components/
│   │   ├── ComicViewer.vue        # 漫画阅读器主组件：整合子组件和逻辑，支持 Ctrl+滚轮缩放
│   │   ├── ComicImage.vue         # 单个图片组件：显示图片或占位符
│   │   ├── ComicToolbar.vue       # 悬浮工具栏：翻页、书签、缩放控制
│   │   ├── FileTree.vue           # 文件树导航容器：支持字母排序和当前漫画高亮
│   │   ├── FileTreeNode.vue       # 文件树节点：递归渲染，支持高亮当前打开的漫画
│   │   ├── BookmarksPanel.vue     # 书签管理面板
│   │   ├── SettingsPanel.vue      # 设置面板 (主题、缩放、比例)
│   │   └── ThemeToggle.vue        # 浅色/深色主题切换
│   ├── composables/
│   │   ├── index.ts               # Composables 统一导出
│   │   ├── useImageLoader.ts      # 图片加载队列管理：并发控制、优先级排序、条件化日志
│   │   └── useScrollManager.ts    # 滚动管理：位置追踪、进度保存、翻页导航
│   ├── stores/
│   │   ├── index.ts               # Store 统一导出
│   │   ├── comic.ts               # 漫画状态：文件树、当前漫画、图片加载、条件化日志
│   │   ├── settings.ts            # 设置状态 (主题、缩放模式、预加载)
│   │   └── bookmarks.ts           # 书签和阅读进度状态
│   └── types/
│       └── index.ts               # TypeScript 接口定义
└── src-tauri/                     # Tauri/Rust 后端
    ├── build.rs                   # 构建脚本
    ├── Cargo.toml                 # Rust 依赖配置
    ├── tauri.conf.json            # Tauri 应用配置 (窗口、标识符)
    ├── capabilities/
    │   └── default.json           # 权限配置
    ├── icons/                     # 应用图标 (多平台)
    └── src/
        ├── main.rs                # 入口，调用 comic_lib::run()
        ├── lib.rs                 # 库入口，注册所有 Tauri 命令
        ├── file_system.rs         # 目录扫描、文件树构建、图片识别
        ├── image_handler.rs       # 图片读取、Base64 编码、尺寸获取
        ├── storage.rs             # 数据持久化 (设置、进度、书签)
        └── zip_handler.rs         # ZIP/CBZ 压缩包处理
```

## 规则

1. 一切编码工作必须严格在项目根目录展开。
2. 编译和测试部分由用户负责。
4. 一切数据以代码为准，执行任务前要检查代码是否存在以及是否已经有内容。
5. 编码任务的每一步都必须告知用户做了什么以及为什么这么做。
6. 禁止输出任何文档除非用户要求。

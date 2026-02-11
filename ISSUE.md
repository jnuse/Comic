# 已知问题

## 🔴 致命问题

### 1. 内存泄漏 — 图片缓存无上限
- **位置**: `src/stores/comic.ts:151`
- **描述**: 每张图片的 base64 data URL 永久缓存在 `currentComic.value.images[index].data`，永不释放。一张漫画页 1-5MB，base64 膨胀 33%，200 页漫画内存吃掉 400MB-1.3GB。
- **方案**: LRU 缓存，只保留当前可视区域附近的图片数据，远离视口的自动释放。

### 2. ZIP 反复开关 — 每张图片重新打开压缩包
- **位置**: `src-tauri/src/zip_handler.rs:77`
- **描述**: `read_zip_image` 每次调用都重新 `File::open` + `ZipArchive::new`。200 页漫画 = 打开 ZIP 200 次、解析中央目录 200 次。
- **方案**: 用 Tauri `State` 管理 ZIP 句柄缓存，同一 ZIP 只打开一次。

### 3. 存储 I/O 风暴 — 每次操作读写全量 JSON
- **位置**: `src-tauri/src/storage.rs` 全部写入函数
- **描述**: `save_progress`、`add_bookmark`、`save_settings`、`save_last_opened_path` 每个都完整 `load_app_data()` → 修改 → `save_app_data()`。滚动时每秒触发一次进度保存 = 每秒完整读写整个数据文件。且 `fs::write` 非原子操作，崩溃时数据文件可能损坏。
- **方案**: 内存缓存 AppData，脏标记 + 定时刷盘；写入用临时文件 + rename 保证原子性。

## 🟡 性能问题

### 4. 可见图片检测 O(n) 暴力遍历
- **位置**: `src/components/ComicViewer.vue:318`
- **描述**: `loadVisibleImages` 每次滚动遍历所有图片元素做 `getBoundingClientRect()`，200 页 = 200 次 DOM 查询。
- **方案**: 使用 `IntersectionObserver`。

### 5. 获取图片尺寸做了完整解码
- **位置**: `src-tauri/src/image_handler.rs:17`
- **描述**: `image::open()` 完整解码图片只为拿宽高，`image::image_dimensions()` 只读文件头，快几个数量级。
- **方案**: 替换为 `image::image_dimensions()`。

### 6. 初始加载串行
- **位置**: `src/components/ComicViewer.vue:503`
- **描述**: 初始加载前 3 张图片用 `for + await` 串行等待。
- **方案**: `Promise.all` 并行加载。

## 🟡 代码卫生

### 7. 死代码
- `src-tauri/src/file_system.rs:44` — `natural_sort_key` 定义未使用
- `src-tauri/src/file_system.rs:75` — `directory_contains_images_recursive` 未被调用
- `src-tauri/src/image_handler.rs:37` — `read_images_batch` 未暴露或调用
- `src-tauri/src/image_handler.rs:62` — `generate_thumbnail` 未调用
- `src-tauri/src/image_handler.rs:6` — `ImageInfo` 结构体未使用

### 8. `get_mime_type` 重复定义
- **位置**: `image_handler.rs:48` 和 `zip_handler.rs:142`
- **描述**: 完全相同的函数，应提取到公共模块。

## 🟠 用户体验问题

### 9. 打开新目录会覆盖旧目录
- **位置**: `src/stores/comic.ts:29`
- **描述**: `scanDirectory` 直接 `fileTree.value = tree` 覆盖，`fileTree` 类型是单个 `FileNode | null`，数据结构只能容纳一棵树。用户打开第二个文件夹时，第一个文件夹的树直接消失。
- **方案**: 将 `fileTree` 改为 `FileNode[]` 数组（或 Map），支持多棵树共存。侧边栏渲染多个根节点，每个根节点可独立折叠/展开。

### 10. 书签跳转不滚动到对应页
- **位置**: `src/App.vue:88-100`
- **描述**: `handleBookmarkSelect` 打开漫画后只关闭了书签面板，没有滚动到书签对应的 `imageIndex`。用户点击书签后看到的是漫画开头（或上次进度），而不是书签标记的那一页。
- **方案**: 打开漫画后调用 ComicViewer 的 `scrollToImage(bookmark.imageIndex)`。

### 10. 文件树不高亮当前漫画
- **位置**: `src/components/FileTreeNode.vue`
- **描述**: 点击漫画节点打开后，文件树中没有任何视觉反馈表示"当前正在阅读哪本"。用户在大量漫画中容易迷失位置。
- **方案**: 传入 `currentComicPath`，匹配时添加高亮样式。

### 11. 文件树默认全部折叠
- **位置**: `src/components/FileTree.vue:24`
- **描述**: `expandedPaths` 初始为空 Set，用户打开文件夹后看到的是全部折叠的树，需要手动一层层展开。对于深层目录结构很不友好。
- **方案**: 扫描目录后自动展开根节点（至少第一层）。

### 12. 设置面板和书签面板互斥逻辑缺失
- **位置**: `src/App.vue:19-20`
- **描述**: `showBookmarks` 和 `showSettings` 是独立的 ref，可以同时为 true，导致两个面板同时显示，挤压主内容区。
- **方案**: 打开一个面板时自动关闭另一个。

### 13. 书签删除用原生 confirm 对话框
- **位置**: `src/components/BookmarksPanel.vue:59`
- **描述**: `confirm('确定要删除这个书签吗？')` 使用浏览器原生弹窗，在 Tauri 桌面应用中体验割裂，且无法自定义样式。
- **方案**: 使用自定义确认组件，或直接删除 + 提供撤销功能（更符合现代 UX）。

### 14. 设置修改无防抖，每次变更立即写盘
- **位置**: `src/stores/settings.ts:58-98`
- **描述**: `setTheme`、`setZoomMode`、`setCustomZoom` 等每个 setter 都直接调用 `saveSettings()`。拖动缩放滑块时，每个像素变化都触发一次完整的 IPC + 文件读写。
- **方案**: `saveSettings` 加防抖，或只在面板关闭时保存。

### 15. 加载失败无用户反馈
- **位置**: 多处 `catch` 块只有 `console.error`
- **描述**: 图片加载失败、目录扫描失败、书签操作失败等错误只打印到控制台，用户完全看不到。漫画打不开时用户不知道发生了什么。
- **方案**: 添加 toast/notification 组件，向用户展示错误信息。

### 16. 全屏模式下无法访问文件树切换漫画
- **位置**: `src/App.vue:125-143`
- **描述**: 全屏模式用 `v-if` 完全替换了主界面，侧边栏消失。用户想切换到下一本漫画必须先退出全屏 → 选择 → 再进全屏，操作链路太长。
- **方案**: 全屏模式下提供"上一本/下一本"快捷切换，或侧边栏可通过快捷键呼出。

### 17. 翻页跳转未确保目标图片已加载
- **位置**: `src/components/ComicViewer.vue:389-395`
- **描述**: `scrollToImage` 直接 `scrollIntoView`，但目标图片可能还没加载（还是 placeholder）。滚动到一个 300px 高的 placeholder 后，图片加载完成高度变化，导致滚动位置偏移。
- **方案**: 先 `await loadImage(index)`，再滚动。

### 18. 无鼠标滚轮缩放支持
- **位置**: `src/components/ComicViewer.vue`
- **描述**: 缩放只能通过工具栏按钮操作，不支持 Ctrl+滚轮缩放。这是图片查看器的基本交互预期。
- **方案**: 监听 `wheel` 事件，Ctrl 按下时触发缩放。

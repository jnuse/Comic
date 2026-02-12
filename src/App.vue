<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import FileTree from './components/FileTree.vue';
import ComicViewer from './components/ComicViewer.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import BookmarksPanel from './components/BookmarksPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import { useComicStore, useSettingsStore, useBookmarkStore } from './stores';
import type { FileNode, Bookmark } from './types';

// Stores
const comicStore = useComicStore();
const settingsStore = useSettingsStore();
const bookmarkStore = useBookmarkStore();

// 状态
const showBookmarks = ref(false);
const showSettings = ref(false);

// 计算属性
const settings = computed(() => settingsStore.settings);
const currentComic = computed(() => comicStore.currentComic);
const fileTrees = computed(() => comicStore.fileTrees);
const bookmarks = computed(() => bookmarkStore.bookmarks);
const isFullscreen = computed(() => settings.value.readerMode === 'fullscreen');
const hasComic = computed(() => currentComic.value !== null);

// 方法
async function selectFolder() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择漫画文件夹',
    });

    if (selected && typeof selected === 'string') {
      await comicStore.scanDirectory(selected);
    }
  } catch (e) {
    console.error('选择文件夹失败:', e);
  }
}

async function handleNodeSelect(node: FileNode) {
  if (!node.isComic) return;

  try {
    await comicStore.openComic(node.path, node.name, node.isZip);
  } catch (e) {
    console.error('打开漫画失败:', e);
  }
}

function handleRemoveTree(path: string) {
  comicStore.removeFileTree(path);
}

function handleCloseReader() {
  comicStore.clearComic();
}

function toggleFullscreen() {
  settingsStore.setReaderMode(isFullscreen.value ? 'embedded' : 'fullscreen');
}

function handleZoomIn() {
  const current = settings.value.customZoom;
  settingsStore.setCustomZoom(Math.min(500, current + 10));
  if (settings.value.zoomMode !== 'custom') {
    settingsStore.setZoomMode('custom');
  }
}

function handleZoomOut() {
  const current = settings.value.customZoom;
  settingsStore.setCustomZoom(Math.max(10, current - 10));
  if (settings.value.zoomMode !== 'custom') {
    settingsStore.setZoomMode('custom');
  }
}

function handleRestoreZoom(zoomMode: string, customZoom: number) {
  settingsStore.setZoomMode(zoomMode as any);
  settingsStore.setCustomZoom(customZoom);
}

async function handleBookmarkSelect(bookmark: Bookmark) {
  // 如果是不同的漫画，需要先打开
  if (!currentComic.value || currentComic.value.path !== bookmark.comicPath) {
    // 需要找到对应的节点来确定是否是 ZIP
    // 简单处理：通过文件扩展名判断
    const isZip = bookmark.comicPath.toLowerCase().endsWith('.zip') ||
      bookmark.comicPath.toLowerCase().endsWith('.cbz');

    await comicStore.openComic(bookmark.comicPath, bookmark.comicName, isZip);
  }

  showBookmarks.value = false;
}

// 初始化
onMounted(async () => {
  // 加载设置
  await settingsStore.loadSettings();

  // 加载书签
  await bookmarkStore.loadBookmarks();

  // 加载已保存的目录树
  await comicStore.loadSavedDirectories();
});
</script>

<template>
  <div class="app" :class="{ dark: settingsStore.isDark }">
    <!-- 全屏阅读模式 -->
    <div v-if="isFullscreen && hasComic && currentComic" class="fullscreen-reader">
      <ComicViewer 
        :images="currentComic.images" 
        :comic-path="currentComic.path" 
        :comic-name="currentComic.name"
        :zoom-mode="settings.zoomMode" 
        :custom-zoom="settings.customZoom" 
        :preload-count="settings.preloadCount"
        :aspect-ratio="settings.aspectRatio"
        :custom-aspect-width="settings.customAspectWidth"
        :custom-aspect-height="settings.customAspectHeight"
        :is-fullscreen="true"
        @close="handleCloseReader" 
        @zoom-in="handleZoomIn" 
        @zoom-out="handleZoomOut"
        @toggle-fullscreen="toggleFullscreen"
        @restore-zoom="handleRestoreZoom"
      />
    </div>

    <!-- 主界面（嵌入式阅读模式） -->
    <div v-else class="home-view">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h1 class="app-title">📖 Comic Reader</h1>
          <div class="header-actions">
            <ThemeToggle />
            <button class="icon-btn" @click="showBookmarks = !showBookmarks" title="书签">
              📚
            </button>
            <button class="icon-btn" @click="showSettings = !showSettings" title="设置">
              ⚙️
            </button>
          </div>
        </div>

        <button class="select-folder-btn" @click="selectFolder">
          📁 选择文件夹
        </button>

        <div class="file-tree-container">
          <FileTree :trees="fileTrees" @select="handleNodeSelect" @remove="handleRemoveTree" />
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <!-- 有漫画时显示阅读器 -->
        <div v-if="hasComic && currentComic" class="embedded-reader">
          <ComicViewer 
            :images="currentComic.images" 
            :comic-path="currentComic.path" 
            :comic-name="currentComic.name"
            :zoom-mode="settings.zoomMode" 
            :custom-zoom="settings.customZoom" 
            :preload-count="settings.preloadCount"
            :aspect-ratio="settings.aspectRatio"
            :custom-aspect-width="settings.customAspectWidth"
            :custom-aspect-height="settings.customAspectHeight"
            :is-fullscreen="false"
            @close="handleCloseReader" 
            @zoom-in="handleZoomIn" 
            @zoom-out="handleZoomOut"
            @toggle-fullscreen="toggleFullscreen"
            @restore-zoom="handleRestoreZoom"
          />
        </div>

        <!-- 无漫画时显示提示 -->
        <div v-else-if="fileTrees.length === 0" class="empty-state">
          <div class="empty-icon">📚</div>
          <h2>欢迎使用 Comic Reader</h2>
          <p>点击左侧「选择文件夹」按钮开始浏览漫画</p>
          <p class="hint">支持 ZIP/CBZ 压缩包和图片文件夹</p>
        </div>
        <div v-else class="ready-state">
          <div class="ready-icon">👆</div>
          <h2>从左侧选择漫画开始阅读</h2>
          <p>📦 压缩包图标表示 ZIP 漫画</p>
          <p>📖 书本图标表示图片文件夹</p>
        </div>
      </main>

      <!-- 书签面板 -->
      <BookmarksPanel v-if="showBookmarks" :bookmarks="bookmarks" @close="showBookmarks = false"
        @select="handleBookmarkSelect" />

      <!-- 设置面板 -->
      <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    </div>
  </div>
</template>

<style>
/* CSS 变量 - 浅色主题 */
:root {
  --bg-color: #ffffff;
  --text-color: #1a1a1a;
  --text-muted: #666666;
  --border-color: #e0e0e0;
  --hover-bg: rgba(0, 0, 0, 0.05);
  --primary-color: #3b82f6;
  --primary-bg: rgba(59, 130, 246, 0.1);
  --accent-color: #8b5cf6;
  --btn-bg: #f5f5f5;
  --btn-hover-bg: #ebebeb;
  --panel-bg: #ffffff;
  --sidebar-bg: #f8f9fa;
  --item-bg: #f5f5f5;
  --item-hover-bg: #ebebeb;
  --viewer-bg: #1a1a1a;
  --toolbar-bg: rgba(255, 255, 255, 0.95);
  --placeholder-bg: #f0f0f0;
  --progress-bg: rgba(0, 0, 0, 0.1);
  --slider-bg: #e0e0e0;
  --input-bg: #ffffff;
}

/* 深色主题 */
.dark {
  --bg-color: #1a1a1a;
  --text-color: #f0f0f0;
  --text-muted: #888888;
  --border-color: #333333;
  --hover-bg: rgba(255, 255, 255, 0.08);
  --primary-color: #60a5fa;
  --primary-bg: rgba(96, 165, 250, 0.15);
  --accent-color: #a78bfa;
  --btn-bg: #2a2a2a;
  --btn-hover-bg: #3a3a3a;
  --panel-bg: #242424;
  --sidebar-bg: #1e1e1e;
  --item-bg: #2a2a2a;
  --item-hover-bg: #3a3a3a;
  --viewer-bg: #0a0a0a;
  --toolbar-bg: rgba(40, 40, 40, 0.95);
  --placeholder-bg: #2a2a2a;
  --progress-bg: rgba(255, 255, 255, 0.1);
  --slider-bg: #444444;
  --input-bg: #2a2a2a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s, color 0.3s;
}
</style>

<style scoped>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 主页视图 */
.home-view {
  display: flex;
  height: 100%;
}

/* 侧边栏 */
.sidebar {
  width: 300px;
  min-width: 250px;
  max-width: 400px;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  resize: horizontal;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background-color: var(--btn-bg);
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.icon-btn:hover {
  background-color: var(--btn-hover-bg);
}

.select-folder-btn {
  margin: 16px;
  padding: 12px 16px;
  border: none;
  background-color: var(--primary-color);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.select-folder-btn:hover {
  opacity: 0.9;
}

.file-tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 嵌入式阅读器 */
.embedded-reader {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 全屏阅读器 */
.fullscreen-reader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background-color: var(--viewer-bg);
}

.empty-state,
.ready-state {
  text-align: center;
  max-width: 400px;
  padding: 40px;
}

.empty-icon,
.ready-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.empty-state h2,
.ready-state h2 {
  font-size: 24px;
  margin-bottom: 12px;
}

.empty-state p,
.ready-state p {
  color: var(--text-muted);
  margin-bottom: 8px;
}

.hint {
  font-size: 14px;
  opacity: 0.7;
}
</style>
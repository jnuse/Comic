import { defineStore } from "pinia";
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import type { Bookmark, ReadingProgress } from "../types";

export const useBookmarkStore = defineStore("bookmark", () => {
  // 状态
  const bookmarks = ref<Bookmark[]>([]);
  const isLoading = ref(false);

  // 加载所有书签
  async function loadBookmarks() {
    isLoading.value = true;
    try {
      bookmarks.value = await invoke<Bookmark[]>("cmd_get_bookmarks");
    } catch (e) {
      console.error("加载书签失败:", e);
      bookmarks.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // 添加书签
  async function addBookmark(
    comicPath: string,
    comicName: string,
    imageIndex: number,
    note?: string,
  ) {
    const bookmark: Bookmark = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      comicPath,
      comicName,
      imageIndex,
      createdAt: Date.now(),
      note,
    };

    try {
      await invoke("cmd_add_bookmark", { bookmark });
      bookmarks.value.push(bookmark);
      return bookmark;
    } catch (e) {
      console.error("添加书签失败:", e);
      throw e;
    }
  }

  // 删除书签
  async function removeBookmark(bookmarkId: string) {
    try {
      await invoke("cmd_remove_bookmark", { bookmarkId });
      bookmarks.value = bookmarks.value.filter((b) => b.id !== bookmarkId);
    } catch (e) {
      console.error("删除书签失败:", e);
      throw e;
    }
  }

  // 获取漫画的书签
  function getComicBookmarks(comicPath: string): Bookmark[] {
    return bookmarks.value.filter((b) => b.comicPath === comicPath);
  }

  // 检查是否已收藏
  function isBookmarked(comicPath: string, imageIndex: number): boolean {
    return bookmarks.value.some(
      (b) => b.comicPath === comicPath && b.imageIndex === imageIndex,
    );
  }

  // 获取书签（如果存在）
  function getBookmark(
    comicPath: string,
    imageIndex: number,
  ): Bookmark | undefined {
    return bookmarks.value.find(
      (b) => b.comicPath === comicPath && b.imageIndex === imageIndex,
    );
  }

  // 切换书签状态
  async function toggleBookmark(
    comicPath: string,
    comicName: string,
    imageIndex: number,
  ) {
    const existing = getBookmark(comicPath, imageIndex);
    if (existing) {
      await removeBookmark(existing.id);
      return null;
    } else {
      return await addBookmark(comicPath, comicName, imageIndex);
    }
  }

  return {
    // 状态
    bookmarks,
    isLoading,
    // 方法
    loadBookmarks,
    addBookmark,
    removeBookmark,
    getComicBookmarks,
    isBookmarked,
    getBookmark,
    toggleBookmark,
  };
});

// 阅读进度 Store
export const useProgressStore = defineStore("progress", () => {
  // 状态
  const progressMap = ref<Record<string, ReadingProgress>>({});

  // 保存进度
  async function saveProgress(
    comicPath: string,
    imageIndex: number,
    scrollPosition: number,
    zoomMode?: string,
    customZoom?: number,
  ) {
    const progress: ReadingProgress = {
      comicPath,
      lastImageIndex: imageIndex,
      scrollPosition,
      lastReadTime: Date.now(),
      zoomMode: zoomMode as ReadingProgress['zoomMode'],
      customZoom,
    };

    try {
      await invoke("cmd_save_progress", { progress });
      progressMap.value[comicPath] = progress;
    } catch (e) {
      console.error("保存进度失败:", e);
    }
  }

  // 获取进度
  async function getProgress(
    comicPath: string,
  ): Promise<ReadingProgress | null> {
    // 先检查缓存
    if (progressMap.value[comicPath]) {
      return progressMap.value[comicPath];
    }

    try {
      const progress = await invoke<ReadingProgress | null>(
        "cmd_get_progress",
        {
          comicPath,
        },
      );
      if (progress) {
        progressMap.value[comicPath] = progress;
      }
      return progress;
    } catch (e) {
      console.error("获取进度失败:", e);
      return null;
    }
  }

  return {
    // 状态
    progressMap,
    // 方法
    saveProgress,
    getProgress,
  };
});

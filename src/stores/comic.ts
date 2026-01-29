import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import type { FileNode, ComicInfo, ImageInfo, ZipImageInfo } from "../types";

export const useComicStore = defineStore("comic", () => {
  // 状态
  const rootPath = ref<string | null>(null);
  const fileTree = ref<FileNode | null>(null);
  const currentComic = ref<ComicInfo | null>(null);
  const isLoading = ref(false);
  const loadingProgress = ref(0);
  const error = ref<string | null>(null);

  // 计算属性
  const hasComic = computed(() => currentComic.value !== null);
  const imageCount = computed(() => currentComic.value?.imageCount ?? 0);

  // 扫描目录
  async function scanDirectory(path: string, maxDepth: number = 10) {
    isLoading.value = true;
    error.value = null;

    try {
      const tree = await invoke<FileNode>("cmd_scan_directory", {
        path,
        maxDepth,
      });
      rootPath.value = path;
      fileTree.value = tree;
      return tree;
    } catch (e) {
      error.value = String(e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // 打开漫画（文件夹）
  async function openComicFromFolder(path: string, name: string) {
    isLoading.value = true;
    loadingProgress.value = 0;
    error.value = null;

    try {
      const imagePaths = await invoke<string[]>("cmd_get_directory_images", {
        path,
      });

      const images: ImageInfo[] = imagePaths.map((imgPath, index) => ({
        index,
        name:
          imgPath.split("/").pop() ||
          imgPath.split("\\").pop() ||
          `image_${index}`,
        path: imgPath,
      }));

      currentComic.value = {
        path,
        name,
        isZip: false,
        imageCount: images.length,
        images,
      };

      return currentComic.value;
    } catch (e) {
      error.value = String(e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // 打开漫画（ZIP）
  async function openComicFromZip(path: string, name: string) {
    isLoading.value = true;
    loadingProgress.value = 0;
    error.value = null;

    try {
      const zipImages = await invoke<ZipImageInfo[]>("cmd_get_zip_images", {
        path,
      });

      const images: ImageInfo[] = zipImages.map((img, index) => ({
        index,
        name: img.name,
        path: img.path,
      }));

      currentComic.value = {
        path,
        name,
        isZip: true,
        imageCount: images.length,
        images,
      };

      return currentComic.value;
    } catch (e) {
      error.value = String(e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // 打开漫画（自动判断类型）
  async function openComic(path: string, name: string, isZip: boolean) {
    if (isZip) {
      return openComicFromZip(path, name);
    } else {
      return openComicFromFolder(path, name);
    }
  }

  // 加载图片
  async function loadImage(index: number): Promise<string> {
    if (!currentComic.value) {
      throw new Error("没有打开的漫画");
    }

    const image = currentComic.value.images[index];
    if (!image) {
      throw new Error(`图片索引越界: ${index}`);
    }

    // 如果已经加载过，直接返回
    if (image.data) {
      return image.data;
    }

    try {
      let data: string;

      if (currentComic.value.isZip) {
        data = await invoke<string>("cmd_read_zip_image", {
          zipPath: currentComic.value.path,
          imagePath: image.path,
        });
      } else {
        data = await invoke<string>("cmd_read_image", {
          path: image.path,
        });
      }

      // 缓存数据
      currentComic.value.images[index].data = data;

      return data;
    } catch (e) {
      throw new Error(`加载图片失败: ${e}`);
    }
  }

  // 预加载图片
  async function preloadImages(startIndex: number, count: number) {
    if (!currentComic.value) return;

    const tasks: Promise<void>[] = [];

    for (
      let i = startIndex;
      i < startIndex + count && i < currentComic.value.imageCount;
      i++
    ) {
      if (!currentComic.value.images[i].data) {
        tasks.push(
          loadImage(i)
            .then(() => {})
            .catch(() => {
              // 静默处理预加载错误
            }),
        );
      }
    }

    await Promise.all(tasks);
  }

  // 清除当前漫画
  function clearComic() {
    currentComic.value = null;
    loadingProgress.value = 0;
    error.value = null;
  }

  // 清除所有状态
  function clearAll() {
    rootPath.value = null;
    fileTree.value = null;
    currentComic.value = null;
    isLoading.value = false;
    loadingProgress.value = 0;
    error.value = null;
  }

  return {
    // 状态
    rootPath,
    fileTree,
    currentComic,
    isLoading,
    loadingProgress,
    error,
    // 计算属性
    hasComic,
    imageCount,
    // 方法
    scanDirectory,
    openComicFromFolder,
    openComicFromZip,
    openComic,
    loadImage,
    preloadImages,
    clearComic,
    clearAll,
  };
});

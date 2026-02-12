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

  // 扫描目录（降低默认深度以优化性能）
  async function scanDirectory(path: string, maxDepth: number = 5) {
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

  // 加载图片（使用 Blob URL 优化内存）
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
      let blobUrl: string;

      if (currentComic.value.isZip) {
        // 从 ZIP 读取二进制数据
        const bytes = await invoke<number[]>("cmd_read_zip_image_bytes", {
          zipPath: currentComic.value.path,
          imagePath: image.path,
        });
        
        // 创建 Blob 和 URL
        const blob = new Blob([new Uint8Array(bytes)], { type: getMimeType(image.path) });
        blobUrl = URL.createObjectURL(blob);
      } else {
        // 从文件读取二进制数据
        const bytes = await invoke<number[]>("cmd_read_image_bytes", {
          path: image.path,
        });
        
        // 创建 Blob 和 URL
        const blob = new Blob([new Uint8Array(bytes)], { type: getMimeType(image.path) });
        blobUrl = URL.createObjectURL(blob);
      }

      // 缓存 Blob URL
      currentComic.value.images[index].data = blobUrl;

      return blobUrl;
    } catch (e) {
      throw new Error(`加载图片失败: ${e}`);
    }
  }

  // 获取 MIME 类型
  function getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'bmp':
        return 'image/bmp';
      case 'tiff':
      case 'tif':
        return 'image/tiff';
      default:
        return 'image/jpeg';
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

  // 释放指定图片的缓存数据（包括释放 Blob URL）
  function evictImage(index: number) {
    if (!currentComic.value) return;
    const image = currentComic.value.images[index];
    if (image && image.data) {
      // 如果是 Blob URL，需要释放
      if (image.data.startsWith('blob:')) {
        URL.revokeObjectURL(image.data);
      }
      image.data = undefined;
    }
  }

  // 清除当前漫画（释放所有 Blob URL）
  function clearComic() {
    if (currentComic.value) {
      // 释放所有 Blob URL
      currentComic.value.images.forEach((img) => {
        if (img.data && img.data.startsWith('blob:')) {
          URL.revokeObjectURL(img.data);
        }
      });
    }
    currentComic.value = null;
    loadingProgress.value = 0;
    error.value = null;
  }

  // 清除所有状态（释放所有 Blob URL）
  function clearAll() {
    if (currentComic.value) {
      // 释放所有 Blob URL
      currentComic.value.images.forEach((img) => {
        if (img.data && img.data.startsWith('blob:')) {
          URL.revokeObjectURL(img.data);
        }
      });
    }
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
    evictImage,
    clearComic,
    clearAll,
  };
});

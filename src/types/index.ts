// 文件节点
export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  isComic: boolean;
  isZip: boolean;
  imageCount: number;
  children?: FileNode[];
}

// ZIP 图片信息
export interface ZipImageInfo {
  index: number;
  name: string;
  path: string;
  size: number;
}

// 图片信息
export interface ImageInfo {
  index: number;
  name: string;
  path: string;
  width?: number;
  height?: number;
  data?: string;
}

// 图片块（用于大图分块）
export interface ImageChunk {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data: string;
}

// 漫画信息
export interface ComicInfo {
  path: string;
  name: string;
  isZip: boolean;
  imageCount: number;
  images: ImageInfo[];
}

// 阅读进度
export interface ReadingProgress {
  comicPath: string;
  lastImageIndex: number;
  scrollPosition: number;
  lastReadTime: number;
}

// 书签
export interface Bookmark {
  id: string;
  comicPath: string;
  comicName: string;
  imageIndex: number;
  createdAt: number;
  note?: string;
}

// 主题类型
export type Theme = "light" | "dark" | "system";

// 缩放模式
export type ZoomMode = "fit-width" | "fit-height" | "original" | "custom";

// 阅读器显示模式
export type ReaderMode = "embedded" | "fullscreen";

// 图片比例预设
export type AspectRatio = "auto" | "3:4" | "9:16" | "1:1" | "4:3" | "16:9" | "custom";

// 设置
export interface Settings {
  theme: Theme;
  zoomMode: ZoomMode;
  customZoom: number;
  preloadCount: number;
  readerMode: ReaderMode;
  aspectRatio: AspectRatio;
  customAspectWidth: number;
  customAspectHeight: number;
}

// 应用数据
export interface AppData {
  settings: Settings;
  progress: Record<string, ReadingProgress>;
  bookmarks: Bookmark[];
  lastOpenedPath?: string;
}

// 默认设置
export const defaultSettings: Settings = {
  theme: "system",
  zoomMode: "fit-width",
  customZoom: 100,
  preloadCount: 3,
  readerMode: "embedded",
  aspectRatio: "auto",
  customAspectWidth: 3,
  customAspectHeight: 4,
};

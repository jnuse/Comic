import { defineStore } from "pinia";
import { ref, watch, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import type {
  Settings,
  Theme,
  ZoomMode,
  ReaderMode,
  AspectRatio,
} from "../types";
import { defaultSettings } from "../types";
import { usePreferredDark } from "@vueuse/core";

export const useSettingsStore = defineStore("settings", () => {
  // 状态
  const settings = ref<Settings>({ ...defaultSettings });
  const isLoading = ref(false);

  // 系统暗色模式
  const prefersDark = usePreferredDark();

  // 计算实际主题
  const actualTheme = computed<"light" | "dark">(() => {
    if (settings.value.theme === "system") {
      return prefersDark.value ? "dark" : "light";
    }
    return settings.value.theme;
  });

  // 是否为暗色模式
  const isDark = computed(() => actualTheme.value === "dark");

  // 加载设置
  async function loadSettings() {
    isLoading.value = true;
    try {
      const data = await invoke<Settings>("cmd_get_settings");
      settings.value = { ...defaultSettings, ...data };
    } catch (e) {
      console.error("加载设置失败:", e);
      // 使用默认设置
      settings.value = { ...defaultSettings };
    } finally {
      isLoading.value = false;
    }
  }

  // 保存设置
  async function saveSettings() {
    try {
      await invoke("cmd_save_settings", { settings: settings.value });
    } catch (e) {
      console.error("保存设置失败:", e);
    }
  }

  // 设置主题
  function setTheme(theme: Theme) {
    settings.value.theme = theme;
    saveSettings();
  }

  // 设置缩放模式
  function setZoomMode(mode: ZoomMode) {
    settings.value.zoomMode = mode;
    saveSettings();
  }

  // 设置自定义缩放
  function setCustomZoom(zoom: number) {
    settings.value.customZoom = Math.max(10, Math.min(500, zoom));
    saveSettings();
  }

  // 设置预加载数量
  function setPreloadCount(count: number) {
    settings.value.preloadCount = Math.max(0, Math.min(50, count));
    saveSettings();
  }

  // 设置阅读器模式
  function setReaderMode(mode: ReaderMode) {
    settings.value.readerMode = mode;
    saveSettings();
  }

  // 设置图片比例
  function setAspectRatio(ratio: AspectRatio) {
    settings.value.aspectRatio = ratio;
    saveSettings();
  }

  // 设置自定义比例
  function setCustomAspectRatio(width: number, height: number) {
    settings.value.customAspectWidth = Math.max(1, Math.min(100, width));
    settings.value.customAspectHeight = Math.max(1, Math.min(100, height));
    saveSettings();
  }

  // 监听主题变化，应用到 HTML
  watch(
    actualTheme,
    (theme) => {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },
    { immediate: true },
  );

  return {
    // 状态
    settings,
    isLoading,
    // 计算属性
    actualTheme,
    isDark,
    // 方法
    loadSettings,
    saveSettings,
    setTheme,
    setZoomMode,
    setCustomZoom,
    setPreloadCount,
    setReaderMode,
    setAspectRatio,
    setCustomAspectRatio,
  };
});

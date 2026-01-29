<template>
    <div class="settings-panel">
        <div class="panel-header">
            <h3>⚙️ 设置</h3>
            <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="settings-content">
            <!-- 主题设置 -->
            <div class="setting-group">
                <label class="setting-label">主题</label>
                <div class="setting-options">
                    <button v-for="option in themeOptions" :key="option.value" class="option-btn"
                        :class="{ active: settings.theme === option.value }"
                        @click="settingsStore.setTheme(option.value)">
                        {{ option.icon }} {{ option.label }}
                    </button>
                </div>
            </div>

            <!-- 缩放模式 -->
            <div class="setting-group">
                <label class="setting-label">缩放模式</label>
                <div class="setting-options">
                    <button v-for="option in zoomOptions" :key="option.value" class="option-btn"
                        :class="{ active: settings.zoomMode === option.value }"
                        @click="settingsStore.setZoomMode(option.value)">
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <!-- 自定义缩放 -->
            <div class="setting-group" v-if="settings.zoomMode === 'custom'">
                <label class="setting-label">缩放比例</label>
                <div class="slider-group">
                    <input type="range" min="10" max="500" :value="settings.customZoom" @input="handleZoomChange"
                        class="zoom-slider" />
                    <span class="zoom-value">{{ Math.round(settings.customZoom) }}%</span>
                </div>
            </div>

            <!-- 预加载数量 -->
            <div class="setting-group">
                <label class="setting-label">预加载图片数量</label>
                <div class="slider-group">
                    <input type="range" min="0" max="10" :value="settings.preloadCount" @input="handlePreloadChange"
                        class="preload-slider" />
                    <span class="preload-value">{{ settings.preloadCount }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '../stores';
import type { Theme, ZoomMode } from '../types';

defineEmits<{
    (e: 'close'): void;
}>();

const settingsStore = useSettingsStore();
const settings = computed(() => settingsStore.settings);

const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: '浅色', icon: '☀️' },
    { value: 'dark', label: '深色', icon: '🌙' },
    { value: 'system', label: '系统', icon: '💻' },
];

const zoomOptions: { value: ZoomMode; label: string }[] = [
    { value: 'fit-width', label: '适应宽度' },
    { value: 'fit-height', label: '适应高度' },
    { value: 'original', label: '原始尺寸' },
    { value: 'custom', label: '自定义' },
];

function handleZoomChange(event: Event) {
    const target = event.target as HTMLInputElement;
    settingsStore.setCustomZoom(Number(target.value));
}

function handlePreloadChange(event: Event) {
    const target = event.target as HTMLInputElement;
    settingsStore.setPreloadCount(Number(target.value));
}
</script>

<style scoped>
.settings-panel {
    width: 320px;
    background-color: var(--panel-bg);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    height: 100%;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
    margin: 0;
    font-size: 16px;
}

.close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s;
}

.close-btn:hover {
    opacity: 1;
}

.settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.setting-group {
    margin-bottom: 24px;
}

.setting-label {
    display: block;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--text-color);
}

.setting-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.option-btn {
    padding: 8px 16px;
    border: 1px solid var(--border-color);
    background-color: var(--btn-bg);
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
}

.option-btn:hover {
    background-color: var(--btn-hover-bg);
}

.option-btn.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}

.slider-group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.zoom-slider,
.preload-slider {
    flex: 1;
    height: 4px;
    appearance: none;
    background-color: var(--slider-bg);
    border-radius: 2px;
    cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb,
.preload-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background-color: var(--primary-color);
    border-radius: 50%;
    cursor: pointer;
}

.zoom-value,
.preload-value {
    min-width: 50px;
    text-align: right;
    font-weight: 500;
}
</style>

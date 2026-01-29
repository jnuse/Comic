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

            <!-- 阅读模式 -->
            <div class="setting-group">
                <label class="setting-label">阅读模式</label>
                <div class="setting-options">
                    <button v-for="option in readerModeOptions" :key="option.value" class="option-btn"
                        :class="{ active: settings.readerMode === option.value }"
                        @click="settingsStore.setReaderMode(option.value)">
                        {{ option.icon }} {{ option.label }}
                    </button>
                </div>
                <p class="setting-hint">嵌入模式：保留文件树以便快速切换漫画</p>
            </div>

            <!-- 图片宽高比 -->
            <div class="setting-group">
                <label class="setting-label">图片显示比例</label>
                <div class="setting-options">
                    <button v-for="option in aspectRatioOptions" :key="option.value" class="option-btn"
                        :class="{ active: settings.aspectRatio === option.value }"
                        @click="settingsStore.setAspectRatio(option.value)">
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <!-- 自定义宽高比 -->
            <div class="setting-group" v-if="settings.aspectRatio === 'custom'">
                <label class="setting-label">自定义比例</label>
                <div class="custom-aspect-group">
                    <input type="number" min="1" max="100" :value="settings.customAspectWidth"
                        @input="handleCustomAspectWidthChange" class="aspect-input" placeholder="宽" />
                    <span class="aspect-separator">:</span>
                    <input type="number" min="1" max="100" :value="settings.customAspectHeight"
                        @input="handleCustomAspectHeightChange" class="aspect-input" placeholder="高" />
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
import type { Theme, ZoomMode, ReaderMode, AspectRatio } from '../types';

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

const readerModeOptions: { value: ReaderMode; label: string; icon: string }[] = [
    { value: 'embedded', label: '嵌入', icon: '📑' },
    { value: 'fullscreen', label: '全屏', icon: '🖥️' },
];

const aspectRatioOptions: { value: AspectRatio; label: string }[] = [
    { value: 'auto', label: '自动' },
    { value: '3:4', label: '3:4' },
    { value: '9:16', label: '9:16' },
    { value: '1:1', label: '1:1' },
    { value: '4:3', label: '4:3' },
    { value: '16:9', label: '16:9' },
    { value: 'custom', label: '自定义' },
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

function handleCustomAspectWidthChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const width = Number(target.value) || 3;
    settingsStore.setCustomAspectRatio(width, settings.value.customAspectHeight);
}

function handleCustomAspectHeightChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const height = Number(target.value) || 4;
    settingsStore.setCustomAspectRatio(settings.value.customAspectWidth, height);
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

.setting-hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 8px;
    margin-bottom: 0;
}

.custom-aspect-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.aspect-input {
    width: 60px;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;
    text-align: center;
}

.aspect-input:focus {
    outline: none;
    border-color: var(--primary-color);
}

.aspect-separator {
    font-weight: bold;
    font-size: 16px;
}
</style>

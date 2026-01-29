<template>
    <div ref="viewerRef" class="comic-viewer"
        :class="{ 'zoom-fit-width': zoomMode === 'fit-width', 'zoom-fit-height': zoomMode === 'fit-height', 'zoom-original': zoomMode === 'original' }"
        @scroll="handleScroll">
        <!-- 加载中 -->
        <div v-if="isLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
        </div>

        <!-- 图片列表 -->
        <div class="images-container" :style="{ width: containerWidth }">
            <div v-for="(image, index) in images" :key="image.path" :ref="(el) => setImageRef(index, el as HTMLElement)"
                class="image-wrapper" :data-index="index">
                <img v-if="loadedImages[index]" :src="loadedImages[index]" :alt="image.name" class="comic-image"
                    @load="handleImageLoad(index)" @error="handleImageError(index)" />
                <div v-else class="image-placeholder">
                    <span>{{ index + 1 }} / {{ images.length }}</span>
                    <span class="image-name">{{ image.name }}</span>
                </div>

                <!-- 书签指示器 -->
                <div v-if="isBookmarked(index)" class="bookmark-indicator" title="已添加书签">
                    🔖
                </div>
            </div>
        </div>

        <!-- 悬浮工具栏 -->
        <div class="floating-toolbar">
            <!-- 进度显示 -->
            <div class="progress-info">
                {{ currentImageIndex + 1 }} / {{ images.length }}
            </div>

            <!-- 书签按钮 -->
            <button class="toolbar-btn" :class="{ active: isCurrentBookmarked }" @click="toggleCurrentBookmark"
                title="添加/移除书签">
                {{ isCurrentBookmarked ? '🔖' : '📑' }}
            </button>

            <!-- 缩放控制 -->
            <div class="zoom-controls">
                <button class="toolbar-btn" @click="$emit('zoom-out')" title="缩小">
                    ➖
                </button>
                <span class="zoom-value">{{ Math.round(customZoom) }}%</span>
                <button class="toolbar-btn" @click="$emit('zoom-in')" title="放大">
                    ➕
                </button>
            </div>

            <!-- 返回按钮 -->
            <button class="toolbar-btn" @click="$emit('close')" title="返回">
                ✖️
            </button>
        </div>

        <!-- 进度条 -->
        <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import type { ImageInfo, ZoomMode } from '../types';
import { useComicStore, useBookmarkStore, useProgressStore } from '../stores';
import { useDebounceFn, useThrottleFn } from '@vueuse/core';

const props = defineProps<{
    images: ImageInfo[];
    comicPath: string;
    comicName: string;
    zoomMode: ZoomMode;
    customZoom: number;
    preloadCount: number;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'zoom-in'): void;
    (e: 'zoom-out'): void;
    (e: 'image-change', index: number): void;
}>();

const comicStore = useComicStore();
const bookmarkStore = useBookmarkStore();
const progressStore = useProgressStore();

// Refs
const viewerRef = ref<HTMLElement | null>(null);
const imageRefs = ref<Map<number, HTMLElement>>(new Map());

// 状态
const isLoading = ref(false);
const loadedImages = ref<Record<number, string>>({});
const currentImageIndex = ref(0);
const scrollPosition = ref(0);

// 计算属性
const containerWidth = computed(() => {
    switch (props.zoomMode) {
        case 'fit-width':
            return '100%';
        case 'fit-height':
            return 'auto';
        case 'original':
            return 'auto';
        case 'custom':
            return `${props.customZoom}%`;
        default:
            return '100%';
    }
});

const progressPercent = computed(() => {
    if (props.images.length === 0) return 0;
    return ((currentImageIndex.value + 1) / props.images.length) * 100;
});

const isCurrentBookmarked = computed(() =>
    bookmarkStore.isBookmarked(props.comicPath, currentImageIndex.value)
);

// 方法
function setImageRef(index: number, el: HTMLElement | null) {
    if (el) {
        imageRefs.value.set(index, el);
    } else {
        imageRefs.value.delete(index);
    }
}

function isBookmarked(index: number): boolean {
    return bookmarkStore.isBookmarked(props.comicPath, index);
}

async function toggleCurrentBookmark() {
    await bookmarkStore.toggleBookmark(
        props.comicPath,
        props.comicName,
        currentImageIndex.value
    );
}

async function loadImage(index: number) {
    if (loadedImages.value[index] || index < 0 || index >= props.images.length) {
        return;
    }

    try {
        const data = await comicStore.loadImage(index);
        loadedImages.value[index] = data;
    } catch (e) {
        console.error(`加载图片 ${index} 失败:`, e);
    }
}

async function loadVisibleImages() {
    if (!viewerRef.value) return;

    const container = viewerRef.value;
    const viewportHeight = container.clientHeight;

    // 找出当前可见的图片
    let visibleStartIndex = -1;
    let visibleEndIndex = -1;

    for (let i = 0; i < props.images.length; i++) {
        const el = imageRefs.value.get(i);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const relativeTop = rect.top - containerRect.top;
        const relativeBottom = rect.bottom - containerRect.top;

        if (relativeBottom > 0 && relativeTop < viewportHeight) {
            if (visibleStartIndex === -1) visibleStartIndex = i;
            visibleEndIndex = i;
        }
    }

    if (visibleStartIndex === -1) {
        visibleStartIndex = 0;
        visibleEndIndex = 0;
    }

    // 更新当前图片索引（取中间的）
    const middleIndex = Math.floor((visibleStartIndex + visibleEndIndex) / 2);
    if (middleIndex !== currentImageIndex.value) {
        currentImageIndex.value = middleIndex;
        emit('image-change', middleIndex);
    }

    // 加载可见图片和预加载
    const preloadStart = Math.max(0, visibleStartIndex - props.preloadCount);
    const preloadEnd = Math.min(props.images.length - 1, visibleEndIndex + props.preloadCount);

    for (let i = preloadStart; i <= preloadEnd; i++) {
        await loadImage(i);
    }
}

// 节流的加载函数
const throttledLoadImages = useThrottleFn(loadVisibleImages, 100);

// 防抖的保存进度
const debouncedSaveProgress = useDebounceFn(() => {
    progressStore.saveProgress(
        props.comicPath,
        currentImageIndex.value,
        scrollPosition.value
    );
}, 1000);

function handleScroll() {
    if (!viewerRef.value) return;
    scrollPosition.value = viewerRef.value.scrollTop;
    throttledLoadImages();
    debouncedSaveProgress();
}

function handleImageLoad(_index: number) {
    // 图片加载完成后可能需要重新计算布局
}

function handleImageError(index: number) {
    console.error(`图片 ${index} 加载错误`);
}

// 跳转到指定图片
async function scrollToImage(index: number) {
    await nextTick();
    const el = imageRefs.value.get(index);
    if (el && viewerRef.value) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 跳转到指定滚动位置
async function scrollToPosition(position: number) {
    await nextTick();
    if (viewerRef.value) {
        viewerRef.value.scrollTop = position;
    }
}

// 恢复阅读进度
async function restoreProgress() {
    const progress = await progressStore.getProgress(props.comicPath);
    if (progress) {
        currentImageIndex.value = progress.lastImageIndex;

        // 先加载目标图片
        await loadImage(progress.lastImageIndex);

        // 然后滚动到位置
        await nextTick();
        if (progress.scrollPosition > 0) {
            await scrollToPosition(progress.scrollPosition);
        } else {
            await scrollToImage(progress.lastImageIndex);
        }
    }
}

// 初始化
onMounted(async () => {
    isLoading.value = true;

    // 先加载前几张图片
    for (let i = 0; i < Math.min(3, props.images.length); i++) {
        await loadImage(i);
    }

    isLoading.value = false;

    // 恢复进度
    await restoreProgress();

    // 继续加载可见图片
    throttledLoadImages();
});

// 清理
onUnmounted(() => {
    // 保存最终进度
    progressStore.saveProgress(
        props.comicPath,
        currentImageIndex.value,
        scrollPosition.value
    );
});

// 暴露方法
defineExpose({
    scrollToImage,
    scrollToPosition,
    currentImageIndex,
});
</script>

<style scoped>
.comic-viewer {
    position: relative;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--viewer-bg);
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    z-index: 100;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.images-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 auto;
    padding-bottom: 60px;
}

.image-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
}

.comic-image {
    max-width: 100%;
    height: auto;
    display: block;
}

.zoom-fit-width .comic-image {
    width: 100%;
}

.zoom-fit-height .comic-image {
    height: 100vh;
    width: auto;
}

.zoom-original .comic-image {
    width: auto;
    max-width: none;
}

.image-placeholder {
    width: 100%;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: var(--placeholder-bg);
    color: var(--text-muted);
}

.image-name {
    font-size: 12px;
    margin-top: 8px;
    opacity: 0.6;
}

.bookmark-indicator {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 24px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

/* 悬浮工具栏 */
.floating-toolbar {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background-color: var(--toolbar-bg);
    border-radius: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 50;
}

.progress-info {
    font-size: 14px;
    font-weight: 500;
    min-width: 60px;
    text-align: center;
}

.toolbar-btn {
    width: 36px;
    height: 36px;
    border: none;
    background-color: transparent;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s;
}

.toolbar-btn:hover {
    background-color: var(--hover-bg);
}

.toolbar-btn.active {
    background-color: var(--primary-bg);
}

.zoom-controls {
    display: flex;
    align-items: center;
    gap: 4px;
}

.zoom-value {
    font-size: 12px;
    min-width: 40px;
    text-align: center;
}

/* 进度条 */
.progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background-color: var(--progress-bg);
    z-index: 50;
}

.progress-fill {
    height: 100%;
    background-color: var(--primary-color);
    transition: width 0.2s;
}
</style>

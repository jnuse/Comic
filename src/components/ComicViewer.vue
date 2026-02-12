<template>
    <div ref="viewerRef" class="comic-viewer"
        :class="{ 
            'zoom-fit-width': zoomMode === 'fit-width', 
            'zoom-fit-height': zoomMode === 'fit-height', 
            'zoom-original': zoomMode === 'original',
            'is-fullscreen': isFullscreen 
        }"
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
                    :style="aspectRatioStyle"
                    @load="handleImageLoad(index)" @error="handleImageError(index)" />
                <div v-else class="image-placeholder" :style="aspectRatioStyle">
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
            <!-- 翻页控制 -->
            <button class="toolbar-btn" @click="goToPrevPage" :disabled="currentImageIndex <= 0" title="上一页 (↑)">
                ⬆️
            </button>

            <!-- 进度显示/编辑 -->
            <div class="progress-info" v-if="!isEditingPage" @click="startEditPage" title="点击跳转到指定页">
                {{ currentImageIndex + 1 }} / {{ images.length }}
            </div>
            <div class="page-editor" v-else>
                <input 
                    ref="pageInputRef"
                    type="number" 
                    v-model.number="editPageNumber" 
                    :min="1" 
                    :max="images.length"
                    @keydown.enter="confirmPageJump"
                    @keydown.escape="cancelEditPage"
                    @blur="confirmPageJump"
                    class="page-input"
                />
                <span class="page-total">/ {{ images.length }}</span>
            </div>

            <!-- 下一页 -->
            <button class="toolbar-btn" @click="goToNextPage" :disabled="currentImageIndex >= images.length - 1" title="下一页 (↓)">
                ⬇️
            </button>

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

            <!-- 全屏切换按钮 -->
            <button class="toolbar-btn" @click="$emit('toggle-fullscreen')" :title="isFullscreen ? '嵌入模式' : '全屏模式'">
                {{ isFullscreen ? '🗗' : '🗖' }}
            </button>

            <!-- 返回按钮 -->
            <button class="toolbar-btn" @click="$emit('close')" title="关闭漫画">
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import type { ImageInfo, ZoomMode, AspectRatio } from '../types';
import { useComicStore, useBookmarkStore, useProgressStore } from '../stores';
import { useDebounceFn, useThrottleFn } from '@vueuse/core';

const props = defineProps<{
    images: ImageInfo[];
    comicPath: string;
    comicName: string;
    zoomMode: ZoomMode;
    customZoom: number;
    preloadCount: number;
    aspectRatio: AspectRatio;
    customAspectWidth: number;
    customAspectHeight: number;
    isFullscreen: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'zoom-in'): void;
    (e: 'zoom-out'): void;
    (e: 'toggle-fullscreen'): void;
    (e: 'image-change', index: number): void;
    (e: 'restore-zoom', zoomMode: string, customZoom: number): void;
}>();

const comicStore = useComicStore();
const bookmarkStore = useBookmarkStore();
const progressStore = useProgressStore();

// Refs
const viewerRef = ref<HTMLElement | null>(null);
const imageRefs = ref<Map<number, HTMLElement>>(new Map());
const pageInputRef = ref<HTMLInputElement | null>(null);

// 状态
const isLoading = ref(false);
const loadedImages = ref<Record<number, string>>({});
const currentImageIndex = ref(0);
const scrollPosition = ref(0);
const isZooming = ref(false); // 标记是否正在缩放
const isEditingPage = ref(false); // 是否正在编辑页码
const editPageNumber = ref(1); // 编辑中的页码

// IntersectionObserver 相关
const visibleSet = ref<Set<number>>(new Set());
const observer = ref<IntersectionObserver | null>(null);

// 监听漫画切换，重置阅读器状态
watch(
    () => props.comicPath,
    async (newPath, oldPath) => {
        if (newPath !== oldPath && oldPath) {
            // 保存旧漫画的进度（包括缩放设置）
            progressStore.saveProgress(
                oldPath, 
                currentImageIndex.value, 
                scrollPosition.value,
                props.zoomMode,
                props.customZoom
            );
            
            // 重置状态
            loadedImages.value = {};
            currentImageIndex.value = 0;
            scrollPosition.value = 0;
            imageRefs.value.clear();
            visibleSet.value.clear();
            
            // 滚动到顶部
            if (viewerRef.value) {
                viewerRef.value.scrollTop = 0;
            }
            
            // 加载新漫画
            isLoading.value = true;
            const initialCount = Math.min(3, props.images.length);
            await Promise.all(
                Array.from({ length: initialCount }, (_, i) => loadImage(i))
            );
            isLoading.value = false;
            
            // 恢复新漫画的进度
            await restoreProgress();
        }
    }
);

// 监听缩放变化，保持当前图片位置
watch(
    () => [props.customZoom, props.zoomMode],
    async () => {
        if (isZooming.value) return;
        isZooming.value = true;
        
        // 记住当前图片索引
        const targetIndex = currentImageIndex.value;
        
        // 等待 DOM 更新
        await nextTick();
        
        // 滚动到当前图片
        const el = imageRefs.value.get(targetIndex);
        if (el && viewerRef.value) {
            el.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
        
        // 延迟重置标记，避免滚动事件干扰
        setTimeout(() => {
            isZooming.value = false;
        }, 100);
    }
);

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

// 计算宽高比样式
const aspectRatioStyle = computed(() => {
    if (props.aspectRatio === 'auto') {
        return {};
    }

    let width: number, height: number;

    switch (props.aspectRatio) {
        case '3:4':
            width = 3; height = 4;
            break;
        case '9:16':
            width = 9; height = 16;
            break;
        case '1:1':
            width = 1; height = 1;
            break;
        case '4:3':
            width = 4; height = 3;
            break;
        case '16:9':
            width = 16; height = 9;
            break;
        case 'custom':
            width = props.customAspectWidth || 3;
            height = props.customAspectHeight || 4;
            break;
        default:
            return {};
    }

    return {
        aspectRatio: `${width} / ${height}`,
        objectFit: 'contain' as const,
    };
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
        // 开始观察这个元素
        if (observer.value) {
            observer.value.observe(el);
        }
    } else {
        const oldEl = imageRefs.value.get(index);
        if (oldEl && observer.value) {
            observer.value.unobserve(oldEl);
        }
        imageRefs.value.delete(index);
        visibleSet.value.delete(index);
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

    // 从 visibleSet 获取可见范围
    const visibleIndices = Array.from(visibleSet.value).sort((a, b) => a - b);

    let visibleStartIndex = visibleIndices[0] ?? 0;
    let visibleEndIndex = visibleIndices[visibleIndices.length - 1] ?? 0;

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

    // 释放远离视口的图片数据，防止内存无限增长
    const keepStart = Math.max(0, visibleStartIndex - props.preloadCount * 2);
    const keepEnd = Math.min(props.images.length - 1, visibleEndIndex + props.preloadCount * 2);

    for (const key of Object.keys(loadedImages.value)) {
        const idx = Number(key);
        if (idx < keepStart || idx > keepEnd) {
            delete loadedImages.value[idx];
            comicStore.evictImage(idx);
        }
    }
}
        if (idx < keepStart || idx > keepEnd) {
            delete loadedImages.value[idx];
            comicStore.evictImage(idx);
        }
    }
}

// 节流的加载函数
const throttledLoadImages = useThrottleFn(loadVisibleImages, 100);

// 防抖的保存进度（包括缩放设置）
const debouncedSaveProgress = useDebounceFn(() => {
    progressStore.saveProgress(
        props.comicPath,
        currentImageIndex.value,
        scrollPosition.value,
        props.zoomMode,
        props.customZoom
    );
}, 1000);

function handleScroll() {
    if (!viewerRef.value) return;
    scrollPosition.value = viewerRef.value.scrollTop;
    
    // 缩放过程中不更新图片索引
    if (!isZooming.value) {
        throttledLoadImages();
    }
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

        // 恢复缩放设置
        if (progress.zoomMode && progress.customZoom !== undefined) {
            emit('restore-zoom', progress.zoomMode, progress.customZoom);
        }

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

// 上一页
function goToPrevPage() {
    if (currentImageIndex.value > 0) {
        scrollToImage(currentImageIndex.value - 1);
    }
}

// 下一页
function goToNextPage() {
    if (currentImageIndex.value < props.images.length - 1) {
        scrollToImage(currentImageIndex.value + 1);
    }
}

// 开始编辑页码
async function startEditPage() {
    editPageNumber.value = currentImageIndex.value + 1;
    isEditingPage.value = true;
    await nextTick();
    pageInputRef.value?.focus();
    pageInputRef.value?.select();
}

// 确认跳转页码
function confirmPageJump() {
    if (!isEditingPage.value) return;
    
    const targetPage = Math.max(1, Math.min(props.images.length, editPageNumber.value || 1));
    isEditingPage.value = false;
    
    if (targetPage !== currentImageIndex.value + 1) {
        scrollToImage(targetPage - 1);
    }
}

// 取消编辑页码
function cancelEditPage() {
    isEditingPage.value = false;
}

// 键盘事件处理
function handleKeyDown(event: KeyboardEvent) {
    // 忽略输入框中的按键
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
    }
    
    switch (event.key) {
        case 'ArrowUp':
        case 'PageUp':
            event.preventDefault();
            goToPrevPage();
            break;
        case 'ArrowDown':
        case 'PageDown':
            event.preventDefault();
            goToNextPage();
            break;
        case 'Home':
            event.preventDefault();
            scrollToImage(0);
            break;
        case 'End':
            event.preventDefault();
            scrollToImage(props.images.length - 1);
            break;
    }
}

// 初始化
onMounted(async () => {
    isLoading.value = true;

    // 并行加载前几张图片
    const initialCount = Math.min(3, props.images.length);
    await Promise.all(
        Array.from({ length: initialCount }, (_, i) => loadImage(i))
    );

    isLoading.value = false;

    // 恢复进度
    await restoreProgress();

    // 继续加载可见图片
    throttledLoadImages();

    // 创建 IntersectionObserver
    observer.value = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const index = Number(entry.target.getAttribute('data-index'));
                if (entry.isIntersecting) {
                    visibleSet.value.add(index);
                } else {
                    visibleSet.value.delete(index);
                }
            });
            throttledLoadImages();
        },
        {
            root: viewerRef.value,
            threshold: 0.01,
        }
    );

    // 观察所有已渲染的图片容器
    imageRefs.value.forEach((el) => {
        if (observer.value) observer.value.observe(el);
    });

    // 添加键盘监听
    window.addEventListener('keydown', handleKeyDown);
});

// 清理
onUnmounted(() => {
    // 销毁 IntersectionObserver
    if (observer.value) {
        observer.value.disconnect();
        observer.value = null;
    }

    // 移除键盘监听
    window.removeEventListener('keydown', handleKeyDown);
    
    // 保存最终进度（包括缩放设置）
    progressStore.saveProgress(
        props.comicPath,
        currentImageIndex.value,
        scrollPosition.value,
        props.zoomMode,
        props.customZoom
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
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.15s;
}

.progress-info:hover {
    background-color: var(--hover-bg);
}

.page-editor {
    display: flex;
    align-items: center;
    gap: 4px;
}

.page-input {
    width: 50px;
    padding: 4px 6px;
    border: 1px solid var(--primary-color);
    border-radius: 4px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    outline: none;
}

.page-input::-webkit-inner-spin-button,
.page-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.page-input[type=number] {
    -moz-appearance: textfield;
}

.page-total {
    font-size: 14px;
    font-weight: 500;
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

.toolbar-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.toolbar-btn:disabled:hover {
    background-color: transparent;
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

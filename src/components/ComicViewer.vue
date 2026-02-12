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
            <ComicImage
                v-for="(image, index) in images"
                :key="image.path"
                :ref="(el) => scrollManager.setImageRef(index, el as any)"
                :image="image"
                :index="index"
                :total-images="images.length"
                :image-src="imageLoader.loadedImages.value[index]"
                :is-bookmarked="isBookmarked(index)"
                :aspect-ratio-style="aspectRatioStyle"
                @load="handleImageLoad"
                @error="handleImageError"
            />
        </div>

        <!-- 悬浮工具栏 -->
        <ComicToolbar
            :current-page="scrollManager.currentImageIndex.value"
            :total-pages="images.length"
            :is-bookmarked="isCurrentBookmarked"
            :zoom-level="customZoom"
            :is-fullscreen="isFullscreen"
            @prev-page="scrollManager.goToPrevPage()"
            @next-page="scrollManager.goToNextPage(images.length)"
            @toggle-bookmark="toggleCurrentBookmark"
            @zoom-in="$emit('zoom-in')"
            @zoom-out="$emit('zoom-out')"
            @toggle-fullscreen="$emit('toggle-fullscreen')"
            @close="$emit('close')"
            @jump-to-page="scrollManager.scrollToImage"
        />

        <!-- 进度条 -->
        <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import type { ImageInfo, ZoomMode, AspectRatio } from '../types';
import { useBookmarkStore } from '../stores';
import { useImageLoader } from '../composables/useImageLoader';
import { useScrollManager } from '../composables/useScrollManager';
import ComicImage from './ComicImage.vue';
import ComicToolbar from './ComicToolbar.vue';

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

const bookmarkStore = useBookmarkStore();
const imageLoader = useImageLoader();
const scrollManager = useScrollManager(props.comicPath);

// 状态
const isLoading = ref(false);
const { viewerRef } = scrollManager;
let intersectionObserver: IntersectionObserver | null = null;

// 监听漫画切换
watch(
    () => props.comicPath,
    async (newPath, oldPath) => {
        if (newPath !== oldPath && oldPath) {
            // 清理旧状态
            imageLoader.clearAll();
            scrollManager.clear();
            
            if (intersectionObserver) {
                intersectionObserver.disconnect();
                intersectionObserver = null;
            }

            // 加载新漫画
            isLoading.value = true;
            const initialCount = Math.min(3, props.images.length);
            await Promise.all(
                Array.from({ length: initialCount }, (_, i) => 
                    imageLoader.loadImage(i, props.images.length)
                )
            );
            isLoading.value = false;

            // 重新设置 IntersectionObserver
            await nextTick();
            setupIntersectionObserver();

            // 恢复新漫画的进度
            await restoreProgress();
        }
    }
);

// 监听缩放变化
watch(
    () => [props.customZoom, props.zoomMode],
    async () => {
        if (scrollManager.isZooming.value) return;
        scrollManager.isZooming.value = true;

        const targetIndex = scrollManager.currentImageIndex.value;
        await nextTick();
        
        const el = scrollManager.imageRefs.value.get(targetIndex);
        if (el && viewerRef.value) {
            el.scrollIntoView({ behavior: 'instant', block: 'start' });
        }

        setTimeout(() => {
            scrollManager.isZooming.value = false;
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
    return ((scrollManager.currentImageIndex.value + 1) / props.images.length) * 100;
});

const isCurrentBookmarked = computed(() =>
    bookmarkStore.isBookmarked(props.comicPath, scrollManager.currentImageIndex.value)
);

// 方法
function isBookmarked(index: number): boolean {
    return bookmarkStore.isBookmarked(props.comicPath, index);
}

async function toggleCurrentBookmark() {
    await bookmarkStore.toggleBookmark(
        props.comicPath,
        props.comicName,
        scrollManager.currentImageIndex.value
    );
}

// 设置 IntersectionObserver
function setupIntersectionObserver() {
    if (intersectionObserver) {
        intersectionObserver.disconnect();
    }

    const options = {
        root: viewerRef.value,
        rootMargin: `${props.preloadCount * 800}px 0px`,
        threshold: 0
    };

    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const index = Number(entry.target.getAttribute('data-index'));

            if (entry.isIntersecting) {
                // 进入预加载范围，触发加载
                imageLoader.loadImage(index, props.images.length);
            } else {
                // 离开预加载范围，检查是否需要释放内存
                const rect = entry.boundingClientRect;
                const containerRect = entry.rootBounds;
                if (!containerRect) return;

                const farThreshold = props.preloadCount * 800 * 2;
                const isFarAbove = rect.bottom < containerRect.top - farThreshold;
                const isFarBelow = rect.top > containerRect.bottom + farThreshold;

                if (isFarAbove || isFarBelow) {
                    imageLoader.evictImage(index);
                }
            }
        });

        const newIndex = scrollManager.updateCurrentImageIndex();
        if (newIndex !== null && newIndex !== undefined) {
            emit('image-change', newIndex);
        }
    }, options);


    scrollManager.imageRefs.value.forEach((el) => {
        intersectionObserver!.observe(el);
    });
}

function handleScroll() {
    scrollManager.handleScroll(props.zoomMode, props.customZoom);
}

function handleImageLoad(_index: number) {
    // 图片加载完成
}

function handleImageError(index: number) {
    console.error(`图片 ${index} 加载错误`);
}

async function restoreProgress() {
    const result = await scrollManager.restoreProgress(
        (index) => imageLoader.loadImage(index, props.images.length)
    );
    
    if (result?.zoomMode && result.customZoom !== undefined) {
        emit('restore-zoom', result.zoomMode, result.customZoom);
    }
}

// 键盘事件
function handleKeyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
    }

    switch (event.key) {
        case 'ArrowUp':
        case 'PageUp':
            event.preventDefault();
            scrollManager.goToPrevPage();
            break;
        case 'ArrowDown':
        case 'PageDown':
            event.preventDefault();
            scrollManager.goToNextPage(props.images.length);
            break;
        case 'Home':
            event.preventDefault();
            scrollManager.scrollToImage(0);
            break;
        case 'End':
            event.preventDefault();
            scrollManager.scrollToImage(props.images.length - 1);
            break;
    }
}

// 生命周期
onMounted(async () => {
    isLoading.value = true;

    const initialCount = Math.min(3, props.images.length);
    await Promise.all(
        Array.from({ length: initialCount }, (_, i) => 
            imageLoader.loadImage(i, props.images.length)
        )
    );

    isLoading.value = false;
    await restoreProgress();
    await nextTick();
    setupIntersectionObserver();
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
    }
    
    window.removeEventListener('keydown', handleKeyDown);
    imageLoader.clearAll();
});

defineExpose({
    scrollToImage: scrollManager.scrollToImage,
    scrollToPosition: scrollManager.scrollToPosition,
    currentImageIndex: scrollManager.currentImageIndex,
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

.zoom-fit-width :deep(.comic-image) {
    width: 100%;
}

.zoom-fit-height :deep(.comic-image) {
    height: 100vh;
    width: auto;
}

.zoom-original :deep(.comic-image) {
    width: auto;
    max-width: none;
}

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

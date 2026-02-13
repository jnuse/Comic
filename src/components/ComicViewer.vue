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
                :ref="(el: any) => {
                    if (el && el.$el) {
                        scrollManager.setImageRef(index, el.$el);
                    } else {
                        scrollManager.setImageRef(index, null);
                    }
                }"
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
            @prev-page="handlePrevPage"
            @next-page="handleNextPage"
            @toggle-bookmark="toggleCurrentBookmark"
            @zoom-in="$emit('zoom-in')"
            @zoom-out="$emit('zoom-out')"
            @toggle-fullscreen="$emit('toggle-fullscreen')"
            @close="$emit('close')"
            @jump-to-page="handleJumpToPage"
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
const scrollEndTimer = ref<number | null>(null);

// 监听漫画切换
watch(
    () => props.comicPath,
    async (newPath, oldPath) => {
        if (newPath !== oldPath && oldPath) {
            // 清理旧状态
            imageLoader.clearAll();
            scrollManager.clear();

            // 加载新漫画（后台异步加载，不阻塞）
            isLoading.value = true;
            imageLoader.preloadRange(0, props.preloadCount, props.images.length);
            
            // 等待第一张图片加载完成后再隐藏加载提示
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (imageLoader.loadedImages.value[0]) {
                        clearInterval(checkInterval);
                        resolve(null);
                    }
                }, 50);
                
                // 超时保护
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve(null);
                }, 5000);
            });
            
            isLoading.value = false;

            // 恢复新漫画的进度
            await restoreProgress();
        }
    }
);

// 触发懒加载的函数
function triggerLazyLoad() {
    const currentIndex = scrollManager.currentImageIndex.value;
    if (currentIndex !== null && currentIndex !== undefined && !scrollManager.isZooming.value) {
        console.log('[懒加载触发] 滚动结束，当前图片:', currentIndex);
        imageLoader.preloadRange(currentIndex, props.preloadCount, props.images.length);
    }
}

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

// 上一页
function handlePrevPage() {
    console.log('[懒加载触发] 上一页');
    scrollManager.goToPrevPage(() => {
        triggerLazyLoad();
    });
}

// 下一页
function handleNextPage() {
    console.log('[懒加载触发] 下一页');
    scrollManager.goToNextPage(props.images.length, () => {
        triggerLazyLoad();
    });
}

// 跳转到指定页
async function handleJumpToPage(index: number) {
    console.log('[懒加载触发] 跳转到页面', index);
    await scrollManager.scrollToImage(index);
    // 跳转后立即触发懒加载
    setTimeout(() => {
        triggerLazyLoad();
    }, 100);
}

function handleScroll() {
    scrollManager.handleScroll(props.zoomMode, props.customZoom);
    
    // 更新当前图片索引
    const newIndex = scrollManager.updateCurrentImageIndex();
    if (newIndex !== null && newIndex !== undefined) {
        emit('image-change', newIndex);
    }
    
    // 清除之前的定时器
    if (scrollEndTimer.value !== null) {
        clearTimeout(scrollEndTimer.value);
    }
    
    // 设置新的定时器，滚动停止 300ms 后触发懒加载
    scrollEndTimer.value = window.setTimeout(() => {
        triggerLazyLoad();
        scrollEndTimer.value = null;
    }, 300);
}

function handleImageLoad(_index: number) {
    // 图片加载完成
}

function handleImageError(index: number) {
    console.error(`图片 ${index} 加载错误`);
}

async function restoreProgress() {
    const result = await scrollManager.restoreProgress(
        async (index) => {
            // 触发预加载（后台异步执行）
            imageLoader.preloadRange(index, props.preloadCount, props.images.length);
            
            // 等待目标图片加载完成
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (imageLoader.loadedImages.value[index]) {
                        clearInterval(checkInterval);
                        resolve(null);
                    }
                }, 50);
                
                // 超时保护
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve(null);
                }, 5000);
            });
        }
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
            handlePrevPage();
            break;
        case 'ArrowDown':
        case 'PageDown':
            event.preventDefault();
            handleNextPage();
            break;
        case 'Home':
            event.preventDefault();
            handleJumpToPage(0);
            break;
        case 'End':
            event.preventDefault();
            handleJumpToPage(props.images.length - 1);
            break;
    }
}

// 生命周期
onMounted(async () => {
    isLoading.value = true;

    // 触发预加载（后台异步执行）
    imageLoader.preloadRange(0, props.preloadCount, props.images.length);
    
    // 等待第一张图片加载完成
    await new Promise(resolve => {
        const checkInterval = setInterval(() => {
            if (imageLoader.loadedImages.value[0]) {
                clearInterval(checkInterval);
                resolve(null);
            }
        }, 50);
        
        // 超时保护
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve(null);
        }, 5000);
    });

    isLoading.value = false;
    await restoreProgress();
    await nextTick();
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
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

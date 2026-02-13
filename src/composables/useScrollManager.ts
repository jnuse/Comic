import { ref, nextTick } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useProgressStore } from '../stores';
import type { ZoomMode } from '../types';

export function useScrollManager(comicPath: string) {
    const progressStore = useProgressStore();
    
    const viewerRef = ref<HTMLElement | null>(null);
    const imageRefs = ref<Map<number, HTMLElement>>(new Map());
    const currentImageIndex = ref(0);
    const scrollPosition = ref(0);
    const isZooming = ref(false);
    
    // 设置图片引用
    function setImageRef(index: number, el: HTMLElement | null) {
        if (el) {
            imageRefs.value.set(index, el);
        } else {
            imageRefs.value.delete(index);
        }
    }
    
    // 更新当前图片索引（基于视口中心）
    function updateCurrentImageIndex() {
        if (!viewerRef.value || isZooming.value) return;
        
        const container = viewerRef.value;
        const viewportCenter = container.scrollTop + container.clientHeight / 2;
        
        let closestIndex = 0;
        let minDistance = Infinity;
        
        imageRefs.value.forEach((el, index) => {
            const rect = el.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const imageCenter = rect.top - containerRect.top + rect.height / 2 + container.scrollTop;
            const distance = Math.abs(imageCenter - viewportCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });
        
        if (closestIndex !== currentImageIndex.value) {
            currentImageIndex.value = closestIndex;
            return closestIndex;
        }
        
        return null;
    }
    
    // 防抖保存进度
    const debouncedSaveProgress = useDebounceFn((zoomMode: ZoomMode, customZoom: number) => {
        progressStore.saveProgress(comicPath, currentImageIndex.value, scrollPosition.value, zoomMode, customZoom);
    }, 500);
    
    // 处理滚动
    function handleScroll(zoomMode: ZoomMode, customZoom: number) {
        if (!viewerRef.value) return;
        scrollPosition.value = viewerRef.value.scrollTop;
        updateCurrentImageIndex();
        debouncedSaveProgress(zoomMode, customZoom);
    }
    
    // 滚动到指定图片
    async function scrollToImage(index: number) {
        await nextTick();
        const el = imageRefs.value.get(index);
        if (el && viewerRef.value) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // 滚动到指定位置
    async function scrollToPosition(position: number) {
        await nextTick();
        if (viewerRef.value) {
            viewerRef.value.scrollTop = position;
        }
    }
    
    // 恢复阅读进度
    async function restoreProgress(onLoadImage: (index: number) => Promise<void>) {
        const progress = await progressStore.getProgress(comicPath);
        if (progress) {
            currentImageIndex.value = progress.lastImageIndex;
            
            // 先加载目标图片
            await onLoadImage(progress.lastImageIndex);
            
            // 等待 DOM 更新后滚动
            await nextTick();
            await scrollToPosition(progress.scrollPosition);
            
            return { zoomMode: progress.zoomMode, customZoom: progress.customZoom };
        }
        return null;
    }
    
    // 上一页
    function goToPrevPage(onPageChange?: () => void) {
        if (currentImageIndex.value > 0) {
            scrollToImage(currentImageIndex.value - 1);
            // 滚动完成后触发回调
            if (onPageChange) {
                setTimeout(() => {
                    onPageChange();
                }, 100);
            }
        }
    }
    
    // 下一页
    function goToNextPage(totalImages: number, onPageChange?: () => void) {
        if (currentImageIndex.value < totalImages - 1) {
            scrollToImage(currentImageIndex.value + 1);
            // 滚动完成后触发回调
            if (onPageChange) {
                setTimeout(() => {
                    onPageChange();
                }, 100);
            }
        }
    }
    
    // 清理
    function clear() {
        imageRefs.value.clear();
        currentImageIndex.value = 0;
        scrollPosition.value = 0;
        isZooming.value = false;
    }
    
    return {
        viewerRef,
        imageRefs,
        currentImageIndex,
        scrollPosition,
        isZooming,
        setImageRef,
        updateCurrentImageIndex,
        handleScroll,
        scrollToImage,
        scrollToPosition,
        restoreProgress,
        goToPrevPage,
        goToNextPage,
        clear,
    };
}

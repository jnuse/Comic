import { ref } from 'vue';
import { useComicStore } from '../stores';

export function useImageLoader() {
    const comicStore = useComicStore();
    
    // 状态
    const loadedImages = ref<Record<number, string>>({});
    const loadingQueue = ref<Set<number>>(new Set());
    const pendingLoads = ref<Set<number>>(new Set());
    const MAX_CONCURRENT_LOADS = 3;
    
    // 当前图片索引（用于优先级排序）
    let currentImageIndex = 0;
    
    // 设置当前图片索引
    function setCurrentImageIndex(index: number) {
        currentImageIndex = index;
    }
    
    // 加载图片
    async function loadImage(index: number, totalImages: number) {
        if (loadedImages.value[index] || index < 0 || index >= totalImages) {
            return;
        }
        
        if (loadingQueue.value.has(index)) {
            return;
        }
        
        pendingLoads.value.add(index);
        processLoadQueue();
    }
    
    // 处理加载队列
    async function processLoadQueue() {
        if (loadingQueue.value.size >= MAX_CONCURRENT_LOADS) {
            return;
        }
        
        const pendingArray = Array.from(pendingLoads.value);
        if (pendingArray.length === 0) {
            return;
        }
        
        // 优先加载靠近当前图片的索引
        pendingArray.sort((a, b) => {
            const distA = Math.abs(a - currentImageIndex);
            const distB = Math.abs(b - currentImageIndex);
            return distA - distB;
        });
        
        const index = pendingArray[0];
        pendingLoads.value.delete(index);
        
        if (loadedImages.value[index]) {
            processLoadQueue();
            return;
        }
        
        loadingQueue.value.add(index);
        
        try {
            const data = await comicStore.loadImage(index);
            loadedImages.value[index] = data;
        } catch (e) {
            console.error(`加载图片 ${index} 失败:`, e);
        } finally {
            loadingQueue.value.delete(index);
            processLoadQueue();
        }
    }
    
    // 清理不再需要的待加载任务
    function cleanupPendingLoads(visibleIndices: Set<number>) {
        const toRemove: number[] = [];
        
        pendingLoads.value.forEach(index => {
            if (!visibleIndices.has(index)) {
                toRemove.push(index);
            }
        });
        
        toRemove.forEach(index => pendingLoads.value.delete(index));
    }
    
    // 释放图片内存
    function evictImage(index: number) {
        delete loadedImages.value[index];
        comicStore.evictImage(index);
    }
    
    // 清理所有加载状态
    function clearAll() {
        // 释放所有 Blob URL
        Object.values(loadedImages.value).forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        
        loadedImages.value = {};
        loadingQueue.value.clear();
        pendingLoads.value.clear();
    }
    
    return {
        loadedImages,
        loadingQueue,
        pendingLoads,
        setCurrentImageIndex,
        loadImage,
        cleanupPendingLoads,
        evictImage,
        clearAll,
    };
}

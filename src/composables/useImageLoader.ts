import { ref } from 'vue';
import { useComicStore } from '../stores';

export function useImageLoader() {
    const comicStore = useComicStore();
    
    // 状态
    const loadedImages = ref<Record<number, string>>({});
    const loadingStates = ref<Record<number, boolean>>({});  // 追踪加载中的图片
    const errorCounts = ref<Record<number, number>>({});     // 追踪加载失败次数
    
    const MAX_RETRY = 3;  // 最大重试次数
    
    // 加载图片
    async function loadImage(index: number, totalImages: number) {
        // 检查是否已加载、正在加载、或超出范围
        if (loadedImages.value[index] || loadingStates.value[index] || index < 0 || index >= totalImages) {
            return;
        }
        
        // 检查是否已达到最大重试次数
        if (errorCounts.value[index] >= MAX_RETRY) {
            return;
        }

        loadingStates.value[index] = true;  // 标记为加载中

        try {
            const data = await comicStore.loadImage(index);
            
            // 加载完成后检查是否已被取消（用户快速滚动离开）
            if (!loadingStates.value[index]) {
                // 已被取消，释放刚加载的资源
                if (data && data.startsWith('blob:')) {
                    URL.revokeObjectURL(data);
                }
                return;
            }
            
            loadedImages.value[index] = data;
            // 加载成功，清除错误计数
            delete errorCounts.value[index];
        } catch (e) {
            console.error(`加载图片 ${index} 失败:`, e);
            // 增加错误计数
            errorCounts.value[index] = (errorCounts.value[index] || 0) + 1;
        } finally {
            delete loadingStates.value[index];  // 清除加载状态
        }
    }
    
    // 释放图片内存
    function evictImage(index: number) {
        // 如果正在加载，取消加载
        if (loadingStates.value[index]) {
            delete loadingStates.value[index];
        }
        
        delete loadedImages.value[index];
        comicStore.evictImage(index);
    }
    
    // 清理所有加载状态
    function clearAll() {
        // 取消所有正在加载的请求
        loadingStates.value = {};
        
        // 释放所有 Blob URL
        Object.values(loadedImages.value).forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        
        loadedImages.value = {};
        errorCounts.value = {};
    }
    
    return {
        loadedImages,
        loadImage,
        evictImage,
        clearAll,
    };
}

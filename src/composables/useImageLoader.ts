import { ref } from 'vue';
import { useComicStore } from '../stores';

export function useImageLoader() {
    const comicStore = useComicStore();
    
    // 状态
    const loadedImages = ref<Record<number, string>>({});
    
    // 加载图片
    async function loadImage(index: number, totalImages: number) {
        if (loadedImages.value[index] || index < 0 || index >= totalImages) {
            return;
        }

        try {
            const data = await comicStore.loadImage(index);
            loadedImages.value[index] = data;
        } catch (e) {
            console.error(`加载图片 ${index} 失败:`, e);
        }
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
    }
    
    return {
        loadedImages,
        loadImage,
        evictImage,
        clearAll,
    };
}

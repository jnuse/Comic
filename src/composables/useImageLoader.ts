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
        console.log(`[useImageLoader] 调用 loadImage - index: ${index}, 已加载: ${!!loadedImages.value[index]}, 加载中: ${!!loadingStates.value[index]}, 错误次数: ${errorCounts.value[index] || 0}`);
        
        // 检查是否已加载、正在加载、或超出范围
        if (loadedImages.value[index]) {
            console.log(`[useImageLoader] 图片 ${index} 已加载，跳过`);
            return;
        }
        
        if (loadingStates.value[index]) {
            console.log(`[useImageLoader] 图片 ${index} 正在加载中，跳过`);
            return;
        }
        
        if (index < 0 || index >= totalImages) {
            console.warn(`[useImageLoader] 图片 ${index} 超出范围 [0, ${totalImages})`);
            return;
        }
        
        // 检查是否已达到最大重试次数
        if (errorCounts.value[index] >= MAX_RETRY) {
            console.warn(`[useImageLoader] 图片 ${index} 已达到最大重试次数 ${MAX_RETRY}，跳过`);
            return;
        }

        console.log(`[useImageLoader] 开始加载图片 ${index}`);
        loadingStates.value[index] = true;  // 标记为加载中

        try {
            const data = await comicStore.loadImage(index);
            console.log(`[useImageLoader] 图片 ${index} 从 store 加载完成，URL 长度: ${data?.length}, 前缀: ${data?.substring(0, 20)}`);
            
            // 加载完成后检查是否已被取消（用户快速滚动离开）
            if (!loadingStates.value[index]) {
                console.warn(`[useImageLoader] 图片 ${index} 加载已被取消，释放资源`);
                // 已被取消，释放刚加载的资源
                if (data && data.startsWith('blob:')) {
                    URL.revokeObjectURL(data);
                }
                return;
            }
            
            loadedImages.value[index] = data;
            console.log(`[useImageLoader] 图片 ${index} 设置到 loadedImages 成功`);
            // 加载成功，清除错误计数
            delete errorCounts.value[index];
        } catch (e) {
            console.error(`[useImageLoader] 加载图片 ${index} 失败:`, e);
            // 增加错误计数
            errorCounts.value[index] = (errorCounts.value[index] || 0) + 1;
        } finally {
            delete loadingStates.value[index];  // 清除加载状态
            console.log(`[useImageLoader] 图片 ${index} 加载流程结束`);
        }
    }
    
    // 释放图片内存
    function evictImage(index: number) {
        console.log(`[useImageLoader] evictImage 调用 - index: ${index}, 正在加载: ${!!loadingStates.value[index]}, 已加载: ${!!loadedImages.value[index]}`);
        
        // 如果正在加载，取消加载
        if (loadingStates.value[index]) {
            console.warn(`[useImageLoader] 取消正在加载的图片 ${index}`);
            delete loadingStates.value[index];
        }
        
        if (loadedImages.value[index]) {
            console.log(`[useImageLoader] 删除已加载的图片 ${index}`);
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

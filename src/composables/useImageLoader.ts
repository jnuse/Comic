import { ref } from 'vue';
import { useComicStore } from '../stores';

const isDev = import.meta.env.DEV;

export function useImageLoader() {
    const comicStore = useComicStore();
    
    // 状态
    const loadedImages = ref<Record<number, string>>({});
    const loadingStates = ref<Record<number, boolean>>({});  // 追踪加载中的图片
    const errorCounts = ref<Record<number, number>>({});     // 追踪加载失败次数
    const lastPreloadCenter = ref<number>(-1);  // 上次预加载的中心图片索引
    
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
        
        const startTime = isDev ? performance.now() : 0;
        if (isDev) console.log(`[性能] 开始加载图片 ${index}`);

        try {
            const loadStart = isDev ? performance.now() : 0;
            const data = await comicStore.loadImage(index);
            const loadEnd = isDev ? performance.now() : 0;
            if (isDev) console.log(`[性能] 图片 ${index} 后端加载耗时: ${(loadEnd - loadStart).toFixed(2)}ms`);
            
            // 加载完成后检查是否已被取消（用户快速滚动离开）
            if (!loadingStates.value[index]) {
                // 已被取消，释放刚加载的资源
                if (data && data.startsWith('blob:')) {
                    URL.revokeObjectURL(data);
                }
                return;
            }
            
            const assignStart = isDev ? performance.now() : 0;
            loadedImages.value[index] = data;
            const assignEnd = isDev ? performance.now() : 0;
            if (isDev) console.log(`[性能] 图片 ${index} 赋值耗时: ${(assignEnd - assignStart).toFixed(2)}ms`);
            
            // 加载成功，清除错误计数
            delete errorCounts.value[index];
            
            if (isDev) {
                const totalTime = performance.now() - startTime;
                console.log(`[性能] 图片 ${index} 总耗时: ${totalTime.toFixed(2)}ms`);
            }
        } catch (e) {
            console.error(`加载图片 ${index} 失败:`, e);
            // 增加错误计数
            errorCounts.value[index] = (errorCounts.value[index] || 0) + 1;
        } finally {
            delete loadingStates.value[index];  // 清除加载状态
        }
    }
    
    // 按顺序预加载指定范围的图片（后台异步执行，不阻塞 UI）
    function preloadRange(centerIndex: number, preloadCount: number, totalImages: number) {
        // 如果中心图片没变，不重复加载
        if (centerIndex === lastPreloadCenter.value) {
            return;
        }
        
        if (isDev) console.log(`[懒加载] 当前中心图片: ${centerIndex}, 预加载范围: ${Math.max(0, centerIndex - preloadCount)} - ${Math.min(totalImages - 1, centerIndex + preloadCount)}`);
        
        lastPreloadCenter.value = centerIndex;
        
        // 计算需要加载的范围
        const startIndex = Math.max(0, centerIndex - preloadCount);
        const endIndex = Math.min(totalImages - 1, centerIndex + preloadCount);
        
        // 按顺序加载：先加载中心图片，然后交替向上向下加载
        const loadQueue: number[] = [centerIndex];
        
        for (let offset = 1; offset <= preloadCount; offset++) {
            const prevIndex = centerIndex - offset;
            const nextIndex = centerIndex + offset;
            
            // 向上加载
            if (prevIndex >= startIndex) {
                loadQueue.push(prevIndex);
            }
            
            // 向下加载
            if (nextIndex <= endIndex) {
                loadQueue.push(nextIndex);
            }
        }
        
        if (isDev) console.log(`[懒加载] 加载队列:`, loadQueue);
        
        // 在后台异步加载图片，不阻塞 UI
        (async () => {
            for (const index of loadQueue) {
                // 跳过已加载的图片
                if (!loadedImages.value[index] && !loadingStates.value[index]) {
                    if (isDev) console.log(`[懒加载] 正在加载图片 ${index}`);
                    await loadImage(index, totalImages);
                    
                    // 每加载一张图片后让出控制权，避免阻塞 UI
                    await new Promise(resolve => setTimeout(resolve, 0));
                } else {
                    if (isDev) console.log(`[懒加载] 跳过已加载的图片 ${index}`);
                }
            }
            
            // 释放范围外的图片
            evictOutOfRange(startIndex, endIndex);
        })();
    }
    
    // 释放范围外的图片
    function evictOutOfRange(startIndex: number, endIndex: number) {
        const indicesToEvict: number[] = [];
        
        // 找出所有需要释放的图片索引
        Object.keys(loadedImages.value).forEach(key => {
            const index = Number(key);
            if (index < startIndex || index > endIndex) {
                indicesToEvict.push(index);
            }
        });
        
        if (isDev && indicesToEvict.length > 0) {
            console.log(`[懒加载] 释放范围外的图片:`, indicesToEvict);
        }
        
        // 释放这些图片
        indicesToEvict.forEach(index => {
            evictImage(index);
        });
    }
    
    // 释放图片内存
    function evictImage(index: number) {
        // 如果正在加载，取消加载
        if (loadingStates.value[index]) {
            delete loadingStates.value[index];
        }
        
        const url = loadedImages.value[index];
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
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
        lastPreloadCenter.value = -1;
    }
    
    return {
        loadedImages,
        loadImage,
        preloadRange,
        evictImage,
        clearAll,
    };
}

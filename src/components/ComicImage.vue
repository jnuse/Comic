<template>
    <div ref="wrapperRef" class="image-wrapper" :data-index="index">
        <img
            v-if="imageSrc"
            :src="imageSrc"
            :alt="image.name"
            class="comic-image"
            :style="imageStyle"
            decoding="async"
            loading="lazy"
            @load="handleLoad"
            @error="handleError"
        />
        <div v-else class="image-placeholder" :style="placeholderStyle">
            <span>{{ index + 1 }} / {{ totalImages }}</span>
            <span class="image-name">{{ image.name }}</span>
        </div>

        <!-- 书签指示器 -->
        <div v-if="isBookmarked" class="bookmark-indicator" title="已添加书签">
            🔖
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ImageInfo } from '../types';

const isDev = import.meta.env.DEV;

const props = defineProps<{
    image: ImageInfo;
    index: number;
    totalImages: number;
    imageSrc: string | undefined;
    isBookmarked: boolean;
    aspectRatioStyle: Record<string, any>;
}>();

// 计算图片样式（合并用户设置的比例和实际图片尺寸）
const imageStyle = computed(() => {
    return props.aspectRatioStyle;
});

// 计算占位符样式（使用实际图片尺寸预留空间）
const placeholderStyle = computed(() => {
    const style: Record<string, any> = { ...props.aspectRatioStyle };
    
    // 如果有图片尺寸信息，使用实际尺寸设置 aspect-ratio
    if (props.image.width && props.image.height) {
        style.aspectRatio = `${props.image.width} / ${props.image.height}`;
        style.width = '100%';
        style.minHeight = 'auto'; // 移除固定最小高度
    }
    
    return style;
});

const emit = defineEmits<{
    (e: 'load', index: number): void;
    (e: 'error', index: number): void;
}>();

// 根元素引用
const wrapperRef = ref<HTMLElement | null>(null);

// 暴露根元素给父组件
defineExpose({
    $el: wrapperRef
});

function handleLoad() {
    if (isDev) console.log(`[性能-渲染] 图片 ${props.index} 渲染完成`);
    emit('load', props.index);
}

function handleError() {
    console.error(`图片 ${props.index} 加载失败`);
    emit('error', props.index);
}
</script>

<style scoped>
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
</style>

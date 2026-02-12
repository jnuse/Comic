<template>
    <div ref="wrapperRef" class="image-wrapper" :data-index="index">
        <img 
            v-if="imageSrc" 
            :src="imageSrc" 
            :alt="image.name" 
            class="comic-image"
            :style="aspectRatioStyle"
            @load="handleLoad" 
            @error="handleError" 
        />
        <div v-else class="image-placeholder" :style="aspectRatioStyle">
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
import { ref } from 'vue';
import type { ImageInfo } from '../types';

const props = defineProps<{
    image: ImageInfo;
    index: number;
    totalImages: number;
    imageSrc: string | undefined;
    isBookmarked: boolean;
    aspectRatioStyle: Record<string, any>;
}>();

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

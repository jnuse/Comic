<template>
    <div class="image-wrapper" :data-index="index">
        <img 
            v-if="imageSrc" 
            :src="imageSrc" 
            :alt="image.name" 
            class="comic-image"
            :style="aspectRatioStyle"
            @load="$emit('load', index)" 
            @error="$emit('error', index)" 
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
import type { ImageInfo } from '../types';

defineProps<{
    image: ImageInfo;
    index: number;
    totalImages: number;
    imageSrc: string | undefined;
    isBookmarked: boolean;
    aspectRatioStyle: Record<string, any>;
}>();

defineEmits<{
    (e: 'load', index: number): void;
    (e: 'error', index: number): void;
}>();
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

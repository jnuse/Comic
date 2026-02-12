<template>
    <div class="floating-toolbar">
        <!-- 翻页控制 -->
        <button class="toolbar-btn" @click="$emit('prev-page')" :disabled="currentPage <= 0" title="上一页 (↑)">
            ⬆️
        </button>

        <!-- 进度显示/编辑 -->
        <div class="progress-info" v-if="!isEditingPage" @click="startEditPage" title="点击跳转到指定页">
            {{ currentPage + 1 }} / {{ totalPages }}
        </div>
        <div class="page-editor" v-else>
            <input 
                ref="pageInputRef"
                type="number" 
                v-model.number="editPageNumber" 
                :min="1" 
                :max="totalPages"
                @keydown.enter="confirmPageJump"
                @keydown.escape="cancelEditPage"
                @blur="confirmPageJump"
                class="page-input"
            />
            <span class="page-total">/ {{ totalPages }}</span>
        </div>

        <!-- 下一页 -->
        <button class="toolbar-btn" @click="$emit('next-page')" :disabled="currentPage >= totalPages - 1" title="下一页 (↓)">
            ⬇️
        </button>

        <!-- 书签按钮 -->
        <button class="toolbar-btn" :class="{ active: isBookmarked }" @click="$emit('toggle-bookmark')"
            title="添加/移除书签">
            {{ isBookmarked ? '🔖' : '📑' }}
        </button>

        <!-- 缩放控制 -->
        <div class="zoom-controls">
            <button class="toolbar-btn" @click="$emit('zoom-out')" title="缩小">
                ➖
            </button>
            <span class="zoom-value">{{ Math.round(zoomLevel) }}%</span>
            <button class="toolbar-btn" @click="$emit('zoom-in')" title="放大">
                ➕
            </button>
        </div>

        <!-- 全屏切换按钮 -->
        <button class="toolbar-btn" @click="$emit('toggle-fullscreen')" :title="isFullscreen ? '嵌入模式' : '全屏模式'">
            {{ isFullscreen ? '🗗' : '🗖' }}
        </button>

        <!-- 返回按钮 -->
        <button class="toolbar-btn" @click="$emit('close')" title="关闭漫画">
            ✖️
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

const props = defineProps<{
    currentPage: number;
    totalPages: number;
    isBookmarked: boolean;
    zoomLevel: number;
    isFullscreen: boolean;
}>();

const emit = defineEmits<{
    (e: 'prev-page'): void;
    (e: 'next-page'): void;
    (e: 'toggle-bookmark'): void;
    (e: 'zoom-in'): void;
    (e: 'zoom-out'): void;
    (e: 'toggle-fullscreen'): void;
    (e: 'close'): void;
    (e: 'jump-to-page', page: number): void;
}>();

const pageInputRef = ref<HTMLInputElement | null>(null);
const isEditingPage = ref(false);
const editPageNumber = ref(1);

async function startEditPage() {
    editPageNumber.value = props.currentPage + 1;
    isEditingPage.value = true;
    await nextTick();
    pageInputRef.value?.focus();
    pageInputRef.value?.select();
}

function confirmPageJump() {
    if (!isEditingPage.value) return;
    
    const targetPage = Math.max(1, Math.min(props.totalPages, editPageNumber.value || 1));
    isEditingPage.value = false;
    
    if (targetPage !== props.currentPage + 1) {
        emit('jump-to-page', targetPage - 1);
    }
}

function cancelEditPage() {
    isEditingPage.value = false;
}
</script>

<style scoped>
.floating-toolbar {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background-color: var(--toolbar-bg);
    border-radius: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 50;
}

.progress-info {
    font-size: 14px;
    font-weight: 500;
    min-width: 60px;
    text-align: center;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.15s;
}

.progress-info:hover {
    background-color: var(--hover-bg);
}

.page-editor {
    display: flex;
    align-items: center;
    gap: 4px;
}

.page-input {
    width: 50px;
    padding: 4px 6px;
    border: 1px solid var(--primary-color);
    border-radius: 4px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    outline: none;
}

.page-input::-webkit-inner-spin-button,
.page-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.page-input[type=number] {
    -moz-appearance: textfield;
}

.page-total {
    font-size: 14px;
    font-weight: 500;
}

.toolbar-btn {
    width: 36px;
    height: 36px;
    border: none;
    background-color: transparent;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s;
}

.toolbar-btn:hover {
    background-color: var(--hover-bg);
}

.toolbar-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.toolbar-btn:disabled:hover {
    background-color: transparent;
}

.toolbar-btn.active {
    background-color: var(--primary-bg);
}

.zoom-controls {
    display: flex;
    align-items: center;
    gap: 4px;
}

.zoom-value {
    font-size: 12px;
    min-width: 40px;
    text-align: center;
}
</style>

<template>
    <div class="bookmarks-panel">
        <div class="panel-header">
            <h3>📚 书签列表</h3>
            <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="bookmarks-list" v-if="bookmarks.length > 0">
            <div v-for="bookmark in sortedBookmarks" :key="bookmark.id" class="bookmark-item"
                @click="$emit('select', bookmark)">
                <div class="bookmark-info">
                    <span class="comic-name">{{ bookmark.comicName }}</span>
                    <span class="page-info">第 {{ bookmark.imageIndex + 1 }} 页</span>
                    <span class="time-info">{{ formatTime(bookmark.createdAt) }}</span>
                </div>
                <button class="delete-btn" @click.stop="handleDelete(bookmark.id)" title="删除书签">
                    🗑️
                </button>
            </div>
        </div>

        <div v-else class="empty-message">
            暂无书签
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Bookmark } from '../types';
import { useBookmarkStore } from '../stores';

const props = defineProps<{
    bookmarks: Bookmark[];
}>();

defineEmits<{
    (e: 'close'): void;
    (e: 'select', bookmark: Bookmark): void;
}>();

const bookmarkStore = useBookmarkStore();

const sortedBookmarks = computed(() => {
    return [...props.bookmarks].sort((a, b) => b.createdAt - a.createdAt);
});

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

async function handleDelete(id: string) {
    if (confirm('确定要删除这个书签吗？')) {
        await bookmarkStore.removeBookmark(id);
    }
}
</script>

<style scoped>
.bookmarks-panel {
    width: 320px;
    background-color: var(--panel-bg);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    height: 100%;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
    margin: 0;
    font-size: 16px;
}

.close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s;
}

.close-btn:hover {
    opacity: 1;
}

.bookmarks-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
}

.bookmark-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    background-color: var(--item-bg);
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s;
}

.bookmark-item:hover {
    background-color: var(--item-hover-bg);
}

.bookmark-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.comic-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.page-info {
    font-size: 12px;
    color: var(--primary-color);
}

.time-info {
    font-size: 11px;
    color: var(--text-muted);
}

.delete-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.15s;
    padding: 4px;
}

.delete-btn:hover {
    opacity: 1;
}

.empty-message {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
}
</style>

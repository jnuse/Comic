<template>
    <div class="file-tree">
        <FileTreeNode v-if="tree" :node="tree" :expanded-paths="expandedPaths" @toggle="toggleExpand"
            @select="handleSelect" />
        <div v-else class="empty-tree">
            <span>请选择一个文件夹</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FileNode } from '../types';
import FileTreeNode from './FileTreeNode.vue';

defineProps<{
    tree: FileNode | null;
}>();

const emit = defineEmits<{
    (e: 'select', node: FileNode): void;
}>();

const expandedPaths = ref<Set<string>>(new Set());

function toggleExpand(path: string) {
    if (expandedPaths.value.has(path)) {
        expandedPaths.value.delete(path);
    } else {
        expandedPaths.value.add(path);
    }
}

function handleSelect(node: FileNode) {
    emit('select', node);
}

// 展开到指定路径
function expandTo(path: string) {
    const parts = path.split(/[/\\]/);
    let currentPath = '';

    for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        expandedPaths.value.add(currentPath);
    }
}

// 暴露方法
defineExpose({
    expandTo,
    expandedPaths,
});
</script>

<style scoped>
.file-tree {
    font-size: 14px;
    user-select: none;
    overflow-x: auto;
}

.empty-tree {
    color: var(--text-muted);
    padding: 20px;
    text-align: center;
}
</style>

<template>
    <div class="file-tree">
        <template v-if="trees && trees.length > 0">
            <div v-for="tree in trees" :key="tree.path" class="tree-root">
                <div class="root-header">
                    <button class="remove-btn" @click="$emit('remove', tree.path)" title="移除此文件夹">
                        ✕
                    </button>
                    <span class="root-path" :title="tree.path">{{ tree.name }}</span>
                </div>
                <FileTreeNode :node="tree" :expanded-paths="expandedPaths" @toggle="toggleExpand"
                    @select="handleSelect" />
            </div>
        </template>
        <div v-else class="empty-tree">
            <span>请选择一个文件夹</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FileNode } from '../types';
import FileTreeNode from './FileTreeNode.vue';

const props = defineProps<{
    trees: FileNode[];
}>();

const emit = defineEmits<{
    (e: 'select', node: FileNode): void;
    (e: 'remove', path: string): void;
}>();

const expandedPaths = ref<Set<string>>(new Set());

// 监听树的变化，自动展开新添加的根节点
watch(
    () => props.trees,
    (newTrees, oldTrees) => {
        if (!newTrees || newTrees.length === 0) return;
        
        // 找出新添加的树
        const oldPaths = new Set(oldTrees?.map(t => t.path) || []);
        const newRoots = newTrees.filter(t => !oldPaths.has(t.path));
        
        // 自动展开新根节点（第一层）
        newRoots.forEach(root => {
            expandedPaths.value.add(root.path);
        });
    },
    { immediate: true }
);

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

.tree-root {
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 8px;
}

.tree-root:last-child {
    border-bottom: none;
}

.root-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    margin-bottom: 4px;
    background-color: var(--item-bg);
    border-radius: 4px;
}

.remove-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 14px;
    line-height: 1;
    transition: all 0.15s;
}

.remove-btn:hover {
    background-color: var(--hover-bg);
    color: var(--text-color);
}

.root-path {
    flex: 1;
    font-weight: 500;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
}

.empty-tree {
    color: var(--text-muted);
    padding: 20px;
    text-align: center;
}
</style>

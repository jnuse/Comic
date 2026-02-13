<template>
    <div class="file-tree">
        <template v-if="rootNode">
            <FileTreeNode
                :node="rootNode"
                :expanded-paths="expandedPaths"
                :is-root="true"
                @toggle="toggleExpand"
                @select="handleSelect"
                @remove="handleRemove" />
        </template>
        <div v-else class="empty-tree">
            <span>请选择一个文件夹</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FileNode } from '../types';
import FileTreeNode from './FileTreeNode.vue';

const props = defineProps<{
    trees: FileNode[];
}>();

const emit = defineEmits<{
    (e: 'select', node: FileNode): void;
    (e: 'remove', path: string): void;
}>();

const expandedPaths = ref<Set<string>>(new Set(['__root__']));

// 创建虚拟根节点
const rootNode = computed<FileNode | null>(() => {
    if (!props.trees || props.trees.length === 0) {
        return null;
    }
    
    return {
        name: '所有文件夹',
        path: '__root__',
        isDirectory: true,
        isComic: false,
        isZip: false,
        imageCount: 0,
        children: props.trees,
    };
});

// 监听树的变化，自动展开新添加的根节点
watch(
    () => props.trees,
    (newTrees, oldTrees) => {
        if (!newTrees || newTrees.length === 0) return;
        
        // 确保虚拟根节点始终展开
        expandedPaths.value.add('__root__');
        
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
    // 虚拟根节点不允许折叠
    if (path === '__root__') return;
    
    if (expandedPaths.value.has(path)) {
        expandedPaths.value.delete(path);
    } else {
        expandedPaths.value.add(path);
    }
}

function handleSelect(node: FileNode) {
    emit('select', node);
}

function handleRemove(path: string) {
    emit('remove', path);
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

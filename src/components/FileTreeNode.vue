<template>
    <div class="tree-node">
        <div class="node-content" :class="{
            'is-directory': node.isDirectory,
            'is-comic': node.isComic,
            'is-zip': node.isZip,
        }" @click="handleClick">
            <!-- 展开/折叠图标 -->
            <span v-if="node.isDirectory && node.children && node.children.length > 0" class="expand-icon"
                @click.stop="$emit('toggle', node.path)">
                {{ isExpanded ? '▼' : '▶' }}
            </span>
            <span v-else class="expand-icon-placeholder"></span>

            <!-- 图标 -->
            <span class="node-icon">
                <template v-if="node.isZip">📦</template>
                <template v-else-if="node.isComic">📖</template>
                <template v-else-if="node.isDirectory">📁</template>
                <template v-else>📄</template>
            </span>

            <!-- 名称 -->
            <span class="node-name">{{ node.name }}</span>

            <!-- 图片数量 -->
            <span v-if="node.isComic && node.imageCount > 0" class="image-count">
                ({{ node.imageCount }}张)
            </span>
        </div>

        <!-- 子节点 -->
        <div v-if="isExpanded && node.children" class="node-children">
            <FileTreeNode v-for="child in node.children" :key="child.path" :node="child" :expanded-paths="expandedPaths"
                @toggle="$emit('toggle', $event)" @select="$emit('select', $event)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FileNode } from '../types';

const props = defineProps<{
    node: FileNode;
    expandedPaths: Set<string>;
}>();

const emit = defineEmits<{
    (e: 'toggle', path: string): void;
    (e: 'select', node: FileNode): void;
}>();

const isExpanded = computed(() => props.expandedPaths.has(props.node.path));

function handleClick() {
    if (props.node.isComic) {
        emit('select', props.node);
    } else if (props.node.isDirectory) {
        emit('toggle', props.node.path);
    }
}
</script>

<style scoped>
.tree-node {
    line-height: 1.8;
}

.node-content {
    display: flex;
    align-items: center;
    padding: 2px 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.15s;
}

.node-content:hover {
    background-color: var(--hover-bg);
}

.node-content.is-comic:hover {
    background-color: var(--primary-bg);
}

.expand-icon {
    width: 16px;
    font-size: 10px;
    cursor: pointer;
    opacity: 0.6;
    flex-shrink: 0;
}

.expand-icon-placeholder {
    width: 16px;
    flex-shrink: 0;
}

.node-icon {
    margin-right: 6px;
    font-size: 14px;
    flex-shrink: 0;
}

.node-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.image-count {
    margin-left: 8px;
    font-size: 12px;
    color: var(--text-muted);
    flex-shrink: 0;
}

.node-children {
    margin-left: 16px;
}

/* 漫画节点特殊样式 */
.node-content.is-comic {
    color: var(--primary-color);
}

.node-content.is-zip {
    color: var(--accent-color);
}
</style>

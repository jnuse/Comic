<template>
    <div class="tree-node">
        <div
            class="node-content"
            :class="{
                'is-directory': node.isDirectory,
                'is-comic': node.isComic,
                'is-zip': node.isZip,
                'is-root': isRoot,
            }"
            @click="handleClick"
            @contextmenu.prevent="handleContextMenu">
            <!-- 展开/折叠图标 -->
            <span v-if="node.isDirectory && node.children && node.children.length > 0" class="expand-icon"
                @click.stop="$emit('toggle', node.path)">
                {{ isExpanded ? '▼' : '▶' }}
            </span>
            <span v-else class="expand-icon-placeholder"></span>

            <!-- 图标 -->
            <span class="node-icon">
                <template v-if="isRoot">🗂️</template>
                <template v-else-if="node.isZip">📦</template>
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

        <!-- 右键菜单 -->
        <div v-if="showContextMenu" class="context-menu" :style="contextMenuStyle" @click.stop>
            <div class="context-menu-item" @click="handleRemoveClick">
                <span class="menu-icon">🗑️</span>
                <span>移除此文件夹</span>
            </div>
        </div>

        <!-- 子节点 -->
        <div v-if="isExpanded && node.children" class="node-children">
            <FileTreeNode
                v-for="child in node.children"
                :key="child.path"
                :node="child"
                :expanded-paths="expandedPaths"
                :is-root="false"
                @toggle="$emit('toggle', $event)"
                @select="$emit('select', $event)"
                @remove="$emit('remove', $event)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { FileNode } from '../types';

const props = defineProps<{
    node: FileNode;
    expandedPaths: Set<string>;
    isRoot?: boolean;
}>();

const emit = defineEmits<{
    (e: 'toggle', path: string): void;
    (e: 'select', node: FileNode): void;
    (e: 'remove', path: string): void;
}>();

const isExpanded = computed(() => props.expandedPaths.has(props.node.path));
const showContextMenu = ref(false);
const contextMenuStyle = ref({});

// 判断是否为顶层目录节点（虚拟根节点的直接子节点）
const isTopLevelDirectory = computed(() => {
    return !props.isRoot && props.node.isDirectory && props.node.path !== '__root__';
});

function handleClick() {
    // 关闭右键菜单
    showContextMenu.value = false;
    
    if (props.node.isComic) {
        emit('select', props.node);
    } else if (props.node.isDirectory) {
        emit('toggle', props.node.path);
    }
}

function handleContextMenu(event: MouseEvent) {
    // 只有顶层目录节点才显示右键菜单
    if (!isTopLevelDirectory.value) {
        return;
    }
    
    showContextMenu.value = true;
    contextMenuStyle.value = {
        left: `${event.offsetX}px`,
        top: `${event.offsetY}px`,
    };
}

function handleRemoveClick() {
    showContextMenu.value = false;
    emit('remove', props.node.path);
}

function handleClickOutside() {
    showContextMenu.value = false;
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.tree-node {
    line-height: 1.8;
    position: relative;
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

.node-content.is-root {
    font-weight: 600;
    color: var(--text-color);
    background-color: var(--item-bg);
    padding: 6px 8px;
    margin-bottom: 4px;
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

/* 右键菜单 */
.context-menu {
    position: absolute;
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 4px;
    z-index: 1000;
    min-width: 150px;
}

.context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.15s;
    font-size: 13px;
}

.context-menu-item:hover {
    background-color: var(--hover-bg);
}

.menu-icon {
    font-size: 14px;
    flex-shrink: 0;
}
</style>

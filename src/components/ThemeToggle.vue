<template>
    <button class="theme-toggle" @click="toggleTheme" :title="`当前: ${themeLabel}`">
        <span class="theme-icon">{{ themeIcon }}</span>
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '../stores';
import type { Theme } from '../types';

const settingsStore = useSettingsStore();

const themes: Theme[] = ['light', 'dark', 'system'];

const themeIcon = computed(() => {
    switch (settingsStore.settings.theme) {
        case 'light':
            return '☀️';
        case 'dark':
            return '🌙';
        case 'system':
            return '💻';
        default:
            return '☀️';
    }
});

const themeLabel = computed(() => {
    switch (settingsStore.settings.theme) {
        case 'light':
            return '浅色模式';
        case 'dark':
            return '深色模式';
        case 'system':
            return '跟随系统';
        default:
            return '浅色模式';
    }
});

function toggleTheme() {
    const currentIndex = themes.indexOf(settingsStore.settings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    settingsStore.setTheme(themes[nextIndex]);
}
</script>

<style scoped>
.theme-toggle {
    width: 40px;
    height: 40px;
    border: none;
    background-color: var(--btn-bg);
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s;
}

.theme-toggle:hover {
    background-color: var(--btn-hover-bg);
}

.theme-icon {
    font-size: 20px;
}
</style>

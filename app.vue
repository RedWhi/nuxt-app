<script setup lang="ts">
const draftsStore = useDraftsStore()
</script>

<template>
  <div class="app">
    <div class="app__atmosphere" aria-hidden="true" />
    <!-- Lazy: баннер грузится только если есть черновик для восстановления -->
    <LazyDraftRestorePrompt v-if="draftsStore.showRestorePrompt" />
    <div class="app__content">
      <NuxtPage />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;

  &__atmosphere {
    pointer-events: none;
    position: fixed;
    inset: 0;
    z-index: -1;
    background-image:
      radial-gradient(circle at 12% 18%, rgb(255 255 255 / 70%) 0, transparent 28%),
      radial-gradient(circle at 88% 12%, rgb(1 157 220 / 14%) 0, transparent 34%),
      radial-gradient(circle at 50% 100%, rgb(132 154 174 / 10%) 0, transparent 40%);
    opacity: 0.95;
  }

  &__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: 100%;
  }
}
</style>

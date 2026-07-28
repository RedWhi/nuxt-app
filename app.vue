<script setup lang="ts">
</script>

<template>
  <div class="app">
    <div class="app__atmosphere" aria-hidden="true" />
    <DraftRestorePrompt />
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
      radial-gradient(circle at 12% 18%, rgb(255 255 255 / 55%) 0, transparent 28%),
      radial-gradient(circle at 88% 12%, rgb(31 138 112 / 10%) 0, transparent 32%);
    opacity: 0.9;
  }

  &__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: 100%;
  }
}
</style>

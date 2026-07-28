<script setup lang="ts">
const counterStore = useCounterStore()
</script>

<template>
  <div class="app">
    <NuxtPage />
    <footer class="app__footer">
      <p>Pinia counter: {{ counterStore.count }}</p>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__footer {
    margin-top: auto;
    padding: $spacing-md;
    text-align: center;
    color: $color-text-muted;
    border-top: 1px solid $color-border;
  }
}
</style>

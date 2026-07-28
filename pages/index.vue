<script setup lang="ts">
const counterStore = useCounterStore()

function increment(): void {
  counterStore.increment()
}
</script>

<template>
  <main class="home">
    <h1 class="home__title">Nuxt 3 + TypeScript</h1>
    <p class="home__subtitle">Composition API · Pinia · Vitest · SCSS</p>

    <div class="home__counter">
      <span class="home__count">{{ counterStore.count }}</span>
      <button type="button" class="home__button" @click="increment">
        Increment
      </button>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.home {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;
  text-align: center;

  &__title {
    font-size: 2.5rem;
    font-weight: 700;
    color: $color-primary;
    margin-bottom: $spacing-sm;
  }

  &__subtitle {
    color: $color-text-muted;
    margin-bottom: $spacing-xl;
  }

  &__counter {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__count {
    font-size: 2rem;
    font-weight: 600;
    min-width: 3rem;
  }

  &__button {
    padding: $spacing-sm $spacing-lg;
    background-color: $color-primary;
    color: white;
    border: none;
    border-radius: $radius-md;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: $color-primary-dark;
    }
  }
}
</style>

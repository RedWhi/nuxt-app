<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError & { statusCode?: number }
}>()

const isNotFound = computed(() => props.error?.statusCode === 404)

useHead({
  title: computed(() => (isNotFound.value ? 'Заметка не найдена' : 'Ошибка')),
})

function goHome(): void {
  clearError({ redirect: '/' })
}

function goBack(): void {
  if (import.meta.client && window.history.length > 1) {
    clearError()
    window.history.back()
    return
  }

  goHome()
}
</script>

<template>
  <main class="error-page">
    <p class="error-page__code">
      {{ error?.statusCode || 500 }}
    </p>

    <h1 class="error-page__title">
      <template v-if="isNotFound">
        Заметка не найдена
      </template>
      <template v-else>
        Что-то пошло не так
      </template>
    </h1>

    <p class="error-page__text">
      <template v-if="isNotFound">
        Возможно, заметка была удалена или ссылка устарела.
        Проверьте адрес или вернитесь к списку заметок.
      </template>
      <template v-else>
        {{ error?.statusMessage || error?.message || 'Неизвестная ошибка' }}
      </template>
    </p>

    <div class="error-page__actions">
      <button
        type="button"
        class="error-page__button error-page__button--ghost"
        @click="goBack"
      >
        Назад
      </button>
      <button
        type="button"
        class="error-page__button error-page__button--primary"
        @click="goHome"
      >
        К списку заметок
      </button>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.error-page {
  flex: 1;
  width: min(560px, 100%);
  margin: 0 auto;
  padding: $spacing-xl $spacing-md;
  display: flex;
  flex-direction: column;
  justify-content: center;

  &__code {
    margin: 0;
    font-size: 3.5rem;
    font-weight: 700;
    line-height: 1;
    color: $color-primary;
  }

  &__title {
    margin: $spacing-md 0 $spacing-sm;
    font-size: 1.75rem;
    color: #1e293b;
  }

  &__text {
    margin: 0 0 $spacing-xl;
    color: $color-text-muted;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
  }

  &__button {
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;
    border: 1px solid transparent;
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &--primary {
      background-color: $color-primary;
      color: #fff;

      &:hover {
        background-color: $color-primary-dark;
      }
    }

    &--ghost {
      background: transparent;
      border-color: $color-border;
      color: $color-text-muted;

      &:hover {
        color: #1e293b;
      }
    }
  }
}
</style>

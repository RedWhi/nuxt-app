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
  @include page-shell;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 70vh;
  animation: error-enter 0.3s ease both;

  &__code {
    margin: 0;
    font-family: $font-display;
    font-size: clamp(3rem, 14vw, 4.5rem);
    font-weight: 700;
    line-height: 1;
    color: $color-primary;
  }

  &__title {
    margin: $spacing-md 0 $spacing-sm;
    font-family: $font-display;
    font-size: clamp(1.5rem, 5vw, 2rem);
    color: $color-ink;
  }

  &__text {
    margin: 0 0 $spacing-xl;
    color: $color-text-muted;
    line-height: 1.55;
    max-width: 36rem;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    @include respond-up(sm) {
      flex-direction: row;
    }
  }

  &__button {
    width: 100%;

    @include respond-up(sm) {
      width: auto;
    }

    &--primary {
      @include button-primary;
    }

    &--ghost {
      @include button-ghost;
    }
  }
}

@keyframes error-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-page {
    animation: none;
  }
}
</style>

<script setup lang="ts">
import type { Note } from '~/types/note'
import { displayNoteTitle } from '~/utils/note-validation'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
}>()

const PREVIEW_TODO_LIMIT = 3

const title = computed(() => displayNoteTitle(props.note.title))

const previewTodos = computed(() => props.note.todos.slice(0, PREVIEW_TODO_LIMIT))

const hiddenTodosCount = computed(() =>
  Math.max(0, props.note.todos.length - PREVIEW_TODO_LIMIT),
)
</script>

<template>
  <article class="note-item">
    <div class="note-item__main">
      <h2 class="note-item__title">
        {{ title }}
      </h2>

      <ul
        v-if="previewTodos.length"
        class="note-item__todos"
        aria-label="Список задач"
      >
        <li
          v-for="todo in previewTodos"
          :key="todo.id"
          class="note-item__todo"
          :class="{ 'note-item__todo--done': todo.completed }"
        >
          <span class="note-item__marker" aria-hidden="true">
            {{ todo.completed ? '✓' : '•' }}
          </span>
          <span class="note-item__todo-text">
            {{ todo.text.trim() || 'Пустой пункт' }}
          </span>
        </li>
      </ul>

      <p
        v-else
        class="note-item__empty"
      >
        Нет задач
      </p>

      <p
        v-if="hiddenTodosCount > 0"
        class="note-item__more"
      >
        и ещё {{ hiddenTodosCount }}…
      </p>
    </div>

    <div class="note-item__actions">
      <button
        type="button"
        class="note-item__button note-item__button--ghost"
        @click="emit('edit', note.id)"
      >
        Редактировать
      </button>
      <button
        type="button"
        class="note-item__button note-item__button--danger"
        @click="emit('delete', note.id)"
      >
        Удалить
      </button>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.note-item {
  @include surface;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-lg;
  /* Браузер пропускает layout/paint вне viewport */
  content-visibility: auto;
  contain-intrinsic-size: auto 148px;
  transition:
    border-color $transition-fast,
    box-shadow $transition-fast,
    transform $transition-fast;

  @include respond-up(sm) {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }

  @media (hover: hover) {
    &:hover {
      border-color: $color-border-strong;
      box-shadow: $shadow-md;
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    margin: 0 0 $spacing-sm;
    font-family: $font-display;
    font-size: 1.3rem;
    font-weight: 650;
    color: $color-ink;
  }

  &__todos {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__todo {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;
    color: $color-ink-soft;
    line-height: 1.4;
    font-size: 0.95rem;

    &--done {
      color: $color-text-muted;

      .note-item__todo-text {
        text-decoration: line-through;
      }
    }
  }

  &__marker {
    flex-shrink: 0;
    width: 1rem;
    text-align: center;
    color: $color-primary;
  }

  &__empty,
  &__more {
    margin: $spacing-sm 0 0;
    color: $color-text-muted;
    font-size: 0.9rem;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    width: 100%;

    @include respond-up(sm) {
      width: auto;
      flex-shrink: 0;
      flex-direction: column;
    }
  }

  &__button {
    flex: 1;

    @include respond-up(sm) {
      flex: initial;
    }

    &--ghost {
      @include button-ghost;
      width: 100%;
    }

    &--danger {
      @include button-danger;
      width: 100%;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .note-item {
    transition: none;
  }
}
</style>

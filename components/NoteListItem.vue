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
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: $spacing-md;
  padding: $spacing-lg 0;
  border-bottom: 1px solid $color-border;

  &__main {
    flex: 1;
    min-width: min(100%, 240px);
  }

  &__title {
    margin: 0 0 $spacing-sm;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
  }

  &__todos {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__todo {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;
    color: #334155;
    line-height: 1.4;

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
    color: $color-text-muted;
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
  }

  &__button {
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;
    border: 1px solid transparent;
    font: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;

    &:focus-visible {
      outline: 2px solid rgba($color-primary, 0.45);
      outline-offset: 2px;
    }

    &--ghost {
      background: transparent;
      border-color: $color-border;
      color: #334155;

      &:hover {
        border-color: $color-primary;
        color: $color-primary-dark;
      }
    }

    &--danger {
      background: transparent;
      border-color: #fecaca;
      color: #b91c1c;

      &:hover {
        background: #fef2f2;
        border-color: #f87171;
      }
    }
  }
}
</style>

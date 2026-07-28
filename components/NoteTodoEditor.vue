<script setup lang="ts">
import type { TodoItem } from '~/types/note'
import {
  EMPTY_TODO_ADD_ERROR,
  EMPTY_TODO_TEXT_ERROR,
  normalizeTodoText,
  validateTodoText,
} from '~/utils/note-validation'

const props = defineProps<{
  noteId: string
  todos: TodoItem[]
}>()

const { commit, isApplying } = useHistory()
const notesStore = useNotesStore()
const draftsStore = useDraftsStore()

const newTodoText = ref('')
const addError = ref('')
const fieldErrors = ref<Record<string, string>>({})

function syncDraftFromNote(): void {
  if (isApplying.value) {
    return
  }

  const note = notesStore.getNote(props.noteId)
  if (!note) {
    return
  }

  draftsStore.updateDraft({
    noteId: note.id,
    title: note.title,
    content: note.content,
    todos: note.todos,
  })
}

function clearFieldError(todoId: string): void {
  if (!(todoId in fieldErrors.value)) {
    return
  }

  const next = { ...fieldErrors.value }
  delete next[todoId]
  fieldErrors.value = next
}

function addTodo(): void {
  if (!notesStore.getNote(props.noteId)) {
    addError.value = 'Заметка больше недоступна'
    return
  }

  const text = normalizeTodoText(newTodoText.value)

  if (!text) {
    addError.value = EMPTY_TODO_ADD_ERROR
    return
  }

  addError.value = ''

  const todo: TodoItem = {
    id: crypto.randomUUID(),
    text,
    completed: false,
  }

  commit({
    type: 'todo:add',
    noteId: props.noteId,
    todo,
    index: props.todos.length,
  })

  newTodoText.value = ''
  syncDraftFromNote()
}

function removeTodo(todo: TodoItem): void {
  if (!notesStore.getNote(props.noteId)) {
    return
  }

  const index = props.todos.findIndex(item => item.id === todo.id)
  if (index === -1) {
    return
  }

  clearFieldError(todo.id)

  commit({
    type: 'todo:delete',
    noteId: props.noteId,
    todo: { ...todo },
    index,
  })

  syncDraftFromNote()
}

function toggleTodo(todo: TodoItem): void {
  if (!notesStore.getNote(props.noteId)) {
    return
  }

  commit({
    type: 'todo:update',
    noteId: props.noteId,
    todoId: todo.id,
    before: { completed: todo.completed },
    after: { completed: !todo.completed },
  })

  syncDraftFromNote()
}

function onTodoTextInput(todoId: string): void {
  clearFieldError(todoId)
}

function onTodoTextBlur(todo: TodoItem, event: Event): void {
  if (!notesStore.getNote(props.noteId)) {
    return
  }

  const target = event.target as HTMLInputElement
  const text = normalizeTodoText(target.value)
  const error = validateTodoText(text)

  if (error) {
    target.value = todo.text
    fieldErrors.value = {
      ...fieldErrors.value,
      [todo.id]: EMPTY_TODO_TEXT_ERROR,
    }
    return
  }

  clearFieldError(todo.id)
  target.value = text

  if (text === todo.text) {
    return
  }

  commit({
    type: 'todo:update',
    noteId: props.noteId,
    todoId: todo.id,
    before: { text: todo.text },
    after: { text },
  })

  syncDraftFromNote()
}
</script>

<template>
  <div class="todo-editor">
    <ul
      v-if="todos.length"
      class="todo-editor__list"
    >
      <li
        v-for="todo in todos"
        :key="todo.id"
        class="todo-editor__item-wrap"
      >
        <div class="todo-editor__item">
          <input
            :id="`todo-check-${todo.id}`"
            class="todo-editor__checkbox"
            type="checkbox"
            :checked="todo.completed"
            :aria-label="todo.completed ? 'Снять отметку' : 'Отметить выполненным'"
            @change="toggleTodo(todo)"
          >

          <input
            class="todo-editor__text"
            type="text"
            :class="{
              'todo-editor__text--done': todo.completed,
              'todo-editor__text--invalid': Boolean(fieldErrors[todo.id]),
            }"
            :value="todo.text"
            :aria-invalid="Boolean(fieldErrors[todo.id])"
            :aria-describedby="fieldErrors[todo.id] ? `todo-error-${todo.id}` : undefined"
            aria-label="Текст задачи"
            @input="onTodoTextInput(todo.id)"
            @blur="onTodoTextBlur(todo, $event)"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          >

          <button
            type="button"
            class="todo-editor__remove"
            aria-label="Удалить задачу"
            @click="removeTodo(todo)"
          >
            Удалить
          </button>
        </div>

        <p
          v-if="fieldErrors[todo.id]"
          :id="`todo-error-${todo.id}`"
          class="todo-editor__error"
          role="alert"
        >
          {{ fieldErrors[todo.id] }}
        </p>
      </li>
    </ul>

    <p
      v-else
      class="todo-editor__empty"
    >
      Пока нет задач — добавьте первую.
    </p>

    <form
      class="todo-editor__add"
      @submit.prevent="addTodo"
    >
      <div class="todo-editor__add-fields">
        <input
          v-model="newTodoText"
          class="todo-editor__new-input"
          :class="{ 'todo-editor__new-input--invalid': Boolean(addError) }"
          type="text"
          placeholder="Новая задача"
          aria-label="Новая задача"
          :aria-invalid="Boolean(addError)"
          :aria-describedby="addError ? 'todo-add-error' : undefined"
          autocomplete="off"
          @input="addError = ''"
        >
        <button
          type="submit"
          class="todo-editor__add-button"
          :disabled="!newTodoText.trim()"
        >
          Добавить
        </button>
      </div>

      <p
        v-if="addError"
        id="todo-add-error"
        class="todo-editor__error"
        role="alert"
      >
        {{ addError }}
      </p>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.todo-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__item-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__item {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'check text'
      'check remove';
    gap: $spacing-sm;
    align-items: center;

    @include respond-up(sm) {
      grid-template-columns: auto 1fr auto;
      grid-template-areas: 'check text remove';
    }
  }

  &__checkbox {
    grid-area: check;
    width: 1.15rem;
    height: 1.15rem;
    accent-color: $color-primary;
    cursor: pointer;
  }

  &__text {
    @include field-base;
    grid-area: text;
    padding: 0.55rem 0.75rem;

    &--done {
      color: $color-text-muted;
      text-decoration: line-through;
    }

    &--invalid {
      border-color: $color-danger;
    }
  }

  &__remove {
    @include button-danger;
    grid-area: remove;
    padding: 0.45rem 0.75rem;
    font-size: 0.85rem;
    justify-self: start;

    @include respond-up(sm) {
      justify-self: end;
    }
  }

  &__empty {
    margin: 0;
    color: $color-text-muted;
    font-size: 0.95rem;
  }

  &__add {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__add-fields {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    @include respond-up(sm) {
      flex-direction: row;
    }
  }

  &__new-input {
    @include field-base;

    &--invalid {
      border-color: $color-danger;
    }
  }

  &__add-button {
    @include button-primary;
    width: 100%;

    @include respond-up(sm) {
      width: auto;
      flex-shrink: 0;
    }
  }

  &__error {
    margin: 0;
    color: $color-danger;
    font-size: 0.85rem;
  }
}
</style>

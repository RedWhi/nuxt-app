<script setup lang="ts">
import type { Note } from '~/types/note'
import {
  displayNoteTitle,
  isBlank,
  normalizeTitle,
} from '~/utils/note-validation'

const route = useRoute()
const notesStore = useNotesStore()
const draftsStore = useDraftsStore()
const {
  canUndo,
  canRedo,
  undo,
  redo,
  commit,
  isApplying,
} = useHistory()

const noteId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : Array.isArray(id) ? id[0] ?? null : null
})

const note = computed(() =>
  noteId.value ? notesStore.getNote(noteId.value) : undefined,
)

const isReady = ref(false)
const baseline = ref<Note | null>(null)

const titleLocal = ref('')
const contentLocal = ref('')
const titleHint = ref('')

const isCancelOpen = ref(false)
const isDeleteOpen = ref(false)
const isRemoteDeletedOpen = ref(false)

useHead({
  title: computed(() => displayNoteTitle(titleLocal.value)),
})

function cloneNote(value: Note): Note {
  return {
    ...value,
    todos: value.todos.map(todo => ({ ...todo })),
  }
}

function syncDraftFromNote(target: Note): void {
  draftsStore.updateDraft({
    noteId: target.id,
    title: target.title,
    content: target.content,
    todos: target.todos,
  })
}

function syncLocalsFromNote(target: Note): void {
  titleLocal.value = target.title
  contentLocal.value = target.content
  titleHint.value = isBlank(target.title)
    ? 'В списке будет отображаться «Без названия»'
    : ''
}

function snapshotEquals(a: Note, b: Note): boolean {
  return (
    a.title === b.title
    && a.content === b.content
    && JSON.stringify(a.todos) === JSON.stringify(b.todos)
  )
}

const isDirty = computed(() => {
  if (!note.value || !baseline.value) {
    return false
  }

  return !snapshotEquals(note.value, baseline.value)
})

const deleteMessage = computed(() => {
  return `Заметка «${displayNoteTitle(titleLocal.value)}» будет удалена безвозвратно.`
})

async function showNoteNotFound(): Promise<void> {
  draftsStore.clearDraft()
  await showError(
    createError({
      statusCode: 404,
      statusMessage: 'Заметка не найдена',
      fatal: true,
    }),
  )
}

watch(
  [noteId, () => notesStore.isHydrated],
  async ([id, hydrated]) => {
    if (!hydrated) {
      return
    }

    if (!id) {
      await showNoteNotFound()
      return
    }

    const existing = notesStore.getNote(id)

    if (!existing) {
      await showNoteNotFound()
      return
    }

    baseline.value = cloneNote(existing)
    syncLocalsFromNote(existing)
    draftsStore.startDraft({
      noteId: existing.id,
      title: existing.title,
      content: existing.content,
      todos: existing.todos,
    })
    isReady.value = true
  },
  { immediate: true },
)

/** Заметка удалена в другой вкладке — graceful fallback. */
watch(
  () => note.value,
  (current) => {
    if (!isReady.value || !noteId.value || isApplying.value) {
      return
    }

    if (!current) {
      isCancelOpen.value = false
      isDeleteOpen.value = false
      isRemoteDeletedOpen.value = true
      draftsStore.clearDraft()
    }
  },
)

watch(
  () => note.value,
  (current) => {
    if (!current || !isReady.value || !isApplying.value) {
      return
    }

    syncLocalsFromNote(current)
    syncDraftFromNote(current)
  },
  { deep: true },
)

function handleUndo(): void {
  if (!note.value || !undo()) {
    return
  }

  if (note.value) {
    syncLocalsFromNote(note.value)
    syncDraftFromNote(note.value)
  }
}

function handleRedo(): void {
  if (!note.value || !redo()) {
    return
  }

  if (note.value) {
    syncLocalsFromNote(note.value)
    syncDraftFromNote(note.value)
  }
}

useKeyboardShortcuts({
  enabled: computed(() => Boolean(note.value) && !isRemoteDeletedOpen.value),
  onUndo: handleUndo,
  onRedo: handleRedo,
})

function commitTitle(): void {
  if (!note.value || !noteId.value) {
    return
  }

  const next = normalizeTitle(titleLocal.value)
  titleLocal.value = next
  titleHint.value = isBlank(next)
    ? 'В списке будет отображаться «Без названия»'
    : ''

  if (next === note.value.title) {
    return
  }

  commit({
    type: 'note:update',
    noteId: noteId.value,
    before: { title: note.value.title },
    after: { title: next },
  })

  if (note.value) {
    syncDraftFromNote(note.value)
  }
}

function commitContent(): void {
  if (!note.value || !noteId.value) {
    return
  }

  const next = contentLocal.value
  if (next === note.value.content) {
    return
  }

  commit({
    type: 'note:update',
    noteId: noteId.value,
    before: { content: note.value.content },
    after: { content: next },
  })

  if (note.value) {
    syncDraftFromNote(note.value)
  }
}

async function saveNote(): Promise<void> {
  if (!note.value) {
    await showNoteNotFound()
    return
  }

  commitTitle()
  commitContent()

  if (!note.value) {
    await showNoteNotFound()
    return
  }

  draftsStore.clearDraft()
  baseline.value = cloneNote(note.value)
  await navigateTo('/')
}

function requestCancel(): void {
  if (!note.value) {
    void leaveWithoutSaving()
    return
  }

  commitTitle()
  commitContent()

  if (!isDirty.value) {
    void leaveWithoutSaving()
    return
  }

  isCancelOpen.value = true
}

async function leaveWithoutSaving(): Promise<void> {
  if (baseline.value && noteId.value && note.value) {
    const current = note.value
    const original = baseline.value

    if (!snapshotEquals(current, original)) {
      notesStore.updateNote(noteId.value, {
        title: original.title,
        content: original.content,
        todos: original.todos.map(todo => ({ ...todo })),
      })
    }
  }

  draftsStore.clearDraft()
  await navigateTo('/')
}

function requestDelete(): void {
  if (!note.value) {
    void showNoteNotFound()
    return
  }

  isDeleteOpen.value = true
}

async function confirmDelete(): Promise<void> {
  if (!note.value || !noteId.value) {
    await showNoteNotFound()
    return
  }

  const index = notesStore.notes.findIndex(item => item.id === noteId.value)
  if (index === -1) {
    await showNoteNotFound()
    return
  }

  commit({
    type: 'note:delete',
    note: cloneNote(note.value),
    index,
  })

  draftsStore.clearDraft()
  await navigateTo('/')
}

async function acknowledgeRemoteDelete(): Promise<void> {
  isRemoteDeletedOpen.value = false
  draftsStore.clearDraft()
  await navigateTo('/')
}

function onBackClick(event: MouseEvent): void {
  event.preventDefault()

  if (!note.value) {
    void navigateTo('/')
    return
  }

  requestCancel()
}
</script>

<template>
  <main class="edit">
    <header class="edit__header">
      <a
        href="/"
        class="edit__back"
        @click="onBackClick"
      >
        ← К списку
      </a>

      <div class="edit__toolbar">
        <button
          type="button"
          class="edit__tool"
          :disabled="!canUndo || !note"
          title="Отменить (Ctrl+Z)"
          @click="handleUndo"
        >
          Undo
        </button>
        <button
          type="button"
          class="edit__tool"
          :disabled="!canRedo || !note"
          title="Повторить (Shift+Ctrl+Z)"
          @click="handleRedo"
        >
          Redo
        </button>
      </div>
    </header>

    <p
      v-if="!isReady"
      class="edit__missing"
    >
      Загрузка…
    </p>

    <form
      v-else-if="note"
      class="edit__form"
      @submit.prevent="saveNote"
    >
      <label class="edit__label" for="note-title">
        Название
      </label>
      <input
        id="note-title"
        v-model="titleLocal"
        class="edit__input"
        type="text"
        placeholder="Без названия"
        autocomplete="off"
        @blur="commitTitle"
      >
      <p
        v-if="titleHint"
        class="edit__hint-text"
      >
        {{ titleHint }}
      </p>

      <label class="edit__label" for="note-content">
        Текст
      </label>
      <textarea
        id="note-content"
        v-model="contentLocal"
        class="edit__textarea"
        rows="6"
        placeholder="Содержание заметки (можно оставить пустым)"
        @blur="commitContent"
      />

      <div class="edit__todos-header">
        <h2 class="edit__label edit__label--inline">
          Задачи
        </h2>
        <span class="edit__todos-count">
          {{ note.todos.length }}
        </span>
      </div>

      <NoteTodoEditor
        :note-id="note.id"
        :todos="note.todos"
      />

      <div class="edit__actions">
        <button
          type="button"
          class="edit__button edit__button--danger"
          @click="requestDelete"
        >
          Удалить
        </button>

        <div class="edit__actions-right">
          <button
            type="button"
            class="edit__button edit__button--ghost"
            @click="requestCancel"
          >
            Отмена
          </button>
          <button
            type="submit"
            class="edit__button edit__button--primary"
          >
            Сохранить
          </button>
        </div>
      </div>
    </form>

    <ConfirmDialog
      v-model:open="isCancelOpen"
      title="Отменить изменения?"
      message="Изменения с момента открытия будут сброшены. Продолжить?"
      confirm-label="Сбросить"
      cancel-label="Продолжить редактирование"
      variant="danger"
      @confirm="leaveWithoutSaving"
    />

    <ConfirmDialog
      v-model:open="isDeleteOpen"
      title="Удалить заметку?"
      :message="deleteMessage"
      confirm-label="Удалить"
      cancel-label="Отмена"
      variant="danger"
      @confirm="confirmDelete"
    />

    <AppModal
      v-model:open="isRemoteDeletedOpen"
      title="Заметка удалена"
      :close-on-overlay="false"
      :close-on-escape="false"
      role="alertdialog"
      @close="acknowledgeRemoteDelete"
    >
      <p>
        Эта заметка была удалена в другой вкладке. Редактор будет закрыт.
      </p>

      <template #footer>
        <button
          type="button"
          class="edit__button edit__button--primary"
          data-autofocus
          @click="acknowledgeRemoteDelete"
        >
          К списку
        </button>
      </template>
    </AppModal>
  </main>
</template>

<style lang="scss" scoped>
.edit {
  flex: 1;
  width: min(720px, 100%);
  margin: 0 auto;
  padding: $spacing-xl $spacing-md;

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    margin-bottom: $spacing-xl;
  }

  &__back {
    color: $color-primary-dark;
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  &__toolbar {
    display: flex;
    gap: $spacing-sm;
  }

  &__tool {
    padding: 0.35rem 0.7rem;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: #fff;
    color: $color-text-muted;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: $color-primary;
      color: $color-primary-dark;
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  &__missing {
    color: $color-text-muted;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__label {
    font-weight: 600;
    margin-top: $spacing-md;

    &--inline {
      margin-top: 0;
      font-size: 1rem;
    }
  }

  &__hint-text {
    margin: 0;
    color: $color-text-muted;
    font-size: 0.85rem;
  }

  &__todos-header {
    display: flex;
    align-items: baseline;
    gap: $spacing-sm;
    margin-top: $spacing-lg;
  }

  &__todos-count {
    color: $color-text-muted;
    font-size: 0.9rem;
  }

  &__input,
  &__textarea {
    width: 100%;
    padding: $spacing-sm $spacing-md;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font: inherit;
    color: #1e293b;
    background: #fff;

    &:focus {
      outline: 2px solid rgba($color-primary, 0.35);
      border-color: $color-primary;
    }
  }

  &__textarea {
    resize: vertical;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: $spacing-md;
    margin-top: $spacing-xl;
  }

  &__actions-right {
    display: flex;
    gap: $spacing-sm;
    margin-left: auto;
  }

  &__button {
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;
    border: 1px solid transparent;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;

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
        border-color: #cbd5e1;
      }
    }

    &--danger {
      background: transparent;
      border-color: #fecaca;
      color: #b91c1c;

      &:hover {
        background: #fef2f2;
      }
    }
  }
}
</style>

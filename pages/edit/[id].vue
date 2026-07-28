<script setup lang="ts">
/**
 * Сессия редактирования заметки.
 *
 * - Локальные title/content → в историю по blur (не на каждый символ).
 * - Todo — через NoteTodoEditor (атомарные commit).
 * - Черновик пишется параллельно; при Save/Cancel — clearDraft + history.clear.
 * - Удаление заметки в другой вкладке → диалог, без падения UI.
 */
import type { Note } from '~/types/note'
import { notesContentEqual } from '~/utils/note-compare'
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
  clear,
  isApplying,
} = useHistory()

const noteId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : Array.isArray(id) ? id[0] ?? null : null
})

/** Новая заметка из «Создать» — при отмене удаляем, а не откатываем. */
const isNewNote = computed(() => route.query.new === '1')

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
  return notesContentEqual(a, b)
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
  clear()
  await showError(
    createError({
      statusCode: 404,
      statusMessage: 'Заметка не найдена',
      fatal: true,
    }),
  )
}

/** История живёт только в рамках текущей сессии редактирования. */
function endEditSession(): void {
  draftsStore.clearDraft()
  clear()
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

    // Новая сессия редактирования — стеки undo/redo с нуля.
    clear()
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
      clear()
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

/** Фиксация заголовка в истории по blur — непрерывный ввод = одна запись. */
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

/** Фиксация текста заметки в истории по blur. */
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

  endEditSession()
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

  // Новую заметку при отмене всегда убираем (даже без правок).
  if (isNewNote.value || isDirty.value) {
    isCancelOpen.value = true
    return
  }

  void leaveWithoutSaving()
}

async function discardNewNote(): Promise<void> {
  if (!note.value || !noteId.value) {
    endEditSession()
    await navigateTo('/')
    return
  }

  const index = notesStore.notes.findIndex(item => item.id === noteId.value)
  if (index !== -1) {
    commit({
      type: 'note:delete',
      note: cloneNote(note.value),
      index,
    })
  }

  endEditSession()
  await navigateTo('/')
}

async function leaveWithoutSaving(): Promise<void> {
  if (isNewNote.value) {
    await discardNewNote()
    return
  }

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

  endEditSession()
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

  endEditSession()
  await navigateTo('/')
}

async function acknowledgeRemoteDelete(): Promise<void> {
  isRemoteDeletedOpen.value = false
  endEditSession()
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

      <LazyNoteTodoEditor
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

    <LazyConfirmDialog
      v-if="isCancelOpen"
      :open="true"
      :title="isNewNote ? 'Отменить создание?' : 'Отменить изменения?'"
      :message="isNewNote
        ? 'Новая заметка будет удалена. Продолжить?'
        : 'Изменения с момента открытия будут сброшены. Продолжить?'"
      :confirm-label="isNewNote ? 'Удалить черновик' : 'Сбросить'"
      cancel-label="Продолжить редактирование"
      variant="danger"
      @update:open="(open) => { if (!open) isCancelOpen = false }"
      @confirm="leaveWithoutSaving"
    />

    <LazyConfirmDialog
      v-if="isDeleteOpen"
      :open="true"
      title="Удалить заметку?"
      :message="deleteMessage"
      confirm-label="Удалить"
      cancel-label="Отмена"
      variant="danger"
      @update:open="(open) => { if (!open) isDeleteOpen = false }"
      @confirm="confirmDelete"
    />

    <LazyAppModal
      v-if="isRemoteDeletedOpen"
      :open="true"
      title="Заметка удалена"
      :close-on-overlay="false"
      :close-on-escape="false"
      role="alertdialog"
      @update:open="(open) => { if (!open) acknowledgeRemoteDelete() }"
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
    </LazyAppModal>
  </main>
</template>

<style lang="scss" scoped>
.edit {
  @include page-shell;
  animation: edit-enter 0.3s ease both;

  &__header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-md;
    margin-bottom: $spacing-xl;

    @include respond-up(sm) {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  &__back {
    color: $color-primary-dark;
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;
    width: fit-content;

    &:hover {
      text-decoration: underline;
    }
  }

  &__toolbar {
    display: flex;
    gap: $spacing-sm;
  }

  &__tool {
    @include button-ghost;
    padding: 0.45rem 0.8rem;
    font-size: 0.85rem;
    flex: 1;

    @include respond-up(sm) {
      flex: initial;
    }
  }

  &__missing {
    color: $color-text-muted;
  }

  &__form {
    @include surface;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-lg;

    @include respond-up(md) {
      padding: $spacing-xl;
    }
  }

  &__label {
    font-weight: 600;
    margin-top: $spacing-md;
    color: $color-ink;

    &--inline {
      margin-top: 0;
      font-family: $font-display;
      font-size: 1.15rem;
      font-weight: 700;
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
    @include field-base;
  }

  &__textarea {
    resize: vertical;
    min-height: 8rem;
    line-height: 1.55;
  }

  &__actions {
    display: flex;
    flex-direction: column-reverse;
    gap: $spacing-md;
    margin-top: $spacing-xl;

    @include respond-up(sm) {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
    }
  }

  &__actions-right {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    width: 100%;

    @include respond-up(sm) {
      flex-direction: row;
      width: auto;
      margin-left: auto;
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

    &--danger {
      @include button-danger;
    }
  }
}

@keyframes edit-enter {
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
  .edit {
    animation: none;
  }
}
</style>

<script setup lang="ts">
/**
 * Список заметок: создание / удаление через history.commit,
 * переход в сессию редактирования (`/edit/:id`).
 */
import { NOTE_SCHEMA_VERSION, type Note } from '~/types/note'
import { displayNoteTitle } from '~/utils/note-validation'

useHead({
  title: 'Заметки',
})

const notesStore = useNotesStore()
const { commit } = useHistory()

const isDeleteOpen = ref(false)
const notePendingDelete = ref<Note | null>(null)

/** Мемоизированный sortedNotes живёт в сторе. */
const { sortedNotes, notesCount } = storeToRefs(notesStore)

const deleteMessage = computed(() => {
  const note = notePendingDelete.value
  if (!note) {
    return ''
  }

  return `Заметка «${displayNoteTitle(note.title)}» будет удалена безвозвратно.`
})

function cloneNote(note: Note): Note {
  return {
    ...note,
    todos: note.todos.map(todo => ({ ...todo })),
  }
}

async function createNote(): Promise<void> {
  const timestamp = new Date().toISOString()
  const note: Note = {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    todos: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: NOTE_SCHEMA_VERSION,
  }

  commit({
    type: 'note:create',
    note: cloneNote(note),
    index: notesStore.notes.length,
  })

  await navigateTo({
    path: `/edit/${note.id}`,
    query: { new: '1' },
  })
}

async function editNote(id: string): Promise<void> {
  await navigateTo(`/edit/${id}`)
}

function requestDelete(id: string): void {
  const note = notesStore.getNote(id)
  if (!note) {
    return
  }

  notePendingDelete.value = cloneNote(note)
  isDeleteOpen.value = true
}

function confirmDelete(): void {
  const note = notePendingDelete.value
  if (!note) {
    return
  }

  const index = notesStore.notes.findIndex(item => item.id === note.id)
  if (index === -1) {
    notePendingDelete.value = null
    isDeleteOpen.value = false
    return
  }

  commit({
    type: 'note:delete',
    note: cloneNote(note),
    index,
  })

  notePendingDelete.value = null
  isDeleteOpen.value = false
}

function cancelDelete(): void {
  notePendingDelete.value = null
  isDeleteOpen.value = false
}
</script>

<template>
  <main class="notes">
    <header class="notes__header">
      <div class="notes__brand">
        <p class="notes__eyebrow">
          Личное пространство
        </p>
        <h1 class="notes__title">
          Заметки
        </h1>
        <p class="notes__subtitle">
          {{ notesCount }} шт.
        </p>
      </div>

      <button
        type="button"
        class="notes__create"
        @click="createNote"
      >
        Создать заметку
      </button>
    </header>

    <section
      v-if="sortedNotes.length"
      aria-label="Список заметок"
    >
      <NotesVirtualList
        :notes="sortedNotes"
        @edit="editNote"
        @delete="requestDelete"
      />
    </section>

    <section
      v-else
      class="notes__empty"
    >
      <p class="notes__empty-title">
        Пока нет заметок
      </p>
      <p class="notes__empty-text">
        Создайте первую заметку, чтобы начать.
      </p>
      <button
        type="button"
        class="notes__create"
        @click="createNote"
      >
        Создать заметку
      </button>
    </section>

    <!-- Lazy: чанк диалога грузится только при первом открытии -->
    <LazyConfirmDialog
      v-if="isDeleteOpen"
      :open="true"
      title="Удалить заметку?"
      :message="deleteMessage"
      confirm-label="Удалить"
      cancel-label="Отмена"
      variant="danger"
      @update:open="(open) => { if (!open) cancelDelete() }"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </main>
</template>

<style lang="scss" scoped>
.notes {
  @include page-shell;
  animation: notes-enter 0.35s ease both;

  &__header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-md;
    margin-bottom: $spacing-xl;

    @include respond-up(sm) {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }
  }

  &__brand {
    display: flex;
    flex-direction: column;
    gap: $spacing-2xs;
  }

  &__eyebrow {
    margin: 0;
    font-family: $font-body;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: $color-primary;
  }

  &__title {
    margin: 0;
    font-family: $font-display;
    font-size: clamp(2.25rem, 8vw, 3.25rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: $color-ink;
  }

  &__subtitle {
    margin: 0.15rem 0 0;
    color: $color-text-muted;
    font-size: 0.95rem;
  }

  &__create {
    @include button-primary;
    width: 100%;

    @include respond-up(sm) {
      width: auto;
      flex-shrink: 0;
    }
  }

  &__empty {
    @include surface;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-sm;
    padding: $spacing-xl $spacing-lg;
  }

  &__empty-title {
    margin: 0;
    font-family: $font-display;
    font-size: 1.35rem;
    font-weight: 700;
    color: $color-ink;
  }

  &__empty-text {
    margin: 0 0 $spacing-md;
    color: $color-text-muted;
  }
}

@keyframes notes-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .notes {
    animation: none;
  }
}
</style>

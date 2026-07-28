<script setup lang="ts">
import { NOTE_SCHEMA_VERSION, type Note } from '~/types/note'

useHead({
  title: 'Заметки',
})

const notesStore = useNotesStore()
const { commit } = useHistory()

const isDeleteOpen = ref(false)
const notePendingDelete = ref<Note | null>(null)

const sortedNotes = computed(() =>
  [...notesStore.notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  ),
)

const deleteMessage = computed(() => {
  const note = notePendingDelete.value
  if (!note) {
    return ''
  }

  const title = note.title.trim() || 'Без названия'
  return `Заметка «${title}» будет удалена безвозвратно.`
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

  await navigateTo(`/edit/${note.id}`)
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
    return
  }

  commit({
    type: 'note:delete',
    note: cloneNote(note),
    index,
  })

  notePendingDelete.value = null
}

function cancelDelete(): void {
  notePendingDelete.value = null
}
</script>

<template>
  <main class="notes">
    <header class="notes__header">
      <div>
        <h1 class="notes__title">
          Заметки
        </h1>
        <p class="notes__subtitle">
          {{ notesStore.notesCount }} шт.
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
      class="notes__list"
      aria-label="Список заметок"
    >
      <NoteListItem
        v-for="note in sortedNotes"
        :key="note.id"
        :note="note"
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

    <ConfirmDialog
      v-model:open="isDeleteOpen"
      title="Удалить заметку?"
      :message="deleteMessage"
      confirm-label="Удалить"
      cancel-label="Отмена"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </main>
</template>

<style lang="scss" scoped>
.notes {
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

  &__title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
  }

  &__subtitle {
    margin: 0.25rem 0 0;
    color: $color-text-muted;
  }

  &__create {
    padding: $spacing-sm $spacing-lg;
    border: none;
    border-radius: $radius-md;
    background-color: $color-primary;
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: $color-primary-dark;
    }

    &:focus-visible {
      outline: 2px solid rgba($color-primary, 0.45);
      outline-offset: 2px;
    }
  }

  &__list {
    border-top: 1px solid $color-border;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-sm;
    padding: $spacing-xl 0;
  }

  &__empty-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
  }

  &__empty-text {
    margin: 0 0 $spacing-md;
    color: $color-text-muted;
  }
}
</style>

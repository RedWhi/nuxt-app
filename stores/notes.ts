/**
 * Pinia-стор заметок.
 *
 * Персистентность — ручная (без pinia-plugin-persistedstate):
 * hydrate / scheduleSave / flushSave + utils/notes-storage.
 * Запись в localStorage откладывается debounce'ом, чтобы не писать на каждый символ.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { NOTE_SCHEMA_VERSION, type Note, type TodoItem } from '~/types/note'
import { debounce } from '~/utils/debounce'
import { sortNotesByUpdatedAt } from '~/utils/note-compare'
import { loadNotesFromStorage, saveNotesToStorage } from '~/utils/notes-storage'

/** Задержка debounced-сохранения в localStorage (мс). */
export const NOTES_SAVE_DEBOUNCE_MS = 300

function createId(): string {
  return crypto.randomUUID()
}

function nowIso(): string {
  return new Date().toISOString()
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const isHydrated = ref(false)
  const isSaving = ref(false)

  const persist = debounce(() => {
    saveNotesToStorage(notes.value)
    isSaving.value = false
  }, NOTES_SAVE_DEBOUNCE_MS)

  const notesCount = computed(() => notes.value.length)

  /** Мемоизированный Map id → Note. */
  const noteById = computed(() => {
    const map = new Map<string, Note>()
    for (const note of notes.value) {
      map.set(note.id, note)
    }
    return map
  })

  /** Мемоизированный список, отсортированный по дате обновления. */
  const sortedNotes = computed(() => sortNotesByUpdatedAt(notes.value))

  /** Планирует отложенное сохранение (не на каждое изменение сразу). */
  function scheduleSave(): void {
    if (!import.meta.client) {
      return
    }

    isSaving.value = true
    persist()
  }

  /** Немедленно сохраняет текущее состояние, сбрасывая debounce. */
  function flushSave(): void {
    if (!import.meta.client) {
      return
    }

    persist.flush()
    isSaving.value = false
  }

  /** Загружает заметки из localStorage с проверкой версии схемы. */
  function hydrate(): void {
    notes.value = loadNotesFromStorage()
    isHydrated.value = true
  }

  /**
   * Синхронизирует состояние с localStorage (другие вкладки).
   * Не трогает isHydrated — вызывается только после первой гидратации.
   */
  function syncFromStorage(): void {
    if (!import.meta.client || !isHydrated.value) {
      return
    }

    notes.value = loadNotesFromStorage()
  }

  function getNote(id: string): Note | undefined {
    return noteById.value.get(id)
  }

  function createNote(
    input: Partial<Pick<Note, 'title' | 'content' | 'todos'>> = {},
  ): Note {
    const timestamp = nowIso()
    const note: Note = {
      id: createId(),
      title: input.title ?? '',
      content: input.content ?? '',
      todos: input.todos?.map(todo => ({ ...todo })) ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: NOTE_SCHEMA_VERSION,
    }

    notes.value.push(note)
    scheduleSave()
    return note
  }

  function updateNote(
    id: string,
    patch: Partial<Pick<Note, 'title' | 'content' | 'todos'>>,
  ): Note | undefined {
    const index = notes.value.findIndex(note => note.id === id)

    if (index === -1) {
      return undefined
    }

    const current = notes.value[index]!
    const updated: Note = {
      ...current,
      title: patch.title ?? current.title,
      content: patch.content ?? current.content,
      todos: patch.todos
        ? patch.todos.map(todo => ({ ...todo }))
        : current.todos,
      updatedAt: nowIso(),
      schemaVersion: NOTE_SCHEMA_VERSION,
    }

    notes.value[index] = updated
    scheduleSave()
    return updated
  }

  function deleteNote(id: string): boolean {
    const index = notes.value.findIndex(note => note.id === id)

    if (index === -1) {
      return false
    }

    notes.value.splice(index, 1)
    scheduleSave()
    return true
  }

  function addTodo(
    noteId: string,
    input: Partial<Pick<TodoItem, 'text' | 'completed'>> = {},
  ): TodoItem | undefined {
    const note = getNote(noteId)

    if (!note) {
      return undefined
    }

    const todo: TodoItem = {
      id: createId(),
      text: input.text ?? '',
      completed: input.completed ?? false,
    }

    updateNote(noteId, { todos: [...note.todos, todo] })
    return todo
  }

  function updateTodo(
    noteId: string,
    todoId: string,
    patch: Partial<Pick<TodoItem, 'text' | 'completed'>>,
  ): TodoItem | undefined {
    const note = getNote(noteId)

    if (!note) {
      return undefined
    }

    const todos = note.todos.map((todo) => {
      if (todo.id !== todoId) {
        return todo
      }

      return {
        ...todo,
        text: patch.text ?? todo.text,
        completed: patch.completed ?? todo.completed,
      }
    })

    const updatedTodo = todos.find(todo => todo.id === todoId)

    if (!updatedTodo) {
      return undefined
    }

    updateNote(noteId, { todos })
    return updatedTodo
  }

  function deleteTodo(noteId: string, todoId: string): boolean {
    const note = getNote(noteId)

    if (!note) {
      return false
    }

    const todos = note.todos.filter(todo => todo.id !== todoId)

    if (todos.length === note.todos.length) {
      return false
    }

    updateNote(noteId, { todos })
    return true
  }

  return {
    notes,
    isHydrated,
    isSaving,
    notesCount,
    noteById,
    sortedNotes,
    hydrate,
    syncFromStorage,
    scheduleSave,
    flushSave,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    addTodo,
    updateTodo,
    deleteTodo,
  }
})

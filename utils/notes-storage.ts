/**
 * Ручная синхронизация списка заметок с localStorage.
 * Payload всегда содержит `schemaVersion` для миграций.
 */
import { NOTE_SCHEMA_VERSION, type Note, type TodoItem } from '~/types/note'

/** Ключ хранения заметок в localStorage. */
export const NOTES_STORAGE_KEY = 'nuxt-app:notes'

/** Формат данных, сохраняемых в localStorage. */
export interface NotesStoragePayload {
  schemaVersion: number
  notes: Note[]
}

function isTodoItem(value: unknown): value is TodoItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string'
    && typeof item.text === 'string'
    && typeof item.completed === 'boolean'
  )
}

function isNoteShape(value: unknown): value is Omit<Note, 'schemaVersion'> & { schemaVersion?: number } {
  if (!value || typeof value !== 'object') {
    return false
  }

  const note = value as Record<string, unknown>

  return (
    typeof note.id === 'string'
    && typeof note.title === 'string'
    && typeof note.content === 'string'
    && Array.isArray(note.todos)
    && note.todos.every(isTodoItem)
    && typeof note.createdAt === 'string'
    && typeof note.updatedAt === 'string'
  )
}

/**
 * Приводит заметку к текущей версии схемы.
 * Заметки с неизвестной/будущей версией отбрасываются.
 */
export function migrateNote(raw: unknown): Note | null {
  if (!isNoteShape(raw)) {
    return null
  }

  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0

  if (version > NOTE_SCHEMA_VERSION) {
    return null
  }

  // Пока есть только v1: нормализуем до текущей версии схемы.
  return {
    id: raw.id,
    title: raw.title,
    content: raw.content,
    todos: raw.todos.map(todo => ({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
    })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    schemaVersion: NOTE_SCHEMA_VERSION,
  }
}

function parsePayload(raw: string): NotesStoragePayload | null {
  try {
    const parsed: unknown = JSON.parse(raw)

    // Поддержка устаревшего формата: массив заметок без обёртки.
    if (Array.isArray(parsed)) {
      return {
        schemaVersion: NOTE_SCHEMA_VERSION,
        notes: parsed,
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const payload = parsed as Record<string, unknown>

    if (!Array.isArray(payload.notes)) {
      return null
    }

    return {
      schemaVersion: typeof payload.schemaVersion === 'number'
        ? payload.schemaVersion
        : 0,
      notes: payload.notes as Note[],
    }
  }
  catch {
    return null
  }
}

/** Загружает и мигрирует заметки из localStorage. */
export function loadNotesFromStorage(): Note[] {
  if (!import.meta.client) {
    return []
  }

  const raw = localStorage.getItem(NOTES_STORAGE_KEY)

  if (!raw) {
    return []
  }

  const payload = parsePayload(raw)

  if (!payload) {
    return []
  }

  if (payload.schemaVersion > NOTE_SCHEMA_VERSION) {
    console.warn(
      `[notes-storage] Неизвестная версия схемы хранилища: ${payload.schemaVersion}`,
    )
    return []
  }

  return payload.notes
    .map(migrateNote)
    .filter((note): note is Note => note !== null)
}

/** Сохраняет заметки в localStorage с текущей версией схемы. */
export function saveNotesToStorage(notes: Note[]): void {
  if (!import.meta.client) {
    return
  }

  const payload: NotesStoragePayload = {
    schemaVersion: NOTE_SCHEMA_VERSION,
    notes,
  }

  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(payload))
}

/** Текущая версия схемы Note для миграций localStorage. */
export const NOTE_SCHEMA_VERSION = 1 as const

/** Пункт чеклиста внутри заметки. */
export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

/** Доменная модель заметки (сохраняется в notes-storage). */
export interface Note {
  id: string
  title: string
  content: string
  todos: TodoItem[]
  /** ISO-8601 */
  createdAt: string
  /** ISO-8601 — меняется при любом обновлении содержимого */
  updatedAt: string
  schemaVersion: typeof NOTE_SCHEMA_VERSION
}

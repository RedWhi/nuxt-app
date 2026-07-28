/** Текущая версия схемы Note для миграций. */
export const NOTE_SCHEMA_VERSION = 1 as const

export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export interface Note {
  id: string
  title: string
  content: string
  todos: TodoItem[]
  createdAt: string
  updatedAt: string
  schemaVersion: typeof NOTE_SCHEMA_VERSION
}

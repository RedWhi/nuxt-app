import type { TodoItem } from './note'

/** Текущая версия схемы черновика для миграций. */
export const DRAFT_SCHEMA_VERSION = 1 as const

/** Черновик заметки (несохранённые правки). */
export interface NoteDraft {
  schemaVersion: typeof DRAFT_SCHEMA_VERSION
  /** ID существующей заметки или null для новой. */
  noteId: string | null
  title: string
  content: string
  todos: TodoItem[]
  updatedAt: string
}

/** Поля, которые можно обновлять в черновике. */
export type NoteDraftInput = Partial<
  Pick<NoteDraft, 'noteId' | 'title' | 'content' | 'todos'>
>

import type { Note, TodoItem } from './note'

/** Максимальное число шагов в истории undo. */
export const HISTORY_LIMIT = 50

/** Патч полей заметки — только изменённые значения. */
export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'todos' | 'updatedAt'>>

/** Патч полей todo — только изменённые значения. */
export type TodoPatch = Partial<Pick<TodoItem, 'text' | 'completed'>>

/**
 * Атомарные записи изменений разных типов.
 * Хранят только дифф, а не полный снимок списка заметок.
 */
export type HistoryAction =
  | {
      type: 'note:create'
      note: Note
      index: number
    }
  | {
      type: 'note:delete'
      note: Note
      index: number
    }
  | {
      type: 'note:update'
      noteId: string
      before: NotePatch
      after: NotePatch
    }
  | {
      type: 'todo:add'
      noteId: string
      todo: TodoItem
      index: number
    }
  | {
      type: 'todo:delete'
      noteId: string
      todo: TodoItem
      index: number
    }
  | {
      type: 'todo:update'
      noteId: string
      todoId: string
      before: TodoPatch
      after: TodoPatch
    }

/** Один шаг истории (атомарная запись изменения). */
export interface HistoryState {
  id: string
  timestamp: string
  action: HistoryAction
}

/** Стеки undo/redo поверх атомарных изменений. */
export interface HistoryStore {
  past: HistoryState[]
  future: HistoryState[]
}

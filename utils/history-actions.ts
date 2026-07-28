import type { HistoryAction, NotePatch, TodoPatch } from '~/types/history'
import type { Note, TodoItem } from '~/types/note'

function cloneNote(note: Note): Note {
  return {
    ...note,
    todos: note.todos.map(todo => ({ ...todo })),
  }
}

function cloneTodo(todo: TodoItem): TodoItem {
  return { ...todo }
}

function applyNotePatch(note: Note, patch: NotePatch): Note {
  return {
    ...note,
    ...patch,
    todos: patch.todos
      ? patch.todos.map(todo => ({ ...todo }))
      : note.todos,
  }
}

function applyTodoPatch(todo: TodoItem, patch: TodoPatch): TodoItem {
  return {
    ...todo,
    ...patch,
  }
}

/** Инвертирует действие для undo. */
export function invertAction(action: HistoryAction): HistoryAction {
  switch (action.type) {
    case 'note:create':
      return {
        type: 'note:delete',
        note: cloneNote(action.note),
        index: action.index,
      }
    case 'note:delete':
      return {
        type: 'note:create',
        note: cloneNote(action.note),
        index: action.index,
      }
    case 'note:update':
      return {
        type: 'note:update',
        noteId: action.noteId,
        before: { ...action.after },
        after: { ...action.before },
      }
    case 'todo:add':
      return {
        type: 'todo:delete',
        noteId: action.noteId,
        todo: cloneTodo(action.todo),
        index: action.index,
      }
    case 'todo:delete':
      return {
        type: 'todo:add',
        noteId: action.noteId,
        todo: cloneTodo(action.todo),
        index: action.index,
      }
    case 'todo:update':
      return {
        type: 'todo:update',
        noteId: action.noteId,
        todoId: action.todoId,
        before: { ...action.after },
        after: { ...action.before },
      }
  }
}

/**
 * Применяет атомарное действие к списку заметок.
 * Мутирует переданный массив и возвращает его же.
 */
export function applyHistoryAction(notes: Note[], action: HistoryAction): Note[] {
  switch (action.type) {
    case 'note:create': {
      const index = Math.min(Math.max(action.index, 0), notes.length)
      notes.splice(index, 0, cloneNote(action.note))
      return notes
    }

    case 'note:delete': {
      const index = notes.findIndex(note => note.id === action.note.id)
      if (index !== -1) {
        notes.splice(index, 1)
      }
      return notes
    }

    case 'note:update': {
      const index = notes.findIndex(note => note.id === action.noteId)
      if (index === -1) {
        return notes
      }
      notes[index] = applyNotePatch(notes[index]!, action.after)
      return notes
    }

    case 'todo:add': {
      const noteIndex = notes.findIndex(note => note.id === action.noteId)
      if (noteIndex === -1) {
        return notes
      }

      const note = notes[noteIndex]!
      const todos = [...note.todos]
      const index = Math.min(Math.max(action.index, 0), todos.length)
      todos.splice(index, 0, cloneTodo(action.todo))
      notes[noteIndex] = { ...note, todos }
      return notes
    }

    case 'todo:delete': {
      const noteIndex = notes.findIndex(note => note.id === action.noteId)
      if (noteIndex === -1) {
        return notes
      }

      const note = notes[noteIndex]!
      notes[noteIndex] = {
        ...note,
        todos: note.todos.filter(todo => todo.id !== action.todo.id),
      }
      return notes
    }

    case 'todo:update': {
      const noteIndex = notes.findIndex(note => note.id === action.noteId)
      if (noteIndex === -1) {
        return notes
      }

      const note = notes[noteIndex]!
      notes[noteIndex] = {
        ...note,
        todos: note.todos.map((todo) => {
          if (todo.id !== action.todoId) {
            return todo
          }
          return applyTodoPatch(todo, action.after)
        }),
      }
      return notes
    }
  }
}

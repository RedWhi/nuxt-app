import type { Note, TodoItem } from '~/types/note'

/** Сравнение todo без JSON.stringify. */
export function todosEqual(a: TodoItem[], b: TodoItem[]): boolean {
  if (a === b) {
    return true
  }

  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]!
    const right = b[i]!

    if (
      left.id !== right.id
      || left.text !== right.text
      || left.completed !== right.completed
    ) {
      return false
    }
  }

  return true
}

/** Сравнение снимков заметки для isDirty. */
export function notesContentEqual(a: Note, b: Note): boolean {
  return (
    a.title === b.title
    && a.content === b.content
    && todosEqual(a.todos, b.todos)
  )
}

/** Сортировка по updatedAt desc (мемоизируется снаружи через computed). */
export function sortNotesByUpdatedAt(notes: Note[]): Note[] {
  return [...notes].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

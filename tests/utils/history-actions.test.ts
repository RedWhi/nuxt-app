import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, type HistoryAction } from '~/types/history'
import { NOTE_SCHEMA_VERSION, type Note, type TodoItem } from '~/types/note'
import { applyHistoryAction, invertAction } from '~/utils/history-actions'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? '',
    content: overrides.content ?? '',
    todos: overrides.todos ?? [],
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
    schemaVersion: NOTE_SCHEMA_VERSION,
  }
}

function makeTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    text: overrides.text ?? '',
    completed: overrides.completed ?? false,
  }
}

/** Применяет цепочку действий через invert для имитации undo. */
function undoAction(notes: Note[], action: HistoryAction): void {
  applyHistoryAction(notes, invertAction(action))
}

describe('history-actions: инверсия (атомарность undo)', () => {
  it('инвертирует note:create <-> note:delete', () => {
    const note = makeNote({ id: 'n1', title: 'A' })
    const create: HistoryAction = { type: 'note:create', note, index: 0 }

    expect(invertAction(create)).toEqual({
      type: 'note:delete',
      note,
      index: 0,
    })
    expect(invertAction(invertAction(create))).toEqual(create)
  })

  it('инвертирует before/after у note:update', () => {
    const action: HistoryAction = {
      type: 'note:update',
      noteId: 'n1',
      before: { title: 'До', content: 'Старый' },
      after: { title: 'После', content: 'Новый' },
    }

    expect(invertAction(action)).toEqual({
      type: 'note:update',
      noteId: 'n1',
      before: { title: 'После', content: 'Новый' },
      after: { title: 'До', content: 'Старый' },
    })
  })

  it('инвертирует todo:add <-> todo:delete и todo:update', () => {
    const todo = makeTodo({ id: 't1', text: 'Задача' })

    const add: HistoryAction = {
      type: 'todo:add',
      noteId: 'n1',
      todo,
      index: 0,
    }
    expect(invertAction(add).type).toBe('todo:delete')
    expect(invertAction(invertAction(add))).toEqual(add)

    const update: HistoryAction = {
      type: 'todo:update',
      noteId: 'n1',
      todoId: 't1',
      before: { text: 'A', completed: false },
      after: { text: 'B', completed: true },
    }
    expect(invertAction(update)).toEqual({
      type: 'todo:update',
      noteId: 'n1',
      todoId: 't1',
      before: { text: 'B', completed: true },
      after: { text: 'A', completed: false },
    })
  })
})

describe('history-actions: применение диффов', () => {
  it('создаёт и удаляет заметку атомарно', () => {
    const notes: Note[] = []
    const note = makeNote({ id: 'n1', title: 'Новая' })
    const create: HistoryAction = { type: 'note:create', note, index: 0 }

    applyHistoryAction(notes, create)
    expect(notes).toHaveLength(1)
    expect(notes[0]?.title).toBe('Новая')

    undoAction(notes, create)
    expect(notes).toHaveLength(0)

    applyHistoryAction(notes, create)
    expect(notes).toHaveLength(1)
  })

  it('вставляет заметку по index, а не только в конец', () => {
    const notes = [
      makeNote({ id: 'a', title: 'A' }),
      makeNote({ id: 'c', title: 'C' }),
    ]

    applyHistoryAction(notes, {
      type: 'note:create',
      note: makeNote({ id: 'b', title: 'B' }),
      index: 1,
    })

    expect(notes.map(n => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('обновляет только изменённые поля (дифф, не полный снимок)', () => {
    const notes: Note[] = [
      makeNote({ id: 'n1', title: 'Старый', content: 'Сохранить' }),
    ]

    applyHistoryAction(notes, {
      type: 'note:update',
      noteId: 'n1',
      before: { title: 'Старый' },
      after: { title: 'Новый' },
    })

    expect(notes[0]?.title).toBe('Новый')
    expect(notes[0]?.content).toBe('Сохранить')
  })

  it('поддерживает полный цикл todo add → update → delete → undo', () => {
    const notes: Note[] = [makeNote({ id: 'n1' })]
    const todo = makeTodo({ id: 't1', text: 'Задача' })

    const add: HistoryAction = {
      type: 'todo:add',
      noteId: 'n1',
      todo,
      index: 0,
    }
    applyHistoryAction(notes, add)
    expect(notes[0]?.todos).toHaveLength(1)

    const update: HistoryAction = {
      type: 'todo:update',
      noteId: 'n1',
      todoId: 't1',
      before: { completed: false },
      after: { completed: true },
    }
    applyHistoryAction(notes, update)
    expect(notes[0]?.todos[0]?.completed).toBe(true)

    const remove: HistoryAction = {
      type: 'todo:delete',
      noteId: 'n1',
      todo: { ...todo, completed: true },
      index: 0,
    }
    applyHistoryAction(notes, remove)
    expect(notes[0]?.todos).toHaveLength(0)

    undoAction(notes, remove)
    expect(notes[0]?.todos).toHaveLength(1)
    expect(notes[0]?.todos[0]?.completed).toBe(true)
  })

  it('вставляет todo в середину списка по index', () => {
    const notes: Note[] = [
      makeNote({
        id: 'n1',
        todos: [
          makeTodo({ id: 't1', text: '1' }),
          makeTodo({ id: 't3', text: '3' }),
        ],
      }),
    ]

    applyHistoryAction(notes, {
      type: 'todo:add',
      noteId: 'n1',
      todo: makeTodo({ id: 't2', text: '2' }),
      index: 1,
    })

    expect(notes[0]?.todos.map(t => t.id)).toEqual(['t1', 't2', 't3'])
  })
})

describe('history-actions: edge-cases и graceful degradation', () => {
  it('не падает при update/delete несуществующей заметки', () => {
    const notes: Note[] = [makeNote({ id: 'n1' })]

    expect(() => {
      applyHistoryAction(notes, {
        type: 'note:update',
        noteId: 'missing',
        before: { title: 'a' },
        after: { title: 'b' },
      })
    }).not.toThrow()

    expect(() => {
      applyHistoryAction(notes, {
        type: 'note:delete',
        note: makeNote({ id: 'missing' }),
        index: 0,
      })
    }).not.toThrow()

    expect(notes).toHaveLength(1)
  })

  it('не падает при операциях todo для отсутствующей заметки', () => {
    const notes: Note[] = []
    const todo = makeTodo({ id: 't1' })

    expect(() => {
      applyHistoryAction(notes, {
        type: 'todo:add',
        noteId: 'missing',
        todo,
        index: 0,
      })
      applyHistoryAction(notes, {
        type: 'todo:update',
        noteId: 'missing',
        todoId: 't1',
        before: { text: 'a' },
        after: { text: 'b' },
      })
      applyHistoryAction(notes, {
        type: 'todo:delete',
        noteId: 'missing',
        todo,
        index: 0,
      })
    }).not.toThrow()

    expect(notes).toHaveLength(0)
  })

  it('clamp index create за границами массива', () => {
    const notes: Note[] = [makeNote({ id: 'a' })]

    applyHistoryAction(notes, {
      type: 'note:create',
      note: makeNote({ id: 'b' }),
      index: 100,
    })
    expect(notes.map(n => n.id)).toEqual(['a', 'b'])

    applyHistoryAction(notes, {
      type: 'note:create',
      note: makeNote({ id: 'z' }),
      index: -5,
    })
    expect(notes[0]?.id).toBe('z')
  })

  it('клонирует note/todo при create/add (нет общей ссылки)', () => {
    const notes: Note[] = []
    const note = makeNote({
      id: 'n1',
      todos: [makeTodo({ id: 't1', text: 'A' })],
    })

    applyHistoryAction(notes, {
      type: 'note:create',
      note,
      index: 0,
    })

    note.title = 'Мутация исходника'
    note.todos[0]!.text = 'Мутация todo'
    expect(notes[0]?.title).toBe('')
    expect(notes[0]?.todos[0]?.text).toBe('A')
  })

  it(`константа HISTORY_LIMIT равна ${HISTORY_LIMIT}`, () => {
    expect(HISTORY_LIMIT).toBe(50)
  })
})

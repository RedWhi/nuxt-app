import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHistory } from '~/composables/useHistory'
import { useNotesStore } from '~/stores/notes'
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

describe('history-actions', () => {
  it('инвертирует create <-> delete', () => {
    const note = makeNote({ id: 'n1', title: 'A' })
    const create: HistoryAction = { type: 'note:create', note, index: 0 }

    expect(invertAction(create)).toEqual({
      type: 'note:delete',
      note,
      index: 0,
    })
    expect(invertAction(invertAction(create))).toEqual(create)
  })

  it('инвертирует before/after у update', () => {
    const action: HistoryAction = {
      type: 'note:update',
      noteId: 'n1',
      before: { title: 'До' },
      after: { title: 'После' },
    }

    expect(invertAction(action)).toEqual({
      type: 'note:update',
      noteId: 'n1',
      before: { title: 'После' },
      after: { title: 'До' },
    })
  })

  it('применяет атомарные диффы без полного снимка', () => {
    const notes: Note[] = [makeNote({ id: 'n1', title: 'Старый' })]

    applyHistoryAction(notes, {
      type: 'note:update',
      noteId: 'n1',
      before: { title: 'Старый' },
      after: { title: 'Новый' },
    })

    expect(notes[0]?.title).toBe('Новый')
  })
})

describe('useHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const history = useHistory()
    history.clear()
    useNotesStore().notes.splice(0, useNotesStore().notes.length)
  })

  it('делает undo/redo для создания заметки', () => {
    const history = useHistory()
    const notesStore = useNotesStore()
    const note = makeNote({ id: 'n1', title: 'Новая' })

    history.commit({ type: 'note:create', note, index: 0 })
    expect(notesStore.notes).toHaveLength(1)

    expect(history.undo()).toBe(true)
    expect(notesStore.notes).toHaveLength(0)
    expect(history.canRedo.value).toBe(true)

    expect(history.redo()).toBe(true)
    expect(notesStore.notes[0]?.title).toBe('Новая')
  })

  it('хранит только изменение полей при update', () => {
    const history = useHistory()
    const notesStore = useNotesStore()
    const note = makeNote({ id: 'n1', title: 'До', content: 'Текст' })

    notesStore.notes.push(note)

    history.commit({
      type: 'note:update',
      noteId: 'n1',
      before: { title: 'До' },
      after: { title: 'После' },
    })

    const entry = history.past.value[0]
    expect(entry?.action.type).toBe('note:update')
    if (entry?.action.type === 'note:update') {
      expect(entry.action.before).toEqual({ title: 'До' })
      expect(entry.action.after).toEqual({ title: 'После' })
      expect(entry.action).not.toHaveProperty('note')
    }

    expect(notesStore.notes[0]?.title).toBe('После')
    history.undo()
    expect(notesStore.notes[0]?.title).toBe('До')
  })

  it('поддерживает атомарные операции todo', () => {
    const history = useHistory()
    const notesStore = useNotesStore()
    const todo = makeTodo({ id: 't1', text: 'Задача' })

    notesStore.notes.push(makeNote({ id: 'n1' }))

    history.commit({
      type: 'todo:add',
      noteId: 'n1',
      todo,
      index: 0,
    })
    expect(notesStore.notes[0]?.todos).toHaveLength(1)

    history.commit({
      type: 'todo:update',
      noteId: 'n1',
      todoId: 't1',
      before: { completed: false },
      after: { completed: true },
    })
    expect(notesStore.notes[0]?.todos[0]?.completed).toBe(true)

    history.undo()
    expect(notesStore.notes[0]?.todos[0]?.completed).toBe(false)

    history.undo()
    expect(notesStore.notes[0]?.todos).toHaveLength(0)
  })

  it(`ограничивает историю ${HISTORY_LIMIT} шагами`, () => {
    const history = useHistory()
    const notesStore = useNotesStore()
    notesStore.notes.push(makeNote({ id: 'n1', title: '0' }))

    for (let i = 1; i <= HISTORY_LIMIT + 5; i += 1) {
      history.commit({
        type: 'note:update',
        noteId: 'n1',
        before: { title: String(i - 1) },
        after: { title: String(i) },
      })
    }

    expect(history.past.value).toHaveLength(HISTORY_LIMIT)
    expect(notesStore.notes[0]?.title).toBe(String(HISTORY_LIMIT + 5))

    for (let i = 0; i < HISTORY_LIMIT; i += 1) {
      history.undo()
    }

    expect(history.canUndo.value).toBe(false)
    // Самые старые 5 шагов отброшены лимитом
    expect(notesStore.notes[0]?.title).toBe('5')
  })

  it('очищает redo при новой записи', () => {
    const history = useHistory()
    const note = makeNote({ id: 'n1' })

    history.commit({ type: 'note:create', note, index: 0 })
    history.undo()
    expect(history.canRedo.value).toBe(true)

    history.record({
      type: 'note:update',
      noteId: 'n1',
      before: { title: '' },
      after: { title: 'x' },
    })

    expect(history.canRedo.value).toBe(false)
  })
})

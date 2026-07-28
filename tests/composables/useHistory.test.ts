import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistory } from '~/composables/useHistory'
import { useNotesStore, NOTES_SAVE_DEBOUNCE_MS } from '~/stores/notes'
import { HISTORY_LIMIT } from '~/types/history'
import { NOTE_SCHEMA_VERSION, type Note, type TodoItem } from '~/types/note'
import { NOTES_STORAGE_KEY } from '~/utils/notes-storage'

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

describe('useHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()

    const history = useHistory()
    history.clear()
    useNotesStore().notes.splice(0, useNotesStore().notes.length)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('undo / redo', () => {
    it('делает undo/redo для создания заметки', () => {
      const history = useHistory()
      const notesStore = useNotesStore()
      const note = makeNote({ id: 'n1', title: 'Новая' })

      history.commit({ type: 'note:create', note, index: 0 })
      expect(notesStore.notes).toHaveLength(1)
      expect(history.canUndo.value).toBe(true)
      expect(history.canRedo.value).toBe(false)

      expect(history.undo()).toBe(true)
      expect(notesStore.notes).toHaveLength(0)
      expect(history.canRedo.value).toBe(true)

      expect(history.redo()).toBe(true)
      expect(notesStore.notes[0]?.title).toBe('Новая')
      expect(history.canUndo.value).toBe(true)
    })

    it('делает undo/redo для удаления заметки', () => {
      const history = useHistory()
      const notesStore = useNotesStore()
      const note = makeNote({ id: 'n1', title: 'Удалить' })
      notesStore.notes.push(note)

      history.commit({ type: 'note:delete', note, index: 0 })
      expect(notesStore.notes).toHaveLength(0)

      history.undo()
      expect(notesStore.notes[0]?.id).toBe('n1')

      history.redo()
      expect(notesStore.notes).toHaveLength(0)
    })

    it('edge: undo/redo на пустых стеках возвращают false', () => {
      const history = useHistory()

      expect(history.canUndo.value).toBe(false)
      expect(history.canRedo.value).toBe(false)
      expect(history.undo()).toBe(false)
      expect(history.redo()).toBe(false)
    })

    it('многошаговый undo/redo сохраняет порядок', () => {
      const history = useHistory()
      const notesStore = useNotesStore()
      notesStore.notes.push(makeNote({ id: 'n1', title: '0' }))

      history.commit({
        type: 'note:update',
        noteId: 'n1',
        before: { title: '0' },
        after: { title: '1' },
      })
      history.commit({
        type: 'note:update',
        noteId: 'n1',
        before: { title: '1' },
        after: { title: '2' },
      })
      history.commit({
        type: 'note:update',
        noteId: 'n1',
        before: { title: '2' },
        after: { title: '3' },
      })

      expect(notesStore.notes[0]?.title).toBe('3')
      history.undo()
      history.undo()
      expect(notesStore.notes[0]?.title).toBe('1')
      history.redo()
      expect(notesStore.notes[0]?.title).toBe('2')
    })
  })

  describe('атомарность диффов', () => {
    it('хранит только изменение полей при note:update', () => {
      const history = useHistory()
      const notesStore = useNotesStore()
      notesStore.notes.push(makeNote({ id: 'n1', title: 'До', content: 'Текст' }))

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

      expect(notesStore.notes[0]?.content).toBe('Текст')
      history.undo()
      expect(notesStore.notes[0]?.title).toBe('До')
      expect(notesStore.notes[0]?.content).toBe('Текст')
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

    it('record не применяет действие повторно, только пишет в стек', () => {
      const history = useHistory()
      const notesStore = useNotesStore()
      const note = makeNote({ id: 'n1', title: 'Уже есть' })
      notesStore.notes.push(note)

      history.record({
        type: 'note:create',
        note,
        index: 0,
      })

      expect(notesStore.notes).toHaveLength(1)
      expect(history.past.value).toHaveLength(1)

      history.undo()
      expect(notesStore.notes).toHaveLength(0)
    })
  })

  describe('лимит истории', () => {
    it(`ограничивает past ${HISTORY_LIMIT} шагами`, () => {
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

    it('edge: redo после trim past не раздувает стек сверх лимита', () => {
      const history = useHistory()
      const notesStore = useNotesStore()
      notesStore.notes.push(makeNote({ id: 'n1', title: '0' }))

      for (let i = 1; i <= HISTORY_LIMIT; i += 1) {
        history.commit({
          type: 'note:update',
          noteId: 'n1',
          before: { title: String(i - 1) },
          after: { title: String(i) },
        })
      }

      history.undo()
      history.undo()
      expect(history.future.value).toHaveLength(2)

      history.redo()
      history.redo()
      expect(history.past.value.length).toBeLessThanOrEqual(HISTORY_LIMIT)
      expect(history.future.value).toHaveLength(0)
    })
  })

  describe('стек redo и clear', () => {
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
      expect(history.future.value).toHaveLength(0)
    })

    it('clear сбрасывает past и future', () => {
      const history = useHistory()

      history.commit({
        type: 'note:create',
        note: makeNote({ id: 'n1' }),
        index: 0,
      })
      history.undo()

      history.clear()
      expect(history.past.value).toHaveLength(0)
      expect(history.future.value).toHaveLength(0)
      expect(history.canUndo.value).toBe(false)
      expect(history.canRedo.value).toBe(false)
    })

    it('clear после правок имитирует конец сессии редактирования (save/cancel)', () => {
      const history = useHistory()
      const notes = useNotesStore()

      history.commit({
        type: 'note:create',
        note: makeNote({ id: 'n1', title: 'A' }),
        index: 0,
      })
      history.commit({
        type: 'note:update',
        noteId: 'n1',
        before: { title: 'A' },
        after: { title: 'B' },
      })

      // «Сохранить» / «Отменить» — стеки обнуляются, данные заметок не трогаем.
      history.clear()

      expect(history.canUndo.value).toBe(false)
      expect(history.canRedo.value).toBe(false)
      expect(notes.getNote('n1')?.title).toBe('B')
    })

    it('historyStore отражает текущие стеки', () => {
      const history = useHistory()

      history.commit({
        type: 'note:create',
        note: makeNote({ id: 'n1' }),
        index: 0,
      })

      expect(history.historyStore.value.past).toHaveLength(1)
      expect(history.historyStore.value.future).toHaveLength(0)

      history.undo()
      expect(history.historyStore.value.past).toHaveLength(0)
      expect(history.historyStore.value.future).toHaveLength(1)
    })
  })

  describe('побочные эффекты', () => {
    it('commit планирует debounced-сохранение заметок', () => {
      const history = useHistory()

      history.commit({
        type: 'note:create',
        note: makeNote({ id: 'n1', title: 'Save me' }),
        index: 0,
      })

      expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()
      vi.advanceTimersByTime(NOTES_SAVE_DEBOUNCE_MS)

      const saved = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)
      expect(saved.notes[0].title).toBe('Save me')
    })

    it('isApplying истинно только во время применения действия', () => {
      const history = useHistory()
      expect(history.isApplying.value).toBe(false)

      history.commit({
        type: 'note:create',
        note: makeNote({ id: 'n1' }),
        index: 0,
      })

      // После commit флаг снова false
      expect(history.isApplying.value).toBe(false)
    })

    it('edge: commit update для отсутствующей заметки всё равно пишет историю', () => {
      const history = useHistory()

      history.commit({
        type: 'note:update',
        noteId: 'ghost',
        before: { title: 'a' },
        after: { title: 'b' },
      })

      expect(history.past.value).toHaveLength(1)
      expect(useNotesStore().notes).toHaveLength(0)

      // undo обратного патча тоже безопасен
      expect(history.undo()).toBe(true)
      expect(useNotesStore().notes).toHaveLength(0)
    })
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore, NOTES_SAVE_DEBOUNCE_MS } from '~/stores/notes'
import { NOTE_SCHEMA_VERSION, type Note } from '~/types/note'
import {
  NOTES_STORAGE_KEY,
  loadNotesFromStorage,
  migrateNote,
  saveNotesToStorage,
} from '~/utils/notes-storage'

function makeStoredNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? 'n1',
    title: overrides.title ?? 'Заголовок',
    content: overrides.content ?? 'Текст',
    todos: overrides.todos ?? [],
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
    schemaVersion: overrides.schemaVersion ?? NOTE_SCHEMA_VERSION,
  }
}

describe('notes-storage: загрузка и сохранение', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('мигрирует валидную заметку к текущей схеме', () => {
    const note = migrateNote({
      id: '1',
      title: 'Заголовок',
      content: 'Текст',
      todos: [{ id: 't1', text: 'Задача', completed: false }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    })

    expect(note).toMatchObject({
      id: '1',
      title: 'Заголовок',
      schemaVersion: NOTE_SCHEMA_VERSION,
    })
  })

  it('нормализует заметку без schemaVersion как устаревшую', () => {
    const note = migrateNote({
      id: 'legacy',
      title: 'Старая',
      content: '',
      todos: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    expect(note?.schemaVersion).toBe(NOTE_SCHEMA_VERSION)
  })

  it('отбрасывает заметку с будущей версией схемы', () => {
    expect(
      migrateNote({
        id: '1',
        title: '',
        content: '',
        todos: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        schemaVersion: NOTE_SCHEMA_VERSION + 1,
      }),
    ).toBeNull()
  })

  it('отбрасывает битую структуру заметки', () => {
    expect(migrateNote(null)).toBeNull()
    expect(migrateNote({ id: 1, title: 'x' })).toBeNull()
    expect(migrateNote({
      id: '1',
      title: 'ok',
      content: 'ok',
      todos: [{ id: 't', text: 'x' }], // нет completed
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    })).toBeNull()
  })

  it('сохраняет и загружает заметки с обёрткой схемы', () => {
    const notes = [makeStoredNote({ id: '1', title: 'A', content: 'B' })]
    saveNotesToStorage(notes)

    const raw = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)
    expect(raw.schemaVersion).toBe(NOTE_SCHEMA_VERSION)
    expect(loadNotesFromStorage()).toEqual(notes)
  })

  it('загружает устаревший формат массива без обёртки', () => {
    localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'legacy',
          title: 'Старая',
          content: '',
          todos: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    )

    const loaded = loadNotesFromStorage()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.schemaVersion).toBe(NOTE_SCHEMA_VERSION)
  })

  it('edge: пустое / битое хранилище возвращает []', () => {
    expect(loadNotesFromStorage()).toEqual([])

    localStorage.setItem(NOTES_STORAGE_KEY, '{not-json')
    expect(loadNotesFromStorage()).toEqual([])

    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ notes: 'oops' }))
    expect(loadNotesFromStorage()).toEqual([])
  })

  it('edge: отбрасывает payload с будущей версией схемы хранилища', () => {
    localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: NOTE_SCHEMA_VERSION + 10,
        notes: [makeStoredNote()],
      }),
    )

    expect(loadNotesFromStorage()).toEqual([])
  })

  it('edge: фильтрует частично битый список заметок', () => {
    localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: NOTE_SCHEMA_VERSION,
        notes: [
          makeStoredNote({ id: 'ok' }),
          { id: 'bad' },
          {
            id: 'future',
            title: 'Будущая',
            content: '',
            todos: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            schemaVersion: NOTE_SCHEMA_VERSION + 1,
          },
        ],
      }),
    )

    const loaded = loadNotesFromStorage()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.id).toBe('ok')
  })
})

describe('useNotesStore: CRUD', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('создаёт заметку с дефолтами и schemaVersion', () => {
    const store = useNotesStore()
    const created = store.createNote()

    expect(created.title).toBe('')
    expect(created.content).toBe('')
    expect(created.todos).toEqual([])
    expect(created.schemaVersion).toBe(NOTE_SCHEMA_VERSION)
    expect(created.id).toBeTruthy()
    expect(store.notesCount).toBe(1)
    expect(store.noteById.get(created.id)).toEqual(created)
  })

  it('создаёт заметку с начальными данными и копирует todos', () => {
    const store = useNotesStore()
    const todos = [{ id: 't1', text: 'A', completed: false }]
    const created = store.createNote({
      title: 'Новая',
      content: 'Текст',
      todos,
    })

    expect(created.title).toBe('Новая')
    expect(created.todos).toEqual(todos)
    expect(created.todos).not.toBe(todos)
  })

  it('читает, обновляет и удаляет заметку', () => {
    const store = useNotesStore()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const created = store.createNote({ title: 'Новая', content: 'Текст' })

    expect(store.getNote(created.id)?.title).toBe('Новая')

    vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'))
    const updated = store.updateNote(created.id, { title: 'Обновлённая' })
    expect(updated?.title).toBe('Обновлённая')
    expect(updated?.content).toBe('Текст')
    expect(updated?.updatedAt).not.toBe(created.updatedAt)

    expect(store.deleteNote(created.id)).toBe(true)
    expect(store.getNote(created.id)).toBeUndefined()
    expect(store.notes).toHaveLength(0)
  })

  it('edge: update/delete несуществующей заметки безопасны', () => {
    const store = useNotesStore()

    expect(store.updateNote('missing', { title: 'x' })).toBeUndefined()
    expect(store.deleteNote('missing')).toBe(false)
  })

  it('edge: update без patch.todos не затирает список задач', () => {
    const store = useNotesStore()
    const note = store.createNote({
      todos: [{ id: 't1', text: 'Сохранить', completed: false }],
    })

    store.updateNote(note.id, { title: 'Только заголовок' })
    expect(store.getNote(note.id)?.todos).toHaveLength(1)
    expect(store.getNote(note.id)?.todos[0]?.text).toBe('Сохранить')
  })
})

describe('useNotesStore: CRUD todo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('добавляет, обновляет и удаляет todo', () => {
    const store = useNotesStore()
    const note = store.createNote()

    const todo = store.addTodo(note.id, { text: 'Купить молоко' })
    expect(todo).toBeDefined()
    expect(store.getNote(note.id)?.todos).toHaveLength(1)

    store.updateTodo(note.id, todo!.id, { completed: true, text: 'Купить хлеб' })
    expect(store.getNote(note.id)?.todos[0]).toMatchObject({
      text: 'Купить хлеб',
      completed: true,
    })

    expect(store.deleteTodo(note.id, todo!.id)).toBe(true)
    expect(store.getNote(note.id)?.todos).toHaveLength(0)
  })

  it('edge: операции todo для отсутствующей заметки/пункта', () => {
    const store = useNotesStore()
    const note = store.createNote()

    expect(store.addTodo('missing', { text: 'x' })).toBeUndefined()
    expect(store.updateTodo(note.id, 'missing', { completed: true })).toBeUndefined()
    expect(store.deleteTodo(note.id, 'missing')).toBe(false)
    expect(store.deleteTodo('missing', 't')).toBe(false)
  })
})

describe('useNotesStore: сохранение и загрузка', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('сохраняет в localStorage с debounce', () => {
    const store = useNotesStore()

    store.createNote({ title: 'Debounce' })
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()
    expect(store.isSaving).toBe(true)

    vi.advanceTimersByTime(NOTES_SAVE_DEBOUNCE_MS - 1)
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()

    vi.advanceTimersByTime(1)
    const saved = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)
    expect(saved.notes).toHaveLength(1)
    expect(saved.schemaVersion).toBe(NOTE_SCHEMA_VERSION)
    expect(store.isSaving).toBe(false)
  })

  it('edge: несколько изменений схлопываются в одно сохранение', () => {
    const store = useNotesStore()
    const note = store.createNote({ title: '1' })

    vi.advanceTimersByTime(NOTES_SAVE_DEBOUNCE_MS / 2)
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()

    store.updateNote(note.id, { title: '2' })
    store.updateNote(note.id, { title: '3' })

    // Таймер перезапускался — половины debounce недостаточно
    vi.advanceTimersByTime(NOTES_SAVE_DEBOUNCE_MS / 2)
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()

    vi.advanceTimersByTime(NOTES_SAVE_DEBOUNCE_MS / 2)
    const saved = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)
    expect(saved.notes).toHaveLength(1)
    expect(saved.notes[0].title).toBe('3')
  })

  it('flushSave сохраняет сразу и сбрасывает таймер', () => {
    const store = useNotesStore()
    store.createNote({ title: 'Flush' })

    store.flushSave()
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeTruthy()
    expect(store.isSaving).toBe(false)

    vi.advanceTimersByTime(NOTES_SAVE_DEBOUNCE_MS)
    const saved = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)
    expect(saved.notes).toHaveLength(1)
  })

  it('hydrate загружает заметки из localStorage', () => {
    saveNotesToStorage([
      makeStoredNote({ id: 'hydrated', title: 'Из хранилища', content: '' }),
    ])

    const store = useNotesStore()
    store.hydrate()

    expect(store.isHydrated).toBe(true)
    expect(store.getNote('hydrated')?.title).toBe('Из хранилища')
  })

  it('edge: hydrate при пустом storage даёт пустой список', () => {
    const store = useNotesStore()
    store.hydrate()

    expect(store.isHydrated).toBe(true)
    expect(store.notes).toEqual([])
  })
})

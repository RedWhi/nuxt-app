import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOTE_SCHEMA_VERSION } from '~/types/note'
import { useNotesStore, NOTES_SAVE_DEBOUNCE_MS } from '~/stores/notes'
import {
  NOTES_STORAGE_KEY,
  loadNotesFromStorage,
  migrateNote,
  saveNotesToStorage,
} from '~/utils/notes-storage'

describe('notes-storage', () => {
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

  it('сохраняет и загружает заметки', () => {
    const notes = [
      {
        id: '1',
        title: 'A',
        content: 'B',
        todos: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        schemaVersion: NOTE_SCHEMA_VERSION,
      },
    ]

    saveNotesToStorage(notes)
    expect(loadNotesFromStorage()).toEqual(notes)
  })

  it('загружает устаревший формат массива', () => {
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
})

describe('useNotesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('создаёт, читает, обновляет и удаляет заметку', () => {
    const store = useNotesStore()

    const created = store.createNote({ title: 'Новая', content: 'Текст' })
    expect(store.notes).toHaveLength(1)
    expect(store.getNote(created.id)?.title).toBe('Новая')

    store.updateNote(created.id, { title: 'Обновлённая' })
    expect(store.getNote(created.id)?.title).toBe('Обновлённая')

    expect(store.deleteNote(created.id)).toBe(true)
    expect(store.notes).toHaveLength(0)
  })

  it('сохраняет в localStorage с debounce', () => {
    const store = useNotesStore()

    store.createNote({ title: 'Debounce' })
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()

    vi.advanceTimersByTime(NOTES_SAVE_DEBOUNCE_MS - 1)
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()

    vi.advanceTimersByTime(1)
    const saved = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)!)
    expect(saved.notes).toHaveLength(1)
    expect(saved.schemaVersion).toBe(NOTE_SCHEMA_VERSION)
  })

  it('поддерживает CRUD для todo', () => {
    const store = useNotesStore()
    const note = store.createNote()

    const todo = store.addTodo(note.id, { text: 'Купить молоко' })
    expect(todo).toBeDefined()
    expect(store.getNote(note.id)?.todos).toHaveLength(1)

    store.updateTodo(note.id, todo!.id, { completed: true })
    expect(store.getNote(note.id)?.todos[0]?.completed).toBe(true)

    expect(store.deleteTodo(note.id, todo!.id)).toBe(true)
    expect(store.getNote(note.id)?.todos).toHaveLength(0)
  })

  it('гидратирует заметки из localStorage', () => {
    saveNotesToStorage([
      {
        id: 'hydrated',
        title: 'Из хранилища',
        content: '',
        todos: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        schemaVersion: NOTE_SCHEMA_VERSION,
      },
    ])

    const store = useNotesStore()
    store.hydrate()

    expect(store.isHydrated).toBe(true)
    expect(store.getNote('hydrated')?.title).toBe('Из хранилища')
  })
})

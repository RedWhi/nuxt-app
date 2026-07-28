import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from '~/stores/notes'
import { NOTE_SCHEMA_VERSION } from '~/types/note'
import { NOTES_STORAGE_KEY, saveNotesToStorage } from '~/utils/notes-storage'

describe('notes syncFromStorage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('подтягивает удаление заметки из localStorage', () => {
    const store = useNotesStore()

    store.notes.push({
      id: 'keep',
      title: 'Оставить',
      content: '',
      todos: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: NOTE_SCHEMA_VERSION,
    })
    store.notes.push({
      id: 'remove',
      title: 'Удалить',
      content: '',
      todos: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: NOTE_SCHEMA_VERSION,
    })
    store.isHydrated = true

    // Другая вкладка оставила только одну заметку
    saveNotesToStorage([store.notes[0]!])
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeTruthy()

    store.syncFromStorage()

    expect(store.notes).toHaveLength(1)
    expect(store.getNote('remove')).toBeUndefined()
    expect(store.getNote('keep')?.title).toBe('Оставить')
  })

  it('не падает, если хранилище ещё не гидратировано', () => {
    const store = useNotesStore()
    expect(store.isHydrated).toBe(false)

    expect(() => store.syncFromStorage()).not.toThrow()
    expect(store.notes).toHaveLength(0)
  })
})

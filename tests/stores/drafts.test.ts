import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDraftsStore, DRAFT_SAVE_DEBOUNCE_MS } from '~/stores/drafts'
import { DRAFT_SCHEMA_VERSION } from '~/types/draft'
import {
  DRAFT_STORAGE_KEY,
  clearDraftStorage,
  isDraftMeaningful,
  loadDraftFromStorage,
  migrateDraft,
  saveDraftToStorage,
} from '~/utils/draft-storage'

describe('draft-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('мигрирует валидный черновик', () => {
    const draft = migrateDraft({
      noteId: null,
      title: 'Черновик',
      content: 'Текст',
      todos: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    })

    expect(draft).toMatchObject({
      title: 'Черновик',
      schemaVersion: DRAFT_SCHEMA_VERSION,
    })
  })

  it('считает пустой черновик незначимым', () => {
    expect(
      isDraftMeaningful({
        noteId: null,
        title: '   ',
        content: '',
        todos: [],
        updatedAt: '2026-01-01T00:00:00.000Z',
        schemaVersion: DRAFT_SCHEMA_VERSION,
      }),
    ).toBe(false)
  })

  it('сохраняет и загружает черновик', () => {
    const draft = {
      noteId: 'n1' as string | null,
      title: 'A',
      content: 'B',
      todos: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: DRAFT_SCHEMA_VERSION,
    }

    saveDraftToStorage(draft)
    expect(loadDraftFromStorage()).toEqual(draft)
  })
})

describe('useDraftsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('сохраняет черновик в localStorage с debounce', () => {
    const store = useDraftsStore()

    store.startDraft({ title: 'Черновик' })
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()

    vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS)
    const saved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!)
    expect(saved.draft.title).toBe('Черновик')
  })

  it('при hydrate предлагает восстановить черновик', () => {
    saveDraftToStorage({
      noteId: null,
      title: 'После перезагрузки',
      content: '',
      todos: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: DRAFT_SCHEMA_VERSION,
    })

    const store = useDraftsStore()
    store.hydrate()

    expect(store.showRestorePrompt).toBe(true)
    expect(store.draft).toBeNull()
    expect(store.pendingRestore?.title).toBe('После перезагрузки')
  })

  it('acceptRestore восстанавливает черновик в редактор', () => {
    saveDraftToStorage({
      noteId: null,
      title: 'Вернуть',
      content: 'Текст',
      todos: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: DRAFT_SCHEMA_VERSION,
    })

    const store = useDraftsStore()
    store.hydrate()
    store.acceptRestore()

    expect(store.showRestorePrompt).toBe(false)
    expect(store.draft?.title).toBe('Вернуть')
    expect(store.hasDraft).toBe(true)
  })

  it('declineRestore удаляет черновик из storage', () => {
    saveDraftToStorage({
      noteId: null,
      title: 'Удалить',
      content: '',
      todos: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: DRAFT_SCHEMA_VERSION,
    })

    const store = useDraftsStore()
    store.hydrate()
    store.declineRestore()

    expect(store.showRestorePrompt).toBe(false)
    expect(store.draft).toBeNull()
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
  })

  it('clearDraft очищает активный черновик и storage', () => {
    const store = useDraftsStore()
    store.startDraft({ title: 'Временный' })
    vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS)

    store.clearDraft()

    expect(store.draft).toBeNull()
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    clearDraftStorage()
  })
})

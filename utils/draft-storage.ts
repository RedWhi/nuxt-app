/**
 * Ручное хранение черновика редактора в localStorage.
 * Отдельный ключ от заметок — черновик не смешивается с сохранённым списком.
 */
import { DRAFT_SCHEMA_VERSION, type NoteDraft } from '~/types/draft'
import type { TodoItem } from '~/types/note'

/** Ключ хранения черновика в localStorage. */
export const DRAFT_STORAGE_KEY = 'nuxt-app:draft'

/** Формат данных черновика в localStorage. */
export interface DraftStoragePayload {
  schemaVersion: number
  draft: NoteDraft
}

function isTodoItem(value: unknown): value is TodoItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string'
    && typeof item.text === 'string'
    && typeof item.completed === 'boolean'
  )
}

function isDraftShape(
  value: unknown,
): value is Omit<NoteDraft, 'schemaVersion'> & { schemaVersion?: number } {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draft = value as Record<string, unknown>

  return (
    (draft.noteId === null || typeof draft.noteId === 'string')
    && typeof draft.title === 'string'
    && typeof draft.content === 'string'
    && Array.isArray(draft.todos)
    && draft.todos.every(isTodoItem)
    && typeof draft.updatedAt === 'string'
  )
}

/**
 * Приводит черновик к текущей версии схемы.
 * Неизвестные/будущие версии отбрасываются.
 */
export function migrateDraft(raw: unknown): NoteDraft | null {
  if (!isDraftShape(raw)) {
    return null
  }

  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0

  if (version > DRAFT_SCHEMA_VERSION) {
    return null
  }

  return {
    noteId: raw.noteId,
    title: raw.title,
    content: raw.content,
    todos: raw.todos.map(todo => ({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
    })),
    updatedAt: raw.updatedAt,
    schemaVersion: DRAFT_SCHEMA_VERSION,
  }
}

function parsePayload(raw: string): DraftStoragePayload | null {
  try {
    const parsed: unknown = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const payload = parsed as Record<string, unknown>

    // Поддержка устаревшего формата: сам объект черновика без обёртки.
    if (isDraftShape(payload) && !('draft' in payload)) {
      return {
        schemaVersion: DRAFT_SCHEMA_VERSION,
        draft: payload as unknown as NoteDraft,
      }
    }

    if (!('draft' in payload)) {
      return null
    }

    return {
      schemaVersion: typeof payload.schemaVersion === 'number'
        ? payload.schemaVersion
        : 0,
      draft: payload.draft as NoteDraft,
    }
  }
  catch {
    return null
  }
}

/** Проверяет, есть ли в черновике непустой контент. */
export function isDraftMeaningful(draft: NoteDraft): boolean {
  return (
    draft.title.trim().length > 0
    || draft.content.trim().length > 0
    || draft.todos.length > 0
  )
}

/** Загружает и мигрирует черновик из localStorage. */
export function loadDraftFromStorage(): NoteDraft | null {
  if (!import.meta.client) {
    return null
  }

  const raw = localStorage.getItem(DRAFT_STORAGE_KEY)

  if (!raw) {
    return null
  }

  const payload = parsePayload(raw)

  if (!payload) {
    return null
  }

  if (payload.schemaVersion > DRAFT_SCHEMA_VERSION) {
    console.warn(
      `[draft-storage] Неизвестная версия схемы хранилища: ${payload.schemaVersion}`,
    )
    return null
  }

  const draft = migrateDraft(payload.draft)

  if (!draft || !isDraftMeaningful(draft)) {
    return null
  }

  return draft
}

/** Сохраняет черновик в localStorage. */
export function saveDraftToStorage(draft: NoteDraft): void {
  if (!import.meta.client) {
    return
  }

  const payload: DraftStoragePayload = {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    draft,
  }

  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
}

/** Удаляет черновик из localStorage. */
export function clearDraftStorage(): void {
  if (!import.meta.client) {
    return
  }

  localStorage.removeItem(DRAFT_STORAGE_KEY)
}

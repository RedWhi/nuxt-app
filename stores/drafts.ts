import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  DRAFT_SCHEMA_VERSION,
  type NoteDraft,
  type NoteDraftInput,
} from '~/types/draft'
import {
  clearDraftStorage,
  isDraftMeaningful,
  loadDraftFromStorage,
  saveDraftToStorage,
} from '~/utils/draft-storage'

/** Задержка debounced-сохранения черновика (мс). */
export const DRAFT_SAVE_DEBOUNCE_MS = 300

function nowIso(): string {
  return new Date().toISOString()
}

function createEmptyDraft(noteId: string | null = null): NoteDraft {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    noteId,
    title: '',
    content: '',
    todos: [],
    updatedAt: nowIso(),
  }
}

export const useDraftsStore = defineStore('drafts', () => {
  /** Активный черновик в редакторе. */
  const draft = ref<NoteDraft | null>(null)
  /** Черновик, найденный после перезагрузки и ожидающий решения пользователя. */
  const pendingRestore = ref<NoteDraft | null>(null)
  const isHydrated = ref(false)
  const isSaving = ref(false)

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  const hasDraft = computed(() => draft.value !== null && isDraftMeaningful(draft.value))
  const showRestorePrompt = computed(() => pendingRestore.value !== null)

  /** Планирует отложенное сохранение черновика. */
  function scheduleSave(): void {
    if (!import.meta.client || !draft.value) {
      return
    }

    if (!isDraftMeaningful(draft.value)) {
      clearDraftStorage()
      isSaving.value = false
      return
    }

    if (saveTimer !== null) {
      clearTimeout(saveTimer)
    }

    isSaving.value = true
    saveTimer = setTimeout(() => {
      if (draft.value && isDraftMeaningful(draft.value)) {
        saveDraftToStorage(draft.value)
      }
      else {
        clearDraftStorage()
      }
      saveTimer = null
      isSaving.value = false
    }, DRAFT_SAVE_DEBOUNCE_MS)
  }

  /** Немедленно сохраняет черновик, сбрасывая debounce. */
  function flushSave(): void {
    if (!import.meta.client) {
      return
    }

    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }

    if (draft.value && isDraftMeaningful(draft.value)) {
      saveDraftToStorage(draft.value)
    }
    else {
      clearDraftStorage()
    }

    isSaving.value = false
  }

  /**
   * Загружает черновик из localStorage.
   * Если есть осмысленный черновик — предлагает восстановить.
   */
  function hydrate(): void {
    const stored = loadDraftFromStorage()

    if (stored) {
      pendingRestore.value = stored
    }

    isHydrated.value = true
  }

  /** Начинает новый черновик или продолжает редактирование. */
  function startDraft(input: NoteDraftInput = {}): NoteDraft {
    const next: NoteDraft = {
      ...createEmptyDraft(input.noteId ?? null),
      title: input.title ?? '',
      content: input.content ?? '',
      todos: input.todos?.map(todo => ({ ...todo })) ?? [],
      updatedAt: nowIso(),
    }

    draft.value = next
    scheduleSave()
    return next
  }

  /** Обновляет поля активного черновика. */
  function updateDraft(patch: NoteDraftInput): NoteDraft | null {
    if (!draft.value) {
      return startDraft(patch)
    }

    draft.value = {
      ...draft.value,
      noteId: patch.noteId !== undefined ? patch.noteId : draft.value.noteId,
      title: patch.title ?? draft.value.title,
      content: patch.content ?? draft.value.content,
      todos: patch.todos
        ? patch.todos.map(todo => ({ ...todo }))
        : draft.value.todos,
      updatedAt: nowIso(),
      schemaVersion: DRAFT_SCHEMA_VERSION,
    }

    scheduleSave()
    return draft.value
  }

  /** Удаляет активный черновик и очищает localStorage. */
  function clearDraft(): void {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }

    draft.value = null
    isSaving.value = false
    clearDraftStorage()
  }

  /** Восстанавливает черновик, предложенный после перезагрузки. */
  function acceptRestore(): NoteDraft | null {
    if (!pendingRestore.value) {
      return null
    }

    draft.value = {
      ...pendingRestore.value,
      todos: pendingRestore.value.todos.map(todo => ({ ...todo })),
    }
    pendingRestore.value = null
    flushSave()
    return draft.value
  }

  /** Отклоняет восстановление и удаляет сохранённый черновик. */
  function declineRestore(): void {
    pendingRestore.value = null
    clearDraftStorage()
  }

  /** Закрывает баннер без удаления (оставить в storage на потом). */
  function dismissRestorePrompt(): void {
    pendingRestore.value = null
  }

  return {
    draft,
    pendingRestore,
    isHydrated,
    isSaving,
    hasDraft,
    showRestorePrompt,
    hydrate,
    scheduleSave,
    flushSave,
    startDraft,
    updateDraft,
    clearDraft,
    acceptRestore,
    declineRestore,
    dismissRestorePrompt,
  }
})

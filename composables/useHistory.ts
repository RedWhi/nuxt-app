import { computed } from 'vue'
import {
  HISTORY_LIMIT,
  type HistoryAction,
  type HistoryState,
  type HistoryStore,
} from '~/types/history'
import { applyHistoryAction, invertAction } from '~/utils/history-actions'

function createHistoryEntry(action: HistoryAction): HistoryState {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
  }
}

/**
 * Композабл undo/redo.
 *
 * Стеки живут в `useState` (общие на вкладку), но по требованиям ТЗ
 * история привязана к сессии редактирования: страница edit вызывает
 * `clear()` при сохранении, отмене и при входе в новую сессию.
 *
 * Храним только атомарные диффы (до HISTORY_LIMIT), без снимков всего списка.
 */
export function useHistory() {
  /** Стек уже применённых шагов (undo снимает с конца). */
  const past = useState<HistoryState[]>('notes-history-past', () => [])
  /** Стек отменённых шагов (redo возвращает в past). */
  const future = useState<HistoryState[]>('notes-history-future', () => [])
  /** Флаг, чтобы store/UI не писали в историю во время undo/redo. */
  const isApplying = useState<boolean>('notes-history-applying', () => false)

  const notesStore = useNotesStore()

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  const historyStore = computed<HistoryStore>(() => ({
    past: past.value,
    future: future.value,
  }))

  function trimPast(): void {
    if (past.value.length > HISTORY_LIMIT) {
      past.value = past.value.slice(past.value.length - HISTORY_LIMIT)
    }
  }

  function applyToNotes(action: HistoryAction): void {
    isApplying.value = true
    try {
      applyHistoryAction(notesStore.notes, action)
      notesStore.scheduleSave()
    }
    finally {
      isApplying.value = false
    }
  }

  /**
   * Записывает уже применённое изменение в историю.
   * Очищает стек redo и обрезает past до HISTORY_LIMIT.
   */
  function record(action: HistoryAction): HistoryState {
    const entry = createHistoryEntry(action)
    past.value.push(entry)
    future.value = []
    trimPast()
    return entry
  }

  /**
   * Атомарно применяет действие и записывает его в историю.
   */
  function commit(action: HistoryAction): HistoryState {
    applyToNotes(action)
    return record(action)
  }

  function undo(): boolean {
    const entry = past.value.pop()

    if (!entry) {
      return false
    }

    const inverse = invertAction(entry.action)
    applyToNotes(inverse)
    future.value.push(entry)
    return true
  }

  function redo(): boolean {
    const entry = future.value.pop()

    if (!entry) {
      return false
    }

    applyToNotes(entry.action)
    past.value.push(entry)
    trimPast()
    return true
  }

  /** Сброс стеков — конец сессии редактирования (save / cancel / delete). */
  function clear(): void {
    past.value = []
    future.value = []
  }

  return {
    past,
    future,
    historyStore,
    isApplying,
    canUndo,
    canRedo,
    record,
    commit,
    undo,
    redo,
    clear,
  }
}

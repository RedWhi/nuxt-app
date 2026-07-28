import { onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

/** Типы input, в которых браузер ведёт собственный undo/redo. */
const NATIVE_UNDO_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
])

export interface KeyboardShortcutsOptions {
  /** Включить обработку горячих клавиш (по умолчанию true). */
  enabled?: MaybeRefOrGetter<boolean>
  /** Обработчик Ctrl/Cmd+Z. По умолчанию — history.undo(). */
  onUndo?: () => void
  /** Обработчик Shift+Ctrl/Cmd+Z. По умолчанию — history.redo(). */
  onRedo?: () => void
}

/**
 * Проверяет, находится ли фокус в поле с нативным undo/redo.
 * В таких случаях глобальные Ctrl+Z / Shift+Ctrl+Z не перехватываем.
 */
export function isNativeUndoTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled
  }

  if (target instanceof HTMLInputElement) {
    if (target.readOnly || target.disabled) {
      return false
    }

    return NATIVE_UNDO_INPUT_TYPES.has(target.type.toLowerCase())
  }

  const contentEditableAttr = target.getAttribute('contenteditable')
  const contentEditableProp = target.contentEditable

  if (
    target.isContentEditable
    || contentEditableProp === 'true'
    || contentEditableAttr === 'true'
    || contentEditableAttr === ''
  ) {
    return true
  }

  return Boolean(
    target.closest('[contenteditable="true"], [contenteditable=""]'),
  )
}

function isUndoShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase()
  return key === 'z' && !event.shiftKey
}

function isRedoShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase()
  // Shift+Ctrl+Z / Shift+Cmd+Z; Ctrl+Y — распространённый алиас на Windows
  return (key === 'z' && event.shiftKey) || key === 'y'
}

/** Создаёт обработчик keydown для undo/redo без привязки к lifecycle. */
export function createKeyboardShortcutHandler(
  options: KeyboardShortcutsOptions & {
    undo: () => void
    redo: () => void
  },
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (toValue(options.enabled) === false) {
      return
    }

    const hasModifier = event.ctrlKey || event.metaKey

    if (!hasModifier || event.altKey) {
      return
    }

    const undo = isUndoShortcut(event)
    const redo = isRedoShortcut(event)

    if (!undo && !redo) {
      return
    }

    // Отдаём приоритет нативному undo/redo в input / textarea / contenteditable
    if (isNativeUndoTarget(event.target)) {
      return
    }

    event.preventDefault()

    if (undo) {
      options.undo()
      return
    }

    options.redo()
  }
}

/**
 * Глобальные горячие клавиши undo/redo на странице редактирования.
 * Не конфликтует с нативным undo внутри текстовых полей.
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const history = useHistory()

  const onKeydown = createKeyboardShortcutHandler({
    ...options,
    undo: () => {
      if (options.onUndo) {
        options.onUndo()
        return
      }

      history.undo()
    },
    redo: () => {
      if (options.onRedo) {
        options.onRedo()
        return
      }

      history.redo()
    },
  })

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
  })

  return {
    isNativeUndoTarget,
    onKeydown,
  }
}

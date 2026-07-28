import { describe, expect, it, vi } from 'vitest'
import {
  createKeyboardShortcutHandler,
  isNativeUndoTarget,
} from '~/composables/useKeyboardShortcuts'

function createCtrlZEvent(
  target: EventTarget,
  options: { shiftKey?: boolean; key?: string } = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: options.key ?? 'z',
    ctrlKey: true,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  })

  Object.defineProperty(event, 'target', { value: target })
  return event
}

describe('isNativeUndoTarget', () => {
  it('считает textarea целью нативного undo', () => {
    expect(isNativeUndoTarget(document.createElement('textarea'))).toBe(true)
  })

  it('считает текстовый input целью нативного undo', () => {
    const input = document.createElement('input')
    input.type = 'text'
    expect(isNativeUndoTarget(input)).toBe(true)
  })

  it('не считает checkbox целью нативного undo', () => {
    const input = document.createElement('input')
    input.type = 'checkbox'
    expect(isNativeUndoTarget(input)).toBe(false)
  })

  it('считает contenteditable целью нативного undo', () => {
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    expect(isNativeUndoTarget(div)).toBe(true)
  })

  it('не считает обычный div целью нативного undo', () => {
    expect(isNativeUndoTarget(document.createElement('div'))).toBe(false)
  })
})

describe('createKeyboardShortcutHandler', () => {
  it('не перехватывает Ctrl+Z внутри текстового поля', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const handler = createKeyboardShortcutHandler({ undo, redo })

    const textarea = document.createElement('textarea')
    const event = createCtrlZEvent(textarea)
    const preventSpy = vi.spyOn(event, 'preventDefault')

    handler(event)

    expect(preventSpy).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
  })

  it('перехватывает Ctrl+Z вне текстовых полей', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const handler = createKeyboardShortcutHandler({ undo, redo })

    const event = createCtrlZEvent(document.body)
    const preventSpy = vi.spyOn(event, 'preventDefault')

    handler(event)

    expect(preventSpy).toHaveBeenCalled()
    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).not.toHaveBeenCalled()
  })

  it('перехватывает Shift+Ctrl+Z как redo вне полей', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const handler = createKeyboardShortcutHandler({ undo, redo })

    const event = createCtrlZEvent(document.body, { shiftKey: true })
    handler(event)

    expect(redo).toHaveBeenCalledTimes(1)
    expect(undo).not.toHaveBeenCalled()
  })

  it('поддерживает Ctrl+Y как redo', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const handler = createKeyboardShortcutHandler({ undo, redo })

    const event = createCtrlZEvent(document.body, { key: 'y' })
    handler(event)

    expect(redo).toHaveBeenCalledTimes(1)
  })
})

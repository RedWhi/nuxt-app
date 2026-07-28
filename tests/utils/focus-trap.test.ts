import { describe, expect, it, vi } from 'vitest'
import {
  focusInitial,
  getFocusableElements,
  trapFocus,
} from '~/utils/focus-trap'

describe('focus-trap', () => {
  it('собирает фокусируемые элементы', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <button type="button">A</button>
      <button type="button" disabled>B</button>
      <input type="text" />
      <a href="#">C</a>
    `
    document.body.appendChild(root)

    const focusable = getFocusableElements(root)
    expect(focusable.map(el => el.tagName)).toEqual(['BUTTON', 'INPUT', 'A'])

    document.body.removeChild(root)
  })

  it('зацикливает Tab с последнего на первый', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <button type="button" id="first">First</button>
      <button type="button" id="last">Last</button>
    `
    document.body.appendChild(root)

    const last = root.querySelector<HTMLElement>('#last')!
    last.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    const preventSpy = vi.spyOn(event, 'preventDefault')

    const handled = trapFocus(root, event)

    expect(handled).toBe(true)
    expect(preventSpy).toHaveBeenCalled()
    expect(document.activeElement?.id).toBe('first')

    document.body.removeChild(root)
  })

  it('зацикливает Shift+Tab с первого на последний', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <button type="button" id="first">First</button>
      <button type="button" id="last">Last</button>
    `
    document.body.appendChild(root)

    const first = root.querySelector<HTMLElement>('#first')!
    first.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })

    trapFocus(root, event)

    expect(document.activeElement?.id).toBe('last')

    document.body.removeChild(root)
  })

  it('ставит начальный фокус на data-autofocus', () => {
    const root = document.createElement('div')
    root.tabIndex = -1
    root.innerHTML = `
      <button type="button">Cancel</button>
      <button type="button" data-autofocus id="confirm">Confirm</button>
    `
    document.body.appendChild(root)

    focusInitial(root)

    expect(document.activeElement?.id).toBe('confirm')

    document.body.removeChild(root)
  })
})

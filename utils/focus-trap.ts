/**
 * Focus-trap для модалок: Tab циклически внутри контейнера.
 * Escape обрабатывается в AppModal (глобальный document keydown).
 */

/** Селектор элементов, которые можно сфокусировать с клавиатуры. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function isVisible(element: HTMLElement): boolean {
  return !!(
    element.offsetWidth
    || element.offsetHeight
    || element.getClientRects().length
  )
}

/** Возвращает видимые фокусируемые элементы внутри контейнера. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => {
    if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
      return false
    }

    return isVisible(element)
  })
}

/**
 * Удерживает фокус внутри контейнера (Tab / Shift+Tab).
 * Возвращает true, если событие обработано.
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') {
    return false
  }

  const focusable = getFocusableElements(container)

  if (focusable.length === 0) {
    event.preventDefault()
    container.focus()
    return true
  }

  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  const active = document.activeElement as HTMLElement | null

  if (event.shiftKey) {
    if (active === first || active === container || !container.contains(active)) {
      event.preventDefault()
      last.focus()
      return true
    }

    return false
  }

  if (active === last) {
    event.preventDefault()
    first.focus()
    return true
  }

  return false
}

/** Ставит начальный фокус: initialFocus, иначе первый фокусируемый, иначе контейнер. */
export function focusInitial(
  container: HTMLElement,
  initialFocus?: HTMLElement | null,
): void {
  if (initialFocus && container.contains(initialFocus)) {
    initialFocus.focus()
    return
  }

  const autofocus = container.querySelector<HTMLElement>('[data-autofocus]')
  if (autofocus) {
    autofocus.focus()
    return
  }

  const focusable = getFocusableElements(container)
  const first = focusable[0]

  if (first) {
    first.focus()
    return
  }

  container.focus()
}

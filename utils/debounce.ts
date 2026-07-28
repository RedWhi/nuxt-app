/**
 * Откладывает вызов функции на `waitMs`.
 * Повторные вызовы сбрасывают таймер (trailing debounce).
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number,
): ((...args: TArgs) => void) & {
  cancel: () => void
  flush: (...args: TArgs) => void
  isPending: () => boolean
} {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: TArgs | null = null

  const cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    lastArgs = null
  }

  const run = (...args: TArgs): void => {
    lastArgs = args

    if (timer !== null) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = null
      const pendingArgs = lastArgs
      lastArgs = null
      if (pendingArgs) {
        fn(...pendingArgs)
      }
    }, waitMs)
  }

  run.cancel = cancel

  run.flush = (...args: TArgs): void => {
    cancel()
    fn(...args)
  }

  run.isPending = (): boolean => timer !== null

  return run
}

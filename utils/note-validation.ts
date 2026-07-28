/** Запасной заголовок для пустого названия. */
export const EMPTY_TITLE_FALLBACK = 'Без названия'

/** Сообщение при пустом тексте задачи. */
export const EMPTY_TODO_TEXT_ERROR = 'Текст задачи не может быть пустым'

/** Сообщение при попытке добавить пустую задачу. */
export const EMPTY_TODO_ADD_ERROR = 'Введите текст задачи'

export function isBlank(value: string): boolean {
  return value.trim().length === 0
}

export function normalizeTitle(title: string): string {
  return title.trim()
}

export function normalizeTodoText(text: string): string {
  return text.trim()
}

/** Отображаемое название заметки (с fallback). */
export function displayNoteTitle(title: string): string {
  const normalized = normalizeTitle(title)
  return normalized || EMPTY_TITLE_FALLBACK
}

/** Проверяет, можно ли сохранить текст задачи. */
export function validateTodoText(text: string): string | null {
  if (isBlank(text)) {
    return EMPTY_TODO_TEXT_ERROR
  }

  return null
}

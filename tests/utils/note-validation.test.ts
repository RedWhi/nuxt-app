import { describe, expect, it } from 'vitest'
import {
  EMPTY_TITLE_FALLBACK,
  EMPTY_TODO_ADD_ERROR,
  EMPTY_TODO_TEXT_ERROR,
  displayNoteTitle,
  isBlank,
  normalizeTitle,
  normalizeTodoText,
  validateTodoText,
} from '~/utils/note-validation'

describe('note-validation', () => {
  it('считает пробелы пустой строкой', () => {
    expect(isBlank('')).toBe(true)
    expect(isBlank('   ')).toBe(true)
    expect(isBlank('a')).toBe(false)
  })

  it('нормализует название и текст todo', () => {
    expect(normalizeTitle('  Hello  ')).toBe('Hello')
    expect(normalizeTodoText('  Купить молоко  ')).toBe('Купить молоко')
  })

  it('подставляет fallback для пустого названия', () => {
    expect(displayNoteTitle('')).toBe(EMPTY_TITLE_FALLBACK)
    expect(displayNoteTitle('   ')).toBe(EMPTY_TITLE_FALLBACK)
    expect(displayNoteTitle('Заметка')).toBe('Заметка')
  })

  it('валидирует пустой текст задачи', () => {
    expect(validateTodoText('')).toBe(EMPTY_TODO_TEXT_ERROR)
    expect(validateTodoText('   ')).toBe(EMPTY_TODO_TEXT_ERROR)
    expect(validateTodoText('Сделать')).toBeNull()
    expect(EMPTY_TODO_ADD_ERROR.length).toBeGreaterThan(0)
  })
})

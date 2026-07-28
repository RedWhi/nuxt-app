import { describe, expect, it, vi } from 'vitest'
import { debounce } from '~/utils/debounce'
import { notesContentEqual, sortNotesByUpdatedAt, todosEqual } from '~/utils/note-compare'
import { NOTE_SCHEMA_VERSION, type Note } from '~/types/note'

describe('debounce', () => {
  it('вызывает функцию один раз после паузы', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const run = debounce(fn, 200)

    run('a')
    run('b')
    run('c')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(199)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')

    vi.useRealTimers()
  })

  it('flush вызывает немедленно, cancel отменяет', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const run = debounce(fn, 300)

    run('x')
    run.flush('y')
    expect(fn).toHaveBeenCalledWith('y')

    run('z')
    run.cancel()
    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})

describe('note-compare', () => {
  const base: Note = {
    id: 'n1',
    title: 'A',
    content: 'B',
    todos: [{ id: 't1', text: 'x', completed: false }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: NOTE_SCHEMA_VERSION,
  }

  it('сравнивает todos и заметки без JSON.stringify', () => {
    expect(todosEqual(base.todos, [{ id: 't1', text: 'x', completed: false }])).toBe(true)
    expect(todosEqual(base.todos, [{ id: 't1', text: 'y', completed: false }])).toBe(false)
    expect(notesContentEqual(base, { ...base })).toBe(true)
    expect(notesContentEqual(base, { ...base, title: 'Z' })).toBe(false)
  })

  it('сортирует по updatedAt desc', () => {
    const sorted = sortNotesByUpdatedAt([
      { ...base, id: 'old', updatedAt: '2026-01-01T00:00:00.000Z' },
      { ...base, id: 'new', updatedAt: '2026-02-01T00:00:00.000Z' },
    ])

    expect(sorted.map(n => n.id)).toEqual(['new', 'old'])
  })
})

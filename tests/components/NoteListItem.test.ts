import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NoteListItem from '~/components/NoteListItem.vue'
import { NOTE_SCHEMA_VERSION, type Note } from '~/types/note'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: 'Покупки',
    content: '',
    todos: [
      { id: 't1', text: 'Молоко', completed: false },
      { id: 't2', text: 'Хлеб', completed: true },
      { id: 't3', text: 'Яйца', completed: false },
      { id: 't4', text: 'Сыр', completed: false },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: NOTE_SCHEMA_VERSION,
    ...overrides,
  }
}

describe('NoteListItem', () => {
  it('показывает заголовок и первые 3 todo', () => {
    const wrapper = mount(NoteListItem, {
      props: { note: makeNote() },
    })

    expect(wrapper.text()).toContain('Покупки')
    expect(wrapper.findAll('.note-item__todo')).toHaveLength(3)
    expect(wrapper.text()).toContain('и ещё 1')
    expect(wrapper.text()).not.toContain('Сыр')
  })

  it('не рендерит интерактивные checkbox', () => {
    const wrapper = mount(NoteListItem, {
      props: { note: makeNote() },
    })

    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
  })

  it('эмитит edit и delete', async () => {
    const wrapper = mount(NoteListItem, {
      props: { note: makeNote() },
    })

    await wrapper.get('button.note-item__button--ghost').trigger('click')
    await wrapper.get('button.note-item__button--danger').trigger('click')

    expect(wrapper.emitted('edit')?.[0]).toEqual(['n1'])
    expect(wrapper.emitted('delete')?.[0]).toEqual(['n1'])
  })
})

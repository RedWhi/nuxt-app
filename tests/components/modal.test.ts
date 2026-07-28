import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import AppModal from '~/components/AppModal.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'

describe('AppModal', () => {
  it('портирует диалог в body через Teleport', async () => {
    const wrapper = mount(AppModal, {
      props: {
        open: true,
        title: 'Заголовок',
      },
      attachTo: document.body,
      slots: {
        default: '<p>Содержимое</p>',
      },
    })

    await nextTick()

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.querySelector('.modal__title')?.textContent).toContain('Заголовок')

    wrapper.unmount()
  })

  it('закрывается по Escape', async () => {
    const wrapper = mount(AppModal, {
      props: {
        open: true,
        title: 'Escape',
      },
      attachTo: document.body,
    })

    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }))

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    expect(wrapper.emitted('close')).toBeTruthy()

    wrapper.unmount()
  })

  it('закрывается по Escape при монтировании уже открытой (Lazy*)', async () => {
    const wrapper = mount(AppModal, {
      props: {
        open: true,
        title: 'Lazy open',
      },
      attachTo: document.body,
    })

    await nextTick()

    // Фокус сознательно оставляем снаружи модалки
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }))

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])

    outside.remove()
    wrapper.unmount()
  })

  it('закрывается по клику на оверлей', async () => {
    const wrapper = mount(AppModal, {
      props: {
        open: true,
        title: 'Overlay',
      },
      attachTo: document.body,
    })

    await nextTick()

    document.body.querySelector<HTMLElement>('.modal__overlay')!.click()
    await nextTick()

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])

    wrapper.unmount()
  })
})

describe('ConfirmDialog', () => {
  it('эмитит confirm и закрывается', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        title: 'Удалить?',
        message: 'Действие необратимо',
        confirmLabel: 'Удалить',
        variant: 'danger',
      },
      attachTo: document.body,
      global: {
        stubs: {
          // Рендерим реальный AppModal — он уже зарегистрирован как импорт в SFC
        },
      },
    })

    await nextTick()

    const confirmButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Удалить') && button.hasAttribute('data-autofocus'))

    expect(confirmButton).toBeTruthy()
    confirmButton!.click()
    await nextTick()

    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])

    wrapper.unmount()
  })

  it('эмитит cancel при отмене', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        title: 'Подтвердите',
        cancelLabel: 'Отмена',
      },
      attachTo: document.body,
    })

    await nextTick()

    const cancelButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Отмена')

    cancelButton!.click()
    await nextTick()

    expect(wrapper.emitted('cancel')).toBeTruthy()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])

    wrapper.unmount()
  })
})

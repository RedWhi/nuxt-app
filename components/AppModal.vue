<script setup lang="ts">
import { focusInitial, trapFocus } from '~/utils/focus-trap'

const props = withDefaults(defineProps<{
  /** Открыто ли модальное окно. */
  open: boolean
  /** Заголовок (для aria и слота по умолчанию). */
  title?: string
  /** Закрывать по Escape. */
  closeOnEscape?: boolean
  /** Закрывать по клику на оверлей. */
  closeOnOverlay?: boolean
  /** id элемента с описанием (aria-describedby). */
  ariaDescribedby?: string
  /** role диалога: dialog или alertdialog. */
  role?: 'dialog' | 'alertdialog'
}>(), {
  closeOnEscape: true,
  closeOnOverlay: true,
  role: 'dialog',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

const titleId = useId()
const dialogRef = ref<HTMLElement | null>(null)
const previouslyFocused = ref<HTMLElement | null>(null)

const labelledBy = computed(() => (props.title ? titleId : undefined))

function close(): void {
  emit('update:open', false)
  emit('close')
}

function onOverlayClick(): void {
  if (props.closeOnOverlay) {
    close()
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (!dialogRef.value) {
    return
  }

  if (event.key === 'Escape' && props.closeOnEscape) {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }

  trapFocus(dialogRef.value, event)
}

function lockBodyScroll(locked: boolean): void {
  if (!import.meta.client) {
    return
  }

  document.body.style.overflow = locked ? 'hidden' : ''
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!import.meta.client) {
      return
    }

    if (isOpen) {
      previouslyFocused.value = document.activeElement as HTMLElement | null
      lockBodyScroll(true)
      await nextTick()
      if (dialogRef.value) {
        focusInitial(dialogRef.value)
      }
      return
    }

    lockBodyScroll(false)
    previouslyFocused.value?.focus?.()
    previouslyFocused.value = null
  },
)

onUnmounted(() => {
  lockBodyScroll(false)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="modal"
        @keydown="onKeydown"
      >
        <div
          class="modal__overlay"
          aria-hidden="true"
          @click="onOverlayClick"
        />

        <div
          ref="dialogRef"
          class="modal__dialog"
          :role="role"
          aria-modal="true"
          :aria-labelledby="labelledBy"
          :aria-describedby="ariaDescribedby"
          tabindex="-1"
        >
          <header v-if="title || $slots.header" class="modal__header">
            <slot name="header">
              <h2 :id="titleId" class="modal__title">
                {{ title }}
              </h2>
            </slot>

            <button
              type="button"
              class="modal__close"
              aria-label="Закрыть"
              @click="close"
            >
              ×
            </button>
          </header>

          <div class="modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-md;

  &__overlay {
    position: absolute;
    inset: 0;
    background: rgb(15 23 42 / 45%);
  }

  &__dialog {
    position: relative;
    z-index: 1;
    width: min(480px, 100%);
    max-height: min(90vh, 720px);
    overflow: auto;
    background: #fff;
    border-radius: $radius-md;
    border: 1px solid $color-border;
    box-shadow: 0 16px 40px rgb(15 23 42 / 18%);
    outline: none;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $spacing-md;
    padding: $spacing-lg $spacing-lg $spacing-sm;
  }

  &__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
  }

  &__close {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: $radius-md;
    background: transparent;
    color: $color-text-muted;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: #f1f5f9;
      color: #1e293b;
    }
  }

  &__body {
    padding: $spacing-sm $spacing-lg $spacing-lg;
    color: #334155;
    line-height: 1.5;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;
    padding: 0 $spacing-lg $spacing-lg;
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;

  .modal__dialog {
    transition: transform 0.18s ease, opacity 0.18s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal__dialog {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
</style>

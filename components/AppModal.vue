<script setup lang="ts">
/**
 * Базовая модалка: Teleport → body, focus-trap, Escape / оверлей.
 * Escape и Tab слушаются на document (capture), чтобы работать
 * даже при Lazy*-монтировании уже с open=true и фокусе снаружи.
 */
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

/** Глобальный keydown: Escape и focus-trap работают даже если фокус ещё снаружи. */
function onDocumentKeydown(event: KeyboardEvent): void {
  if (!props.open || !dialogRef.value) {
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

function bindDocumentKeydown(bound: boolean): void {
  if (!import.meta.client) {
    return
  }

  if (bound) {
    document.addEventListener('keydown', onDocumentKeydown, true)
    return
  }

  document.removeEventListener('keydown', onDocumentKeydown, true)
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
      bindDocumentKeydown(true)
      await nextTick()
      if (dialogRef.value) {
        focusInitial(dialogRef.value)
      }
      return
    }

    bindDocumentKeydown(false)
    lockBodyScroll(false)
    previouslyFocused.value?.focus?.()
    previouslyFocused.value = null
  },
  { immediate: true },
)

onUnmounted(() => {
  bindDocumentKeydown(false)
  lockBodyScroll(false)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="modal"
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
  z-index: $z-modal;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: $spacing-md;
  padding-bottom: max($spacing-md, env(safe-area-inset-bottom));

  @include respond-up(sm) {
    align-items: center;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: $color-overlay;
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }

  &__dialog {
    position: relative;
    z-index: 1;
    width: min(28rem, 100%);
    max-height: min(90vh, 40rem);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    background: $color-bg-elevated;
    border-radius: $radius-lg $radius-lg $radius-md $radius-md;
    border: 1px solid $color-border;
    box-shadow: $shadow-lg;
    outline: none;

    @include respond-up(sm) {
      border-radius: $radius-lg;
    }
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
    font-family: $font-display;
    font-size: 1.3rem;
    font-weight: 650;
    color: $color-ink;
  }

  &__close {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border: none;
    border-radius: $radius-md;
    background: transparent;
    color: $color-text-muted;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    transition: background-color $transition-fast, color $transition-fast;

    &:hover,
    &:focus-visible {
      background: $color-bg-muted;
      color: $color-ink;
    }

    &:focus-visible {
      @include focus-ring;
    }
  }

  &__body {
    padding: $spacing-sm $spacing-lg $spacing-lg;
    color: $color-ink-soft;
    line-height: 1.55;
  }

  &__footer {
    display: flex;
    flex-direction: column-reverse;
    gap: $spacing-sm;
    padding: 0 $spacing-lg $spacing-lg;

    @include respond-up(sm) {
      flex-direction: row;
      justify-content: flex-end;
    }

    :deep(button) {
      width: 100%;

      @include respond-up(sm) {
        width: auto;
      }
    }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity $transition-base;

  .modal__dialog {
    transition: transform $transition-base, opacity $transition-base;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal__dialog {
    opacity: 0;
    transform: translateY(12px);

    @include respond-up(sm) {
      transform: translateY(8px) scale(0.98);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal__dialog,
  .modal-leave-active .modal__dialog {
    transition: none;
  }
}
</style>

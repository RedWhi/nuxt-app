<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Открыто ли окно подтверждения. */
  open: boolean
  /** Заголовок. */
  title: string
  /** Текст сообщения. */
  message?: string
  /** Подпись кнопки подтверждения. */
  confirmLabel?: string
  /** Подпись кнопки отмены. */
  cancelLabel?: string
  /** Визуальный вариант кнопки подтверждения. */
  variant?: 'primary' | 'danger'
  /** Закрывать по клику на оверлей. */
  closeOnOverlay?: boolean
}>(), {
  message: '',
  confirmLabel: 'Подтвердить',
  cancelLabel: 'Отмена',
  variant: 'primary',
  closeOnOverlay: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

const descriptionId = useId()

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => {
    emit('update:open', value)
  },
})

function onConfirm(): void {
  emit('confirm')
  openModel.value = false
}

function onCancel(): void {
  emit('cancel')
  openModel.value = false
}
</script>

<template>
  <AppModal
    v-model:open="openModel"
    :title="title"
    role="alertdialog"
    :aria-describedby="message ? descriptionId : undefined"
    :close-on-overlay="closeOnOverlay"
    @close="onCancel"
  >
    <p
      v-if="message"
      :id="descriptionId"
      class="confirm-dialog__message"
    >
      {{ message }}
    </p>
    <slot />

    <template #footer>
      <button
        type="button"
        class="confirm-dialog__button confirm-dialog__button--ghost"
        @click="onCancel"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="confirm-dialog__button"
        :class="`confirm-dialog__button--${variant}`"
        data-autofocus
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </AppModal>
</template>

<style lang="scss" scoped>
.confirm-dialog {
  &__message {
    margin: 0;
    color: $color-text-muted;
  }

  &__button {
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;
    border: 1px solid transparent;
    font: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;

    &:focus-visible {
      outline: 2px solid rgba($color-primary, 0.45);
      outline-offset: 2px;
    }

    &--ghost {
      background: transparent;
      border-color: $color-border;
      color: $color-text-muted;

      &:hover {
        border-color: #cbd5e1;
        color: #1e293b;
      }
    }

    &--primary {
      background-color: $color-primary;
      color: #fff;

      &:hover {
        background-color: $color-primary-dark;
      }
    }

    &--danger {
      background-color: #dc2626;
      color: #fff;

      &:hover {
        background-color: #b91c1c;
      }
    }
  }
}
</style>

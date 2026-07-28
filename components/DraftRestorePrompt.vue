<script setup lang="ts">
const draftsStore = useDraftsStore()

const previewTitle = computed(() => {
  const draft = draftsStore.pendingRestore
  if (!draft) {
    return ''
  }

  const title = draft.title.trim()
  if (title) {
    return title
  }

  const content = draft.content.trim()
  if (content) {
    return content.length > 60 ? `${content.slice(0, 60)}…` : content
  }

  return 'Без названия'
})

function restore(): void {
  draftsStore.acceptRestore()
}

function discard(): void {
  draftsStore.declineRestore()
}
</script>

<template>
  <div
    v-if="draftsStore.showRestorePrompt"
    class="draft-restore"
    role="alertdialog"
    aria-labelledby="draft-restore-title"
    aria-describedby="draft-restore-desc"
  >
    <div class="draft-restore__body">
      <p id="draft-restore-title" class="draft-restore__title">
        Восстановить черновик?
      </p>
      <p id="draft-restore-desc" class="draft-restore__desc">
        Найден несохранённый черновик
        <span class="draft-restore__preview">«{{ previewTitle }}»</span>
        после перезагрузки страницы.
      </p>
    </div>

    <div class="draft-restore__actions">
      <button
        type="button"
        class="draft-restore__button draft-restore__button--ghost"
        @click="discard"
      >
        Отклонить
      </button>
      <button
        type="button"
        class="draft-restore__button draft-restore__button--primary"
        @click="restore"
      >
        Восстановить
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.draft-restore {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  background-color: #fff;
  border-bottom: 1px solid $color-border;
  box-shadow: 0 4px 12px rgb(15 23 42 / 6%);

  &__title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  &__desc {
    color: $color-text-muted;
    font-size: 0.95rem;
  }

  &__preview {
    color: #1e293b;
    font-weight: 500;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
    flex-shrink: 0;
  }

  &__button {
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;
    border: 1px solid transparent;
    font-size: 0.95rem;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;

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
  }
}
</style>

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
  position: sticky;
  top: 0;
  z-index: $z-banner;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-md;
  padding-top: max($spacing-md, env(safe-area-inset-top));
  background: $color-bg-elevated;
  border-bottom: 1px solid $color-border;
  box-shadow: $shadow-md;

  @include respond-up(sm) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-inline: $spacing-lg;
  }

  &__title {
    font-family: $font-display;
    font-weight: 700;
    margin-bottom: 0.2rem;
    color: $color-ink;
  }

  &__desc {
    color: $color-text-muted;
    font-size: 0.95rem;
    line-height: 1.45;
  }

  &__preview {
    color: $color-ink;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    width: 100%;

    @include respond-up(sm) {
      flex-direction: row;
      width: auto;
      flex-shrink: 0;
    }
  }

  &__button {
    width: 100%;

    @include respond-up(sm) {
      width: auto;
    }

    &--ghost {
      @include button-ghost;
    }

    &--primary {
      @include button-primary;
    }
  }
}
</style>

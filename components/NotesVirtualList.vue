<script setup lang="ts">
import type { Note } from '~/types/note'
import { NOTES_VIRTUALIZE_THRESHOLD } from '~/utils/notes-virtual'

const props = withDefaults(defineProps<{
  notes: Note[]
  /** Оценка высоты строки (px) для windowing. */
  estimateHeight?: number
  overscan?: number
}>(), {
  estimateHeight: 148,
  overscan: 4,
})

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
}>()

const scrollerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(720)

const useVirtual = computed(
  () => props.notes.length >= NOTES_VIRTUALIZE_THRESHOLD,
)

const totalHeight = computed(() => props.notes.length * props.estimateHeight)

const visibleRange = computed(() => {
  if (!useVirtual.value) {
    return { start: 0, end: props.notes.length }
  }

  const start = Math.max(
    0,
    Math.floor(scrollTop.value / props.estimateHeight) - props.overscan,
  )
  const end = Math.min(
    props.notes.length,
    Math.ceil((scrollTop.value + viewportHeight.value) / props.estimateHeight)
    + props.overscan,
  )

  return { start, end }
})

const visibleNotes = computed(() => {
  const { start, end } = visibleRange.value
  return props.notes.slice(start, end).map((note, offset) => ({
    note,
    index: start + offset,
  }))
})

const offsetY = computed(
  () => visibleRange.value.start * props.estimateHeight,
)

function onScroll(event: Event): void {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}

function measureViewport(): void {
  if (!scrollerRef.value) {
    return
  }

  viewportHeight.value = scrollerRef.value.clientHeight || window.innerHeight
}

onMounted(() => {
  measureViewport()
  window.addEventListener('resize', measureViewport, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', measureViewport)
})
</script>

<template>
  <!-- Небольшой список: обычный рендер без накладных расходов -->
  <div
    v-if="!useVirtual"
    class="notes-list"
  >
    <NoteListItem
      v-for="note in notes"
      :key="note.id"
      :note="note"
      @edit="emit('edit', $event)"
      @delete="emit('delete', $event)"
    />
  </div>

  <!-- Большой список: виртуализация (windowing) -->
  <div
    v-else
    ref="scrollerRef"
    class="notes-list notes-list--virtual"
    @scroll.passive="onScroll"
  >
    <div
      class="notes-list__spacer"
      :style="{ height: `${totalHeight}px` }"
    >
      <div
        class="notes-list__window"
        :style="{ transform: `translate3d(0, ${offsetY}px, 0)` }"
      >
        <NoteListItem
          v-for="item in visibleNotes"
          :key="item.note.id"
          class="notes-list__item"
          :style="{ minHeight: `${estimateHeight}px` }"
          :note="item.note"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notes-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &--virtual {
    max-height: min(70vh, 52rem);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    gap: 0;
  }

  &__spacer {
    position: relative;
    width: 100%;
  }

  &__window {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    will-change: transform;
  }

  &__item {
    flex-shrink: 0;
  }
}
</style>

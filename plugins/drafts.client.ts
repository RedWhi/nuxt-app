/**
 * Клиентский плагин черновиков:
 * при старте предлагает восстановить незавершённое редактирование,
 * перед выгрузкой страницы сбрасывает debounce и пишет в localStorage.
 */
export default defineNuxtPlugin(() => {
  const draftsStore = useDraftsStore()

  draftsStore.hydrate()

  window.addEventListener('beforeunload', () => {
    draftsStore.flushSave()
  })
})

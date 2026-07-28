export default defineNuxtPlugin(() => {
  const draftsStore = useDraftsStore()

  draftsStore.hydrate()

  window.addEventListener('beforeunload', () => {
    draftsStore.flushSave()
  })
})

import { NOTES_STORAGE_KEY } from '~/utils/notes-storage'

export default defineNuxtPlugin(() => {
  const notesStore = useNotesStore()

  notesStore.hydrate()

  window.addEventListener('beforeunload', () => {
    notesStore.flushSave()
  })

  // Синхронизация с другими вкладками (storage не срабатывает в той же вкладке).
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== NOTES_STORAGE_KEY) {
      return
    }

    try {
      notesStore.syncFromStorage()
    }
    catch (error) {
      console.warn('[notes] Ошибка синхронизации между вкладками', error)
    }
  })
})

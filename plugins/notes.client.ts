import { NOTES_STORAGE_KEY } from '~/utils/notes-storage'

/**
 * Клиентский плагин заметок:
 * 1) гидратация Pinia из localStorage;
 * 2) flush отложенной записи при закрытии вкладки;
 * 3) подтягивание изменений из других вкладок (событие `storage`).
 */
export default defineNuxtPlugin(() => {
  const notesStore = useNotesStore()

  notesStore.hydrate()

  // Не теряем последние правки, ещё не попавшие в storage из‑за debounce.
  window.addEventListener('beforeunload', () => {
    notesStore.flushSave()
  })

  // `storage` срабатывает только в других вкладках того же origin.
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

import { NOTES_STORAGE_KEY } from '~/utils/notes-storage'

/**
 * Синхронизация заметок между вкладками через событие storage.
 * При удалении/изменении в другой вкладке подтягивает актуальные данные.
 */
export function useNotesSync() {
  const notesStore = useNotesStore()

  function onStorage(event: StorageEvent): void {
    if (event.key !== NOTES_STORAGE_KEY) {
      return
    }

    // Игнорируем события своей вкладки и битые payload'ы — sync безопасен.
    try {
      notesStore.syncFromStorage()
    }
    catch (error) {
      console.warn('[notes-sync] Не удалось синхронизировать заметки', error)
    }
  }

  onMounted(() => {
    if (!import.meta.client) {
      return
    }

    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => {
    if (!import.meta.client) {
      return
    }

    window.removeEventListener('storage', onStorage)
  })

  return {
    onStorage,
  }
}

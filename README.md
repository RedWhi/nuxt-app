# Nuxt Notes

Клиентское приложение заметок на **Nuxt 3**: список, редактирование, todo-пункты, undo/redo и сохранение в `localStorage`. Синхронизация со хранилищем и история изменений реализованы вручную — без `pinia-plugin-persistedstate` и библиотек undo/redo.

## Технологический стек

| Слой | Технологии |
|------|------------|
| Framework | Nuxt 3, Vue 3 (Composition API), TypeScript (strict) |
| Состояние | Pinia |
| Стили | SCSS (переменные, миксины), адаптивная вёрстка |
| Тесты | Vitest, `@vue/test-utils`, happy-dom |
| Инфраструктура | Docker, docker-compose |
| Node | ≥ 20.19 |

Зависимостей для персистентности Pinia и undo **нет** — только ручная работа с `localStorage` и собственный стек истории.

## Возможности

- CRUD заметок и todo-пунктов
- Undo / Redo (до 50 атомарных шагов, диффы, не полные снимки списка)
- Непрерывный ввод текста фиксируется в истории по **blur** поля
- Debounced-запись в `localStorage` (не на каждый символ)
- Версия схемы в сохраняемых данных + миграции
- Черновик переживает случайную перезагрузку; предлагается восстановление
- Синхронизация между вкладками (`storage` event)
- Модалки: focus-trap, Escape, работа с клавиатуры
- Ctrl+Z / Shift+Ctrl+Z на странице редактирования без конфликта с нативным undo в поляхх
- 404 при прямом переходе к несуществующей заметке
- Graceful UI, если заметку удалили в другой вкладке

## Архитектура

```
pages/                  UI-маршруты
  index.vue             список заметок
  edit/[id].vue         сессия редактирования (+ undo/redo, черновик)

stores/
  notes.ts              CRUD заметок, debounced persist, syncFromStorage
  drafts.ts             черновик редактора, предложение восстановить

composables/
  useHistory.ts         стеки past/future, commit / undo / redo / clear
  useKeyboardShortcuts.ts  глобальные Ctrl+Z / Shift+Ctrl+Z
  useNotesSync.ts       подписка на storage (опционально на страницах)

utils/
  notes-storage.ts      load/save + schemaVersion + migrateNote
  draft-storage.ts      черновик в localStorage
  history-actions.ts    applyHistoryAction / invertAction
  focus-trap.ts         Tab-цикл и начальный фокус в модалках
  debounce.ts           отложенная запись

types/
  note.ts, history.ts, draft.ts

components/
  AppModal, ConfirmDialog   модалки (Teleport, Escape, focus-trap)
  NoteTodoEditor            todo + атомарные записи истории
  NotesVirtualList          виртуализация длинного списка
  DraftRestorePrompt        баннер восстановления черновика

plugins/
  notes.client.ts       hydrate + flush + cross-tab sync
  drafts.client.ts      hydrate черновика + flush на beforeunload
```

### Поток данных

1. При старте клиентские плагины гидрируют Pinia из `localStorage`.
2. UI меняет заметки через `useHistory().commit(...)` (или store напрямую там, где история не нужна).
3. `commit` применяет атомарный дифф к `notes` и кладёт шаг в `past`, очищая `future`.
4. Store планирует `scheduleSave()` → debounce ~300 ms → `saveNotesToStorage`.
5. Сессия редактирования: при Save / Cancel / Delete вызывается `history.clear()` — история не переживает сессию.
6. Черновик пишется отдельно; после reload показывается `DraftRestorePrompt`.

### Семантика истории

| Действие | Запись в истории |
|----------|------------------|
| Ввод title / content | Одна запись на поле после blur |
| Чекбокс, add/delete todo | Отдельная атомарная запись |
| Изменение после undo | Очищает redo (`future = []`) |
| Лимит | 50 шагов (`HISTORY_LIMIT`) |
| Save / Cancel | `clear()` — стеки обнуляются |

## Быстрый старт (Docker)

Требуется установленный [Docker](https://docs.docker.com/get-docker/) и Docker Compose.

```bash
docker compose up --build
```

Приложение: [http://localhost:3000](http://localhost:3000).

Горячая перезагрузка: исходники смонтированы в контейнер (`volumes` в `docker-compose.yaml`).

Production-образ (порт хоста **3001**):

```bash
docker compose --profile prod up app-prod --build
```

Остановка:

```bash
docker compose down
```

## Локальный запуск без Docker

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

```bash
npm run build      # production-сборка
npm run preview    # превью .output
```

## Тесты

```bash
npm run test          # watch
npm run test:run      # однократный прогон
npm run test:coverage
```

Покрыты логика истории (`useHistory`, `history-actions`), сторы заметок/черновиков, sync, debounce, валидация, focus-trap и модалки.

## Структура хранилища

**Заметки** (`localStorage` → `nuxt-app:notes`):

```json
{
  "schemaVersion": 1,
  "notes": [ /* Note[] */ ]
}
```

**Черновик** (`nuxt-app:draft`) — отдельно, с собственной `schemaVersion`.

## Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Dev-сервер |
| `npm run build` | Сборка |
| `npm run preview` | Превью production |
| `npm run test` / `test:run` | Vitest |
| `docker compose up` | Dev в Docker |

# Omaha Hi-Lo Replay

Домашнее веб-приложение для партий в Omaha Hi-Lo (8-or-better): люди и встроенные боты играют за одним столом, раздачи сохраняются в SQLite, а известный расклад можно повторить по коду.

Проект состоит из React-клиента, Node.js/TypeScript-сервера и браузерных тестов Playwright. Подробная карта проекта находится в [PROJECT_GUIDE_RU.md](PROJECT_GUIDE_RU.md), игровая и техническая спецификация — в [../TECH_REQUIREMENTS.md](../TECH_REQUIREMENTS.md).

## Что уже работает

- стол от 1 до 10 мест с переключением Human/Bot;
- четыре закрытые карты игрока и пять общих карт;
- улицы preflop, flop, turn, river и showdown;
- Check, Bet, Call, Raise и Fold с выбором размера ставки;
- блайнды, стеки, all-in и лимит трёх повышений на улицу;
- автоматические ходы встроенных ботов;
- строгая оценка Omaha Hi-Lo: ровно 2 карты руки и 3 карты борда;
- продолжение партии с переносом стеков и вращением блайндов;
- статистика партии и результаты каждой завершённой раздачи;
- повтор сохранённой раздачи и восстановление расклада по `dealCode`;
- SQLite-история и отдельная admin-страница.

Текущие ограничения перечислены в [project-description.md](project-description.md#текущие-ограничения).

## Требования

- Node.js 20 или новее;
- npm;
- Chromium для E2E-тестов Playwright.

Проверить установленную версию:

```powershell
node -v
npm.cmd -v
```

Если Node.js отсутствует, на Windows его можно установить так:

```powershell
winget install OpenJS.NodeJS.LTS
```

Если PowerShell блокирует `npm.ps1`, используй `npm.cmd`. Менять execution policy для работы с проектом не обязательно.

## Установка

Все команды ниже запускаются из папки `demo`:

```powershell
cd C:\Users\test1234\Documents\Oma\demo
npm.cmd run install:all
```

Команда устанавливает зависимости трёх пакетов:

- `demo` — общие команды и Playwright;
- `../server` — сервер и игровая логика;
- `client` — React-клиент.

Для первого запуска E2E-тестов также установи Chromium:

```powershell
npx.cmd playwright install chromium
```

## Локальный запуск

```powershell
npm.cmd run dev
```

Открыть:

- `http://localhost:5173/` — лобби;
- `http://localhost:5173/admin.html` — история и отладка;
- `http://localhost:4000/api/version` — версия запущенного сервера.

Vite-клиент работает на порту `5173`, сервер HTTP/WebSocket — на `4000`. В production сервер сам раздаёт собранный клиент.

## Основной сценарий

1. Открой лобби.
2. Выбери от 1 до 10 мест, задай имена и отметь места ботов.
3. Нажми `New deal`.
4. Открой приватную ссылку нужного человека. Ссылки содержат токены и не должны публиковаться без необходимости.
5. После showdown открой вкладку `STATISTICS`, продолжи партию через `New deal` или повтори один из сохранённых раскладов.

Поле `Replay` в лобби принимает:

- короткий код руки, например `HA0001`;
- полный UUID руки;
- публичный `dealCode`, например `OMA1-P2-S9IX`;
- номер руки из сохранённой истории.

`dealCode` восстанавливает только карты и число мест. Он не восстанавливает действия, стеки или состояние партии.

## Команды

Из папки `demo`:

```powershell
npm.cmd test
npm.cmd run e2e
npm.cmd run e2e:bots
npm.cmd run ci
```

- `test` — unit-тесты сервера;
- `e2e` — основные браузерные сценарии;
- `e2e:bots` — длительный тест партии из семи ботов на 20 раздач;
- `ci` — unit-тесты, обе сборки и основные E2E-тесты.

Отдельные сборки:

```powershell
npm.cmd --prefix ..\server run build
npm.cmd --prefix client run build
```

## Production-режим

```powershell
node ..\server\scripts\write-build-info.cjs
npm.cmd --prefix ..\server run build
npm.cmd --prefix client run build
node ..\server\dist\index.js
```

После сборки приложение доступно на `http://localhost:4000/`, а admin — на `http://localhost:4000/admin.html`.

## Переменные окружения сервера

- `PORT` — HTTP/WebSocket-порт, по умолчанию `4000`;
- `DATA_FILE` — путь к SQLite, по умолчанию `data/hands.sqlite` относительно рабочей папки;
- `STATIC_DIR` — альтернативная папка собранного клиента;
- `BOT_THINK_MS` — задержка хода встроенного бота, по умолчанию `1000` мс;
- `COMMIT_SHA` и `BUILD_TIME_GMT` — данные, возвращаемые `/api/version`.

## Деплой

Render Blueprint описан в корневом `render.yaml`.

- [../DEPLOY_RU.md](../DEPLOY_RU.md) — общая настройка Render и production;
- [../BETA_DEPLOY_RU.md](../BETA_DEPLOY_RU.md) — обычное обновление
  `beta/lobby`, автоматический деплой после CI и диагностика.

# Деплой Omaha Hi-Lo Replay на Render

Проект настроен как один Node.js web service: Express обслуживает HTTP API и WebSocket, а также раздаёт production-сборку React из `demo/client/dist`.

Актуальная конфигурация находится в корневом [render.yaml](render.yaml).

## Что создаёт Blueprint

- тип: `web`;
- имя: `omaha-hi-lo-pov`;
- runtime: `node`;
- plan: `free`;
- `NODE_ENV=production`;
- запуск: `node server/dist/index.js`.

Сервер читает обязательный для Render порт из `PORT`.

## Перед деплоем

Локально проверь полный CI:

```powershell
cd C:\Users\test1234\Documents\Oma\demo
npm.cmd run ci
```

Проверь, что в Git попадают:

- `server`;
- `demo`;
- `.github/workflows/ci.yml`;
- `render.yaml`;
- корневая документация.

Не коммить:

- `node_modules`;
- `dist`;
- `data`;
- `*.sqlite`;
- логи и `.env`.

Это уже задано в `.gitignore`.

## Деплой через Blueprint

Этот раздел нужен для первого создания или переподключения сервиса. Для
обычного обновления уже созданного сервиса повторно применять Blueprint не
нужно.

1. Отправь весь репозиторий `Oma` в GitHub.
2. В Render выбери `New` → `Blueprint`.
3. Подключи репозиторий.
4. Render прочитает корневой `render.yaml`.
5. Проверь имя, план и переменные окружения.
6. Примени Blueprint и дождись успешного health/start.
7. Открой выданный URL `onrender.com`.

Публичные пути:

- `/` — лобби;
- `/admin.html` — admin/debug;
- `/api/version` — commit и время сборки.

## Обычное обновление существующего сервиса

Обычный процесс: локальный CI → commit → `git push` → GitHub Actions → Render
auto-deploy после успешных checks. `gh` и ручная кнопка **Deploy** для этого не
нужны.

Точная инструкция для ветки `beta/lobby`, включая проверку SHA и диагностику
красного CI: [BETA_DEPLOY_RU.md](BETA_DEPLOY_RU.md).

Если Render настроен с `autoDeployTrigger: checksPass`, он не публикует commit
при упавшем GitHub CI. Наличие commit в GitHub ещё не означает, что он уже
развёрнут. Источником истины для опубликованной версии служит `/api/version`.

## Команда сборки

Render выполняет:

```text
npm --prefix server ci
npm --prefix demo/client ci
node server/scripts/write-build-info.cjs
npm --prefix server run build
npm --prefix demo/client run build
```

В `render.yaml` эти шаги объединены через `&&`. Скрипт `write-build-info.cjs` записывает commit и время сборки в `server/build-info.json`; файл затем читает endpoint `/api/version`.

Корневый пакет `demo` и Playwright на Render не устанавливаются, потому что для runtime нужны только сервер и собранный клиент.

## Локальная проверка production-режима

Из корня репозитория:

```powershell
node server\scripts\write-build-info.cjs
npm.cmd --prefix server run build
npm.cmd --prefix demo\client run build
node server\dist\index.js
```

Открыть:

```text
http://localhost:4000/
http://localhost:4000/admin.html
http://localhost:4000/api/version
```

Сервер находит собранный клиент по `demo/client/dist`. Альтернативный путь можно передать через `STATIC_DIR`.

## SQLite и free plan

По умолчанию база создаётся в `data/hands.sqlite` относительно рабочей папки процесса.

У free web service Render файловая система эфемерна: SQLite-файл теряется при redeploy, restart или spin-down. Поэтому текущий Blueprint подходит только для демонстрации и тестовых партий, а не для постоянной истории.

Free web service может остановиться после 15 минут без входящих HTTP-запросов и WebSocket-сообщений; холодный запуск обычно занимает около минуты.

Для постоянного окружения нужны один из вариантов:

- платный Render service с persistent disk и явным `DATA_FILE` на mount path;
- перенос хранения в постоянную внешнюю БД;
- другой хостинг с постоянным локальным диском.

При нескольких экземплярах приложения локальный SQLite, in-memory locks продолжений и таймеры ботов нельзя считать общими.

## Полезные переменные окружения

| Переменная | Назначение | По умолчанию |
| --- | --- | --- |
| `PORT` | HTTP/WebSocket-порт | `4000` локально; Render задаёт сам |
| `DATA_FILE` | Путь к SQLite | `data/hands.sqlite` |
| `STATIC_DIR` | Путь к собранному клиенту | автоматический поиск `demo/client/dist` |
| `BOT_THINK_MS` | Задержка встроенного бота | `1000` мс |
| `HUMAN_TURN_MS` | Время на ход человека; затем auto-check/auto-fold | `45000` мс |
| `ADMIN_API_TOKEN` | Bearer-токен для `/admin/*`; обязателен в публичном окружении | не задан |
| `COMMIT_SHA` | Commit для `/api/version` | build-info или `dev` |
| `BUILD_TIME_GMT` | Время для `/api/version` | build-info или время старта |

Render также предоставляет `RENDER_GIT_COMMIT`, который имеет приоритет над `COMMIT_SHA`.

## Проверка после деплоя

1. `/api/version` возвращает JSON с ожидаемым commit, совпадающим с
   `git rev-parse HEAD` для развёртываемой ветки.
2. Лобби показывает `connected`.
3. Создаётся партия человек против бота.
4. Приватная ссылка игрока открывается.
5. После хода человека бот отвечает.
6. `/admin.html` видит созданную руку.

Ограничения Render free plan могут меняться; перед публичным запуском сверяй их с официальными страницами [Free web services](https://render.com/docs/free) и [WebSockets](https://render.com/docs/websocket).

# Деплой POV на Render

Проект подготовлен под один Node.js web service: сервер запускает API/WebSocket и раздает собранный React-клиент из `demo/client/dist`.

## Почему Render

- Есть бесплатный web service для демо.
- WebSocket работает на web services.
- `render.yaml` в корне уже описывает сборку и запуск.

Ограничения бесплатного плана: сервис засыпает без трафика, первый вход после паузы может занять около минуты. SQLite-файл без persistent disk не стоит считать надежным долговременным хранилищем.

## Что загрузить в GitHub

Загружать нужно всю папку `Oma`, кроме того, что перечислено в `.gitignore`: `node_modules`, `dist`, `data`, локальные SQLite-файлы и логи.

## Деплой через Render Blueprint

1. Создать пустой GitHub-репозиторий.
2. Загрузить туда содержимое папки `C:\Users\test1234\Documents\Oma`.
3. В Render открыть `New` -> `Blueprint`.
4. Выбрать GitHub-репозиторий.
5. Render найдет `render.yaml` и создаст web service `omaha-hi-lo-pov`.
6. После успешного deploy открыть публичный URL сервиса.

## Команды, которые Render выполнит

Build:

```powershell
npm --prefix server ci && npm --prefix demo/client ci && npm --prefix server run build && npm --prefix demo/client run build
```

Start:

```powershell
node server/dist/index.js
```

## Локальная проверка production-режима

```powershell
npm.cmd --prefix server run build
npm.cmd --prefix demo/client run build
node server/dist/index.js
```

Открыть:

```text
http://localhost:4000/
http://localhost:4000/admin.html
```

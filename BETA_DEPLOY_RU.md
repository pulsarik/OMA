# Beta-деплой фойе

Новая версия с фойе живёт в ветке `beta/lobby`. Production-сервис продолжает
собираться из `main` по основному файлу `render.yaml`.

В beta-ветке корневой [render.yaml](render.yaml) описывает только beta-сервис.
В ветке `main` этот же файл по-прежнему описывает production:

- отдельный Render web service `omaha-hi-lo-beta`;
- исходники из ветки `beta/lobby`;
- отдельный URL `onrender.com`;
- отдельный SQLite-файл `data/beta-hands.sqlite`;
- автоматический деплой только после успешного GitHub CI.

Build-команда явно использует `npm ci --include=dev`, потому что TypeScript,
Vite и определения типов нужны на этапе сборки даже при `NODE_ENV=production`.

## Первое создание beta-сервиса

1. Отправить ветку `beta/lobby` в GitHub.
2. В Render выбрать `New` → `Blueprint`.
3. Выбрать репозиторий `pulsarik/OMA` и ветку `beta/lobby`.
4. Оставить Blueprint Path: `render.yaml`.
5. Проверить, что создаётся новый сервис `omaha-hi-lo-beta`, а не изменяется
   production-сервис `omaha-hi-lo-pov`.
6. Применить Blueprint и дождаться успешной проверки `/api/version`.

Render назначит beta-сервису собственный публичный адрес. Обычно адрес основан
на имени сервиса, но окончательный URL нужно взять из Render Dashboard.

## Обновление beta

После создания сервиса каждый push в `beta/lobby` запускает GitHub CI. Render
деплоит новый commit после успешных проверок.

## Перенос в production

Когда beta будет принята, изменения можно перенести в `main` через pull request.
До merge старый production endpoint продолжит работать с кодом из `main`.

## Данные

Beta и production не используют общую SQLite-базу. На бесплатном Render
локальный SQLite остаётся временным и может очищаться при пересоздании сервиса.

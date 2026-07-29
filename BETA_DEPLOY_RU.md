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

Обычное обновление beta выполняется без `gh` и без ручного запуска деплоя:

1. Локально запустить полный CI:

   ```powershell
   cd C:\Users\test1234\Documents\Oma\demo
   npm.cmd run ci
   ```

2. Закоммитить нужные изменения в ветке `beta/lobby`.
3. Отправить ветку обычным Git:

   ```powershell
   git push origin beta/lobby
   ```

4. Push автоматически запускает workflow `.github/workflows/ci.yml`.
5. Дождаться успешного GitHub CI.
6. Render с настройкой `autoDeployTrigger: checksPass` автоматически начинает
   деплой только после зелёного CI.
7. Проверять beta endpoint `/api/version`, пока поле `commit` или `shortCommit`
   не совпадёт с отправленным SHA:

   ```powershell
   git rev-parse HEAD
   Invoke-RestMethod https://omaha-hi-lo-beta.onrender.com/api/version
   ```

8. После обновления проверить `/`, `/admin.html` и основной игровой сценарий.

GitHub CLI `gh` для этого процесса не требуется. Создавать новый Blueprint при
каждом обновлении тоже не нужно.

## Если автоматический деплой не начался

Сначала проверить GitHub Actions. При `autoDeployTrigger: checksPass` красный
или незавершённый CI не позволяет Render автоматически публиковать commit.
Старый SHA в `/api/version` в этом случае является ожидаемым результатом:
предыдущая рабочая версия остаётся live.

Порядок диагностики:

1. Убедиться, что нужный commit появился в `origin/beta/lobby`.
2. Проверить workflow, запущенный именно для этого SHA.
3. Если CI упал, изучить упавший шаг, исправить причину и отправить новый commit.
4. Не считать деплой завершённым, пока `/api/version` не покажет нужный SHA.

Кнопка **Deploy** в Render — аварийный ручной обход, а не обычный процесс.
Ручной деплой может опубликовать commit с красным CI, поэтому использовать его
следует только осознанно после локального полного CI. После ручного деплоя всё
равно обязательно проверить `/api/version`, `/` и `/admin.html`. Красный GitHub
CI при этом остаётся неисправностью, которую нужно устранить отдельно, иначе
следующие автоматические деплои снова будут заблокированы.

## Перенос в production

Когда beta будет принята, изменения можно перенести в `main` через pull request.
До merge старый production endpoint продолжит работать с кодом из `main`.

## Данные

Beta и production не используют общую SQLite-базу. На бесплатном Render
локальный SQLite остаётся временным и может очищаться при пересоздании сервиса.

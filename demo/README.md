# Omaha Hi-Lo Replay

Домашний прототип для дружеских раздач Omaha Hi-Lo: раздать карты, сохранить расклад, открыть повтор и обсудить.

Если ты новичок в Node.js/npm/React и хочешь понять, где что лежит, смотри [PROJECT_GUIDE_RU.md](PROJECT_GUIDE_RU.md).

## Windows setup

Если `npm install` не запускается и PowerShell пишет, что `npm` или `node` не найдены, сначала установи Node.js LTS.

Вариант через winget:

```powershell
winget install OpenJS.NodeJS.LTS
```

После установки закрой и заново открой PowerShell, затем проверь:

```powershell
node -v
npm -v
```

Если PowerShell пишет, что `npm.ps1` не может быть загружен из-за `running scripts is disabled`, используй `npm.cmd` вместо `npm`:

```powershell
npm.cmd -v
```

Можно также один раз разрешить локальные пользовательские скрипты:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

После этого открой новый PowerShell и снова проверь `npm -v`.

## Установка зависимостей

Запускать из папки `demo`:

```powershell
cd C:\Users\test1234\Documents\Oma\demo
npm run install:all
```

Если `npm` блокируется политикой PowerShell, та же команда через `npm.cmd`:

```powershell
cd C:\Users\test1234\Documents\Oma\demo
npm.cmd run install:all
```

Эта команда установит зависимости для:

- `demo`
- `server`
- `demo/client`

## Запуск

Из папки `demo`:

```powershell
npm run dev
```

Сервер запускается на `http://localhost:4000`, клиент Vite обычно на `http://localhost:5173`.

## Тесты

```powershell
npm test
```

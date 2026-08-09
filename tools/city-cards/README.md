# Генератор карточек столиц

Изолированный от приложения генератор 185 SVG-карточек — по одной для каждой столицы из `WORLD_CAPITALS`. Обычная генерация не использует API и не требует npm-зависимостей.

```powershell
node tools/city-cards/generate.mjs
```

- `data/cards.json` — полный сохранённый набор данных для воспроизводимой генерации.
- `data/facts.ru.json` — отдельный обязательный справочник уникальных русских фактов.
- `build-data.mjs` — сборщик/нормализатор исходных открытых наборов при обновлении данных.
- `template.mjs` — единая композиция и визуальная система серии.
- `output/` — готовые масштабируемые SVG.
- `gallery.html` — адаптивная галерея примеров.

Генератор также синхронизирует карточки в `demo/client/public/city-cards/`. Полное обновление данных и карточек:

```powershell
powershell -ExecutionPolicy Bypass -File tools/city-cards/fetch-sources.ps1
node tools/city-cards/build-data.mjs
node tools/city-cards/apply-facts.mjs
node tools/city-cards/generate.mjs
node tools/city-cards/validate.mjs
```

Источники и лицензии описаны в `SOURCES.md`. Значения из автоматического сведения требуют редакторской проверки перед печатным или коммерческим выпуском.

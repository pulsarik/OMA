# Источники данных

- Население и координаты городов: [condwanaland/worldcities](https://github.com/condwanaland/worldcities), CC BY 4.0; исходные данные SimpleMaps.
- Структура ВВП: [World Bank Indicators API](https://api.worldbank.org/), последние доступные значения `NV.AGR.TOTL.ZS`, `NV.IND.TOTL.ZS`, `NV.SRV.TOTL.ZS`.
- Религии: [datasets/world-religion-projections](https://github.com/datasets/world-religion-projections), CC BY 4.0; источник — Pew Research Center, проекция 2020 года.
- Морские порты: [tayljordan/ports](https://github.com/tayljordan/ports), MIT; World Port Index 2019.
- Геометрия стран: [datasets/geo-countries](https://github.com/datasets/geo-countries), Natural Earth, public domain.
- Флаги: [Flagcdn](https://flagcdn.com/), локальные SVG-копии сохраняются генератором ассетов.

`data/cards.json` содержит дату сборки и атрибуцию каждого показателя. Исходные многомегабайтные файлы не копируются в приложение; скрипт обновления преобразует их в компактные данные, необходимые генератору.

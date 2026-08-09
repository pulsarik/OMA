import { access, readFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile(new URL('./data/cards.json', import.meta.url), 'utf8'));
const landmarks = JSON.parse(await readFile(new URL('./data/landmarks.ru.json', import.meta.url), 'utf8'));
const required = ['slug','city','country','iso2','iso3','flagEmoji','population','populationLabel','coordinates','gdp','religions','mapPath','capital','fact','sources'];
const landmarkKinds = new Set(['gate','eiffel','tower','monument','temple','clock','theatre','mosque','cathedral','palace','modern','arch','statue','government','dome','obelisk','bridge','fortress','pagoda','museum','pyramid']);
const errors = [];
const slugs = new Set();

for (const card of dataset.cards) {
  for (const field of required) if (card[field] == null || card[field] === '') errors.push(`${card.city}: нет поля ${field}`);
  if (slugs.has(card.slug)) errors.push(`${card.city}: повтор slug ${card.slug}`);
  slugs.add(card.slug);
  if (card.gdp.reduce((sum, value) => sum + value, 0) !== 100) errors.push(`${card.city}: ВВП не равен 100%`);
  const religionTotal = card.religions.reduce((sum, item) => sum + item.value, 0);
  if (Math.abs(religionTotal - 100) > 1) errors.push(`${card.city}: религии дают ${religionTotal}%`);
  if (!card.population || card.population < 1) errors.push(`${card.city}: нет населения`);
  try { await access(new URL(`./output/${card.slug}.svg`, import.meta.url)); } catch { errors.push(`${card.city}: нет SVG`); }
}

if (dataset.count !== dataset.cards.length) errors.push(`count=${dataset.count}, записей=${dataset.cards.length}`);
if (Object.keys(landmarks).length !== dataset.cards.length) errors.push(`достопримечательностей=${Object.keys(landmarks).length}, карточек=${dataset.cards.length}`);
for (const card of dataset.cards) {
  const city = Object.keys(landmarks).find(name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === card.slug);
  if (!city || !landmarks[city].landmark || !landmarks[city].landmarkName) errors.push(`${card.city}: нет достопримечательности`);
  else if (!landmarkKinds.has(landmarks[city].landmark)) errors.push(`${card.city}: неизвестный тип ${landmarks[city].landmark}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Проверено карточек: ${dataset.cards.length}; обязательные поля и SVG на месте.`);

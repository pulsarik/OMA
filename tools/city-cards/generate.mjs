import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { renderCard } from './template.mjs';

const output = new URL('./output/', import.meta.url);
const publicOutput = new URL('../../demo/client/public/city-cards/', import.meta.url);
const dataset = JSON.parse(await readFile(new URL('./data/cards.json', import.meta.url), 'utf8'));
const landmarkEntries = JSON.parse(await readFile(new URL('./data/landmarks.ru.json', import.meta.url), 'utf8'));
const visualOverrides = Object.fromEntries(Object.entries(landmarkEntries).map(([city, value]) => [city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), value]));
if (Object.keys(visualOverrides).length !== dataset.cards.length) throw new Error(`Достопримечательностей ${Object.keys(visualOverrides).length}, карточек ${dataset.cards.length}`);
const cities = await Promise.all(dataset.cards.map(async card => {
  const flagSvg = await readFile(new URL(`./flags/${card.iso2.toLowerCase()}.svg`, import.meta.url), 'utf8');
  return {
    ...card,
    ...(visualOverrides[card.slug] ?? {}),
    flagDataUri: `data:image/svg+xml;base64,${Buffer.from(flagSvg).toString('base64')}`,
    population: card.populationLabel,
    religions: card.religions.map(item => [item.label, item.value, item.color, item.icon]),
    ports: card.ports.map(port => [port.type, port.point[0], port.point[1]]),
  };
}));
await mkdir(output, { recursive: true });
await mkdir(publicOutput, { recursive: true });
for (const city of cities) {
  const svg = renderCard(city);
  await Promise.all([
    writeFile(new URL(`${city.slug}.svg`, output), svg, 'utf8'),
    writeFile(new URL(`${city.slug}.svg`, publicOutput), svg, 'utf8'),
  ]);
}

const cards = cities.map(city => `<figure><img src="./output/${city.slug}.svg" alt="${city.city}"><figcaption>${city.city}</figcaption></figure>`).join('');
await writeFile(new URL('./gallery.html', import.meta.url), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Карточки столиц</title><style>body{margin:0;padding:32px;background:#202528;color:#fff;font-family:Arial,sans-serif}main{display:grid;grid-template-columns:repeat(3,minmax(260px,1fr));gap:28px;max-width:1500px;margin:auto}figure{margin:0}img{display:block;width:100%;border-radius:18px;box-shadow:0 14px 34px #0008}figcaption{text-align:center;font-weight:800;margin-top:12px}@media(max-width:900px){main{grid-template-columns:1fr}}</style><main>${cards}</main></html>`, 'utf8');
console.log(`Создано и подключено карточек: ${cities.length}`);

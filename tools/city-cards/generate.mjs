import { mkdir, writeFile } from 'node:fs/promises';
import { cities } from './cities.mjs';
import { renderCard } from './template.mjs';

const output = new URL('./output/', import.meta.url);
await mkdir(output, { recursive: true });
for (const city of cities) await writeFile(new URL(`${city.slug}.svg`, output), renderCard(city), 'utf8');

const cards = cities.map(city => `<figure><img src="./output/${city.slug}.svg" alt="${city.city}"><figcaption>${city.city}</figcaption></figure>`).join('');
await writeFile(new URL('./gallery.html', import.meta.url), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Карточки столиц</title><style>body{margin:0;padding:32px;background:#202528;color:#fff;font-family:Arial,sans-serif}main{display:grid;grid-template-columns:repeat(3,minmax(260px,1fr));gap:28px;max-width:1500px;margin:auto}figure{margin:0}img{display:block;width:100%;border-radius:18px;box-shadow:0 14px 34px #0008}figcaption{text-align:center;font-weight:800;margin-top:12px}@media(max-width:900px){main{grid-template-columns:1fr}}</style><main>${cards}</main></html>`, 'utf8');
console.log(`Создано карточек: ${cities.length}`);

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile(new URL('./data/cards.json', import.meta.url), 'utf8'));
const output = new URL('./flags/', import.meta.url);
await mkdir(output, { recursive: true });

const codes = [...new Set(dataset.cards.map(card => card.iso2.toLowerCase()))];
for (const code of codes) {
  const response = await fetch(`https://flagcdn.com/${code}.svg`);
  if (!response.ok) throw new Error(`Не удалось загрузить флаг ${code}: HTTP ${response.status}`);
  await writeFile(new URL(`${code}.svg`, output), await response.text(), 'utf8');
}
console.log(`Сохранено флагов: ${codes.length}`);

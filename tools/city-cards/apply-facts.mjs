import { readFile, writeFile } from 'node:fs/promises';

const dataUrl = new URL('./data/cards.json', import.meta.url);
const factsUrl = new URL('./data/facts.ru.json', import.meta.url);
const dataset = JSON.parse(await readFile(dataUrl, 'utf8'));
const facts = JSON.parse(await readFile(factsUrl, 'utf8'));
const bySlug = new Map(dataset.cards.map(card => [card.slug, card]));
for (const [city, fact] of Object.entries(facts)) {
  const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const card = bySlug.get(slug);
  if (!card) throw new Error(`Факт не соответствует столице из набора: ${city}`);
  card.fact = fact;
}

const uncovered = dataset.cards.filter(card => !facts[Object.keys(facts).find(city => city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === card.slug)]);
if (uncovered.length || Object.keys(facts).length !== dataset.cards.length) {
  throw new Error(`Неполное покрытие фактами: фактов ${Object.keys(facts).length}, карточек ${dataset.cards.length}, без факта ${uncovered.map(card => card.city).join(', ')}`);
}

await writeFile(dataUrl, JSON.stringify(dataset, null, 2));
console.log(`Применено уникальных фактов: ${Object.keys(facts).length}`);

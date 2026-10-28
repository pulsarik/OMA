// Exact matches cover the table's default names and their Russian spellings.
// Unknown nicknames must not acquire a gender from a guessed suffix.
const feminineNames = new Set([
  'maria', 'mariya', 'мария', 'anna', 'анна', 'elena', 'елена',
  'sofia', 'sofya', 'sophia', 'софия', 'софья', 'olga', 'ольга',
]);
const masculineNames = new Set([
  'alex', 'алекс', 'ivan', 'иван', 'dmitry', 'dmitriy', 'дмитрий',
  'dima', 'дима', 'pavel', 'павел', 'nikolai', 'nikolay', 'николай',
]);

export function commentaryGrammaticalGender(name: string): 'feminine' | 'masculine' | 'unknown' {
  const normalized = name.normalize('NFKC').trim().replace(/_bot$/i, '').trim().toLowerCase();
  if (feminineNames.has(normalized)) return 'feminine';
  if (masculineNames.has(normalized)) return 'masculine';
  return 'unknown';
}

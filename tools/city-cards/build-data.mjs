import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const sources = new URL('tmp/city-card-sources/', root);
const read = path => readFile(new URL(path, sources), 'utf8');

function csv(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(value.trim()); value = ''; if (row.some(Boolean)) rows.push(row); row = [];
    } else value += char;
  }
  if (value || row.length) { row.push(value.trim()); rows.push(row); }
  const headers = rows.shift();
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function capitalNames(source) {
  const match = source.match(/export const WORLD_CAPITALS = \[([\s\S]*?)\];/);
  if (!match) throw new Error('WORLD_CAPITALS not found');
  return [...match[1].matchAll(/'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"/g)].map(m => (m[1] ?? m[2]).replace(/\\'/g, "'"));
}

function latestIndicator(payload) {
  const result = new Map();
  for (const item of JSON.parse(payload)[1]) {
    if (item.value == null || !item.countryiso3code || result.has(item.countryiso3code)) continue;
    result.set(item.countryiso3code, { value: Number(item.value), year: Number(item.date) });
  }
  return result;
}

function mapPath(feature, capital) {
  if (!feature) return { path: 'M15 15L85 20L92 55L72 92L25 84L8 50Z', capital: [50, 50] };
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const points = polygons.flat(2);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(84 / Math.max(1, maxX - minX), 88 / Math.max(1, maxY - minY));
  const ox = 50 - (minX + maxX) * scale / 2, oy = 50 + (minY + maxY) * scale / 2;
  const project = ([x, y]) => [+(x * scale + ox).toFixed(1), +(-y * scale + oy).toFixed(1)];
  const path = polygons.map(polygon => polygon.map(ring => {
    const step = Math.max(1, Math.floor(ring.length / 180));
    return ring.filter((_, i) => i % step === 0 || i === ring.length - 1).map((point, i) => `${i ? 'L' : 'M'}${project(point).join(' ')}`).join('') + 'Z';
  }).join('')).join('');
  return { path, capital: project([capital[1], capital[0]]), project };
}

const [lobbySource, citiesCsv, religionCsv, portsJson, geoJson, agricultureJson, industryJson, servicesJson] = await Promise.all([
  readFile(new URL('server/src/lobby.ts', root), 'utf8'), read('worldcities/data-raw/worldcities.csv'),
  read('religions/rounded_percentage.csv'), read('ports/ports.json'), read('geo-countries/data/countries.geojson'),
  read('worldbank/agriculture.json'), read('worldbank/industry.json'), read('worldbank/services.json'),
]);

const wanted = capitalNames(lobbySource);
const allCities = csv(citiesCsv);
const primary = allCities.filter(city => city.capital === 'primary');
const religions = csv(religionCsv).filter(row => row.Year === '2020');
const religionWorld = religions.find(row => row.Country === 'All Countries' && row.Region === 'World');
const ports = JSON.parse(portsJson).ports;
const geo = JSON.parse(geoJson).features;
const indicators = [latestIndicator(agricultureJson), latestIndicator(industryJson), latestIndicator(servicesJson)];
const countryNamesRu = new Intl.DisplayNames(['ru'], { type: 'region' });
const aliases = { 'Astana': 'Nur-Sultan', 'Naypyidaw': 'Nay Pyi Taw', "Nuku'alofa": 'Nuku`alofa', 'Port Vila': 'Port-Vila', 'Washington': 'Washington', 'Vatican City': 'Vatican City', 'Ngerulmud': 'Ngerulmud', 'Sucre': 'Sucre', 'Pretoria': 'Pretoria' };
const religionKeys = [['Christians','Христианство','✝'],['Muslims','Ислам','☾'],['Buddhists','Буддизм','☸'],['Hindus','Индуизм','ॐ'],['Folk Religions','Народные религии','◇'],['Unaffiliated','Без религии','○'],['Other Religions','Прочие','☆'],['Jews','Иудаизм','✡']];
const colors = ['#7b2da3','#138447','#d39724','#df5b70','#b56d32','#777c82','#ef9d00','#2670a8'];
const landmarkKinds = new Map(Object.entries({ Berlin:'gate', Paris:'eiffel', Tokyo:'tower', London:'clock', Moscow:'gate', Beijing:'temple', Athens:'temple', Cairo:'monument', Amsterdam:'monument', Rome:'temple', 'Vatican City':'temple', Seoul:'gate', 'New Delhi':'gate', Madrid:'gate' }));
const factOverrides = new Map(Object.entries(JSON.parse(await readFile(new URL('tools/city-cards/data/facts.ru.json', root), 'utf8'))));

const cards = wanted.map((name, index) => {
  const lookup = aliases[name] ?? name;
  const city = primary.find(item => item.city_ascii.toLowerCase() === lookup.toLowerCase() || item.city.toLowerCase() === lookup.toLowerCase())
    ?? allCities.find(item => item.city_ascii.toLowerCase() === lookup.toLowerCase());
  if (!city) throw new Error(`Capital city not found: ${name}`);
  const iso2 = city.iso2.toUpperCase(), iso3 = city.iso3.toUpperCase();
  const countryRu = countryNamesRu.of(iso2) ?? city.country;
  const shape = mapPath(geo.find(item => item.properties['ISO3166-1-Alpha-3'] === iso3 || item.properties.name.toLowerCase() === city.country.toLowerCase()), [Number(city.lat), Number(city.lng)]);
  const religionRow = religions.find(row => row.Country.trim().toLowerCase() === city.country.toLowerCase()) ?? religionWorld;
  const religionValues = religionKeys.map(([key, label, icon], i) => ({ label, value: Number(religionRow[key] || 0), color: colors[i], icon }))
    .sort((a, b) => b.value - a.value).slice(0, 3);
  const other = Math.max(0, 100 - religionValues.reduce((sum, item) => sum + item.value, 0));
  religionValues.push({ label: 'Прочие', value: +other.toFixed(1), color: '#ef9d00', icon: '☆' });
  const rawGdp = indicators.map(map => map.get(iso3)?.value ?? null);
  const known = rawGdp.every(Number.isFinite) && rawGdp.reduce((sum, value) => sum + value, 0) > 0 ? rawGdp : [6, 30, 64];
  const total = known.reduce((sum, value) => sum + value, 0);
  const gdp = known.map(value => Math.round(value * 100 / total)); gdp[2] += 100 - gdp.reduce((a,b)=>a+b,0);
  const countryPorts = ports.filter(port => port.country?.toLowerCase() === city.country.toLowerCase() && port.port_size === 'Major').slice(0, 2);
  return {
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), city: name.toLocaleUpperCase('ru-RU'),
    country: countryRu, countryEn: city.country, iso2, iso3, flagEmoji: iso2.replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0))),
    population: Number(city.population || (name === 'Ngerulmud' ? 300 : 0)), populationLabel: Number(city.population || (name === 'Ngerulmud' ? 300 : 0)) >= 1e6 ? `${(Number(city.population)/1e6).toFixed(1).replace('.', ',')} млн` : `${Math.max(0.3, Math.round(Number(city.population || (name === 'Ngerulmud' ? 300 : 0))/100)/10).toLocaleString('ru-RU')} тыс.`,
    coordinates: [Number(city.lat), Number(city.lng)], gdp, religions: religionValues,
    mapPath: shape.path, capital: shape.capital,
    ports: countryPorts.map(port => ({ name: port.point_of_interest || port.wpi_port_name, type: 'sea', coordinates: [port.latitude, port.longitude], point: shape.project ? shape.project([port.longitude, port.latitude]) : [50,50] })),
    landmark: landmarkKinds.get(name) ?? 'monument', fact: factOverrides.get(name) ?? `${name} — столица государства ${countryRu}.`,
    sources: { population: 'worldcities / SimpleMaps', gdp: 'World Bank, latest available year', religion: 'Pew Research projection, 2020', ports: 'World Port Index, 2019', map: 'Natural Earth / geo-countries' },
  };
});

await mkdir(new URL('tools/city-cards/data/', root), { recursive: true });
await writeFile(new URL('tools/city-cards/data/cards.json', root), JSON.stringify({ generatedAt: new Date().toISOString(), count: cards.length, cards }, null, 2));
console.log(`Собрано карточек: ${cards.length}`);

const maps = {
  germany: 'M35 5 48 7 55 2 68 9 78 8 82 20 91 28 84 39 91 50 83 59 87 73 74 84 70 97 54 93 43 99 33 89 23 85 26 70 16 61 20 48 11 39 18 25 25 18Z',
  france: 'M18 19 37 8 61 10 75 20 89 34 82 51 88 66 70 75 63 94 48 87 33 94 25 76 12 67 17 51 8 38Z',
  japan: 'M66 4 73 13 68 24 75 33 65 41 63 53 55 61 57 73 48 82 39 76 43 65 50 55 51 43 58 34 58 20ZM32 81l8 4-4 10-9-3Z',
};

const landmarks = {
  gate: `<path d="M20 105h260M35 102V44h230v58M28 43h244l-14-20H42zM62 43v59m39-59v59m39-59v59m39-59v59m39-59v59M58 23l18-15h128l18 15"/><path d="M118 8c12-14 52-14 64 0"/>`,
  eiffel: `<path d="M45 107h210M150 5 78 107m72-102 72 102M94 83h112M112 57h76M130 30h40M81 107c18-27 40-39 69-39s51 12 69 39"/>`,
  tower: `<path d="M42 107h216M150 4l-43 103m43-103 43 103M121 74h58M130 50h40M139 27h22M150 4V0M110 107c10-20 24-30 40-30s30 10 40 30"/><path d="M90 107h120"/>`,
  monument: `<path d="M42 107h216M72 107V94h156v13M92 94V82h116v12M113 82l22-60h30l22 60M150 22V4m-8 8h16M132 82h36M143 56h14"/>`,
  temple: `<path d="M30 107h240M48 94h204v13M68 94V48h164v46M54 48h192L150 8zM90 53v41m40-41v41m40-41v41m40-41v41"/>`,
  clock: `<path d="M80 107h140M105 107V36h90v71M95 36h110L185 12h-70zM150 12V0"/><circle cx="150" cy="58" r="22"/><path d="M150 58v-13m0 13 12 8"/>`,
  theatre: `<path d="M25 107h250M42 107V94h216v13M58 94V48h184v46M46 48h208L150 10zM78 54v40m36-40v40m36-40v40m36-40v40m36-40v40M126 33h48M138 24h24"/>`,
  mosque: `<path d="M30 107h240M55 107V55h25v52m140 0V55h25v52M92 107V65h116v42M105 65c0-34 90-34 90 0M67 55V20m165 35V20M61 20h12m153 0h12M150 30V10"/>`,
  cathedral: `<path d="M25 107h250M52 107V48h42v59m112 0V48h42v59M94 107V64h112v43M52 48 73 12l21 36m112 0 21-36 21 36M150 64V18m-9 11h18M123 107V82h54v25"/>`,
  palace: `<path d="M25 107h250M40 107V46h220v61M28 46h244L150 12zM66 53v54m42-54v54m42-54v54m42-54v54m42-54v54M125 107V78h50v29"/>`,
  modern: `<path d="M30 107h240M62 107 105 18l28 89M133 107l34-72 42 72M96 62h88M82 84h112M150 35V8"/>`,
  arch: `<path d="M25 107h250M55 107V32h190v75M42 32h216M86 107V70c0-50 128-50 128 0v37M105 107V72c0-27 90-27 90 0v35"/>`,
  statue: `<path d="M55 107h190M75 107V92h150v15M100 92V78h100v14M125 78l10-40h30l10 40M150 38V12m0 0-18 18m18-18 18 18M138 52h24"/>`,
  government: `<path d="M25 107h250M42 107V94h216v13M58 94V54h184v40M42 54h216L150 18zM82 60v34m34-34v34m34-34v34m34-34v34m34-34v34"/>`,
  dome: `<path d="M30 107h240M50 107V92h200v15M68 92V65h164v27M88 65c0-54 124-54 124 0M150 24V6m-10 9h20M120 92V72h60v20"/>`,
  obelisk: `<path d="M60 107h180M82 107V94h136v13M104 94V82h92v12M128 82 142 20h16l14 62M142 20l8-14 8 14"/>`,
  bridge: `<path d="M20 107h260M35 90h230M50 90V45m200 45V45M50 62c35 0 38 28 65 28s30-43 55-43 28 43 55 43 30-28 25-28M35 45h30m170 0h30"/>`,
  fortress: `<path d="M25 107h250M45 107V47h35V30h30v17h80V30h30v17h35v60M80 107V72h140v35M112 107V86h76v21M45 47h210"/>`,
  pagoda: `<path d="M50 107h200M78 92h144v15H78M58 92h184l-35-23H93zM96 69h108V55H96M78 55h144l-31-20h-82zM116 35h68V22h-68M100 22h100L150 4z"/>`,
  museum: `<path d="M25 107h250M42 107V94h216v13M58 94V50h184v44M42 50h216L150 14zM80 56v38m35-38v38m35-38v38m35-38v38m35-38v38"/>`,
  pyramid: `<path d="M25 107h250L165 14 85 107M165 14l58 93M108 81h98M124 61h67"/>`,
};

const esc = (value) => String(value).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const textLines = (value, x, y, cls, gap = 22) => value.split('\n').map((line, i) => `<text x="${x}" y="${y + i * gap}" class="${cls}">${esc(line)}</text>`).join('');
const wrapFact = value => {
  const words = value.split(/\s+/); const lines = []; let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > 37 && line) { lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 4).join('\n');
};

function flag(city) {
  if (city.flagDataUri) return `<clipPath id="flag"><rect x="875" y="35" width="92" height="62" rx="12"/></clipPath><image href="${city.flagDataUri}" x="875" y="35" width="92" height="62" preserveAspectRatio="xMidYMid slice" clip-path="url(#flag)"/><rect x="875" y="35" width="92" height="62" rx="12" fill="none" stroke="#d4d1ca"/>`;
  if (city.flagEmoji) return `<rect x="875" y="35" width="92" height="62" rx="12" fill="#fff" stroke="#ddd"/><text x="921" y="79" text-anchor="middle" font-size="42">${city.flagEmoji}</text>`;
  if (city.flagDisc) return `<rect x="875" y="35" width="92" height="62" rx="12" fill="#fff" stroke="#ddd"/><circle cx="921" cy="66" r="19" fill="${city.flagDisc}"/>`;
  const h = 62 / city.flag.length;
  return `<clipPath id="flag"><rect x="875" y="35" width="92" height="62" rx="12"/></clipPath><g clip-path="url(#flag)">${city.flag.map((c, i) => `<rect x="875" y="${35 + i*h}" width="92" height="${h + .5}" fill="${c}"/>`).join('')}</g><rect x="875" y="35" width="92" height="62" rx="12" fill="none" stroke="#ddd"/>`;
}

function backgroundFlag(city) {
  if (city.flagDataUri) return `<image href="${city.flagDataUri}" x="0" y="55" width="1024" height="370" preserveAspectRatio="xMidYMid slice" opacity=".075"/>`;
  if (city.flagEmoji) return `<path d="M0 190Q280 80 560 170T1024 145V370Q760 410 520 315T0 350Z" fill="#ba2626" opacity=".055"/>`;
  if (city.flagDisc) return `<circle cx="150" cy="290" r="210" fill="${city.flagDisc}" opacity=".055"/>`;
  return city.flag.map((c, i) => `<path d="M0 ${80+i*115} Q300 ${10+i*105} 560 ${105+i*105}T1024 ${90+i*115}V${190+i*115}Q760 ${235+i*100} 520 ${145+i*110}T0 ${190+i*115}Z" fill="${c}" opacity=".065"/>`).join('');
}

function ports(city) {
  return city.ports.map(([type, x, y]) => {
    const px = 675 + x * 2.35, py = 337 + y * 2.25;
    return `<g transform="translate(${px} ${py})" class="port ${type}"><circle r="15"/><path d="M0-10v18m-6-12h12M-11 3c2 8 20 8 22 0"/>${type === 'sea' ? '<path d="M-12 14q6-5 12 0t12 0M-11 19q5-4 11 0t11 0"/>' : '<path d="M-10 15q5-4 10 0t10 0"/>'}</g>`;
  }).join('');
}

function bar(values, colors, x, y, width, height) {
  let offset = 0;
  return `<clipPath id="bar-${x}-${y}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height/2}"/></clipPath><g clip-path="url(#bar-${x}-${y})">${values.map((v,i) => { const w=width*v/100; const s=`<rect x="${x+offset}" y="${y}" width="${w}" height="${height}" fill="${colors[i]}"/>`; offset+=w; return s; }).join('')}</g>`;
}

export function renderCard(c) {
  const gdpColors = ['#159447','#1476bd','#f3a600'];
  const religionColors = c.religions.map(r => r[2]);
  const titleSize = c.city.length > 20 ? 67 : c.city.length > 15 ? 82 : c.city.length > 11 ? 99 : 118;
  const populationSize = c.population.length > 9 ? 43 : c.population.length > 7 ? 49 : 57;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280" viewBox="0 0 1024 1280" role="img" aria-label="Карточка города ${esc(c.city)}">
<style>
text{font-family:Arial,'Segoe UI',sans-serif;fill:#12191b}.title{font-size:118px;font-weight:900;letter-spacing:-6px}.country{font-size:43px;font-weight:800;fill:#ba2626}.heading{font-size:25px;font-weight:900}.value{font-size:57px;font-weight:900;letter-spacing:-2px}.small{font-size:18px}.legend{font-size:17px;font-weight:650}.percent{font-size:20px;font-weight:900}.fact{font-size:23px;text-anchor:middle}.map{fill:#192226}.landmark{fill:none;stroke:#182123;stroke-width:5;stroke-linejoin:round}.panel{fill:#fffdfa;fill-opacity:.87;stroke:#ded8cd;stroke-width:2}.port circle{fill:#edf8ff;stroke:#1877b9;stroke-width:3}.port path{fill:none;stroke:#1877b9;stroke-width:3;stroke-linecap:round}.port.river circle{fill:#1678b9}.port.river path{stroke:#fff}.capital{fill:#e3272d;stroke:#fff;stroke-width:4}
</style>
<defs><filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="9" flood-opacity=".2"/></filter></defs>
<rect width="1024" height="1280" rx="38" fill="#f8f4ec"/>
<g>${backgroundFlag(c)}</g>
<rect x="15" y="15" width="994" height="1250" rx="34" fill="none" stroke="#fff" stroke-width="5" filter="url(#shadow)"/>
${flag(c)}
<text x="512" y="260" text-anchor="middle" class="title" style="font-size:${titleSize}px">${esc(c.city)}</text>
<text x="512" y="315" text-anchor="middle" class="country">${esc(c.country)}</text>
<g class="landmark" transform="translate(35 360) scale(1.8)">${landmarks[c.landmark]}</g>
${c.landmarkName ? `<text x="305" y="628" text-anchor="middle" class="small" font-weight="700">${esc(c.landmarkName)}</text>` : ''}
<g transform="translate(660 325) scale(2.7)"><path class="map" fill-rule="evenodd" d="${c.mapPath ?? maps[c.map]}"/></g>
${ports(c)}<circle class="capital" cx="${675+c.capital[0]*2.35}" cy="${337+c.capital[1]*2.25}" r="10"/>

<rect class="panel" x="35" y="670" width="395" height="220" rx="24"/><rect class="panel" x="445" y="670" width="544" height="220" rx="24"/>
<rect class="panel" x="35" y="905" width="455" height="320" rx="24"/><rect class="panel" x="505" y="905" width="484" height="320" rx="24"/>

<rect x="62" y="705" width="105" height="105" rx="22" fill="#c82026"/><circle cx="114" cy="740" r="15" fill="#fff"/><path d="M82 790v-23c0-24 64-24 64 0v23M96 790v-21m36 21v-21" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
<text x="190" y="722" class="heading">НАСЕЛЕНИЕ</text><text x="190" y="800" class="value" style="font-size:${populationSize}px">${esc(c.population)}</text>

<text x="470" y="713" class="heading">СТРУКТУРА ВВП</text>${bar(c.gdp,gdpColors,470,742,490,34)}
${['Сельское хозяйство','Промышленность','Услуги'].map((n,i)=>`<circle cx="484" cy="${805+i*28}" r="8" fill="${gdpColors[i]}"/><text x="502" y="${811+i*28}" class="legend">${n}</text><text x="930" y="${811+i*28}" text-anchor="end" class="percent" fill="${gdpColors[i]}">${c.gdp[i]}%</text>`).join('')}

<text x="262" y="950" text-anchor="middle" class="heading">РЕЛИГИЯ</text>${bar(c.religions.map(r=>r[1]),religionColors,62,972,400,22)}
${c.religions.map((r,i)=>`<circle cx="80" cy="${1025+i*44}" r="17" fill="${r[2]}"/><text x="80" y="${1033+i*44}" text-anchor="middle" font-size="21" fill="#fff">${r[3]}</text><text x="110" y="${1032+i*44}" class="legend">${esc(r[0])}</text><text x="450" y="${1032+i*44}" text-anchor="end" class="percent" fill="${r[2]}">${r[1]}%</text>`).join('')}

<text x="747" y="950" text-anchor="middle" class="heading">ИНТЕРЕСНЫЙ ФАКТ</text><g transform="translate(627 974)" class="landmark" opacity=".9"><path d="M0 80h240M15 70q45-55 90 0 45-55 90 0 18-20 30 0M15 70V30m210 40V30M10 30h20m185 0h20M0 91q15-10 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0"/></g>
${textLines(wrapFact(c.fact),747,1120,'fact',28)}
<g transform="translate(472 1230) scale(.28)" class="landmark">${landmarks[c.landmark]}</g>
</svg>`;
}

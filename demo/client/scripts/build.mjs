import { build } from 'vite';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// All dependencies already belong to the client package; no browser, server or DB needed.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
await build();
const temporary = resolve('node_modules/.cache/omaha-seo');
try {
  await build({ configFile: false, build: { ssr: 'src/seo/render.tsx', outDir: temporary, emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'render.mjs' } } } });
  const { publicPages } = await import(pathToFileURL(resolve(temporary, 'render.mjs')).href);
  const template = await readFile('dist/index.html', 'utf8');
  const pages = publicPages();
  for (const page of pages) {
    const destination = resolve('dist', page.path === '/' ? 'index.html' : `${page.path.slice(1)}/index.html`);
    await mkdir(dirname(destination), { recursive: true });
    const html = template.replace('lang="en"', `lang="${page.language}"`)
      .replace(/<title>[^<]*<\/title>/, page.head)
      .replace('<div id="root"></div>', `<div id="root" data-prerendered="true">${page.body}</div>`);
    await writeFile(destination, html);
  }
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>https://omahahilopoker.com${page.path}</loc></url>`).join('\n')}\n</urlset>\n`);
  // A separate shell prevents private routes from inheriting homepage content/canonical.
  await writeFile('dist/game.html', template.replace(/<title>[^<]*<\/title>/, '<title>Omaha Hi-Lo Table</title><meta name="robots" content="noindex, follow" />'));
  const admin = await readFile('dist/admin.html', 'utf8');
  await writeFile('dist/admin.html', admin.replace('</head>', '<meta name="robots" content="noindex, follow" /></head>'));
  console.log(`Prerendered ${pages.length} public pages and sitemap.xml`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

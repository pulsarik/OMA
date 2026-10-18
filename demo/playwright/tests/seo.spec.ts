import { expect, test } from '@playwright/test';

const slugs = ['rules', 'omaha-vs-holdem', 'how-to-play', 'hand-replay', 'statistics', 'poker-hints'];
const origin = 'https://omahahilopoker.com';

for (const javaScriptEnabled of [false, true]) {
  test(`rules exercises and old translated URLs use English with JavaScript ${javaScriptEnabled}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 360, height: 844 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const language of ['en', 'ru']) {
      await page.goto(`http://localhost:4000${language === 'ru' ? '/ru/rules' : '/rules'}`);
      await expect(page.locator('.practice-case')).toHaveCount(50);
      await expect(page.locator('.rules-ranks > li')).toHaveCount(9);
      const first = page.locator('#practice-1');
      await expect(first.locator('summary .rules-card')).toHaveCount(9);
      await expect(first.locator('.practice-body')).toBeHidden();
      await first.locator('summary').click();
      await expect(first.locator('.practice-body')).toContainText('only one heart');
      await page.locator('#practice-group-5 > summary').click();
      const odds = page.locator('#practice-42');
      await odds.locator('summary').click();
      await expect(odds.locator('.practice-body')).toContainText('100/300');
      await odds.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (javaScriptEnabled) await page.screenshot({ path: testInfo.outputPath(`practice-${language}-360.png`) });
      await expect(page.getByRole('link', { name: 'Practice with bots', exact: true })).toHaveAttribute('href', '/?start=bots');
    }
    if (javaScriptEnabled) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.locator('#hand-rankings').scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('rules-desktop.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByRole('link', { name: 'Practice with bots', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Play now', exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('homepage explains its features in static HTML and English', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto('http://localhost:4000/');
  await expect(staticPage.getByRole('heading', { level: 1 })).toHaveText('Omaha Hi-Lo poker online');
  await expect(staticPage.getByText('High · 50 chips', { exact: true })).toBeVisible();
  await expect(staticPage.getByRole('link', { name: /Rules, hand rankings/ })).toHaveAttribute('href', '/rules');
  await expect(staticPage.locator('.welcome-choice-card').first()).toHaveAttribute('href', '/?start=bots');
  await context.close();
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Friends at the table/ })).toBeVisible();
  const bots = page.getByRole('button', { name: 'Play with bots' });
  await expect(bots).toBeInViewport();
  await expect(page.getByRole('button', { name: 'RU', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('public content and metadata are available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 844 } });
  const page = await context.newPage();
  const titles = new Set<string>();
  for (const path of ['/', ...slugs.map(slug => `/${slug}`)]) {
    const response = await page.goto(`http://localhost:4000${path}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', origin + path);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/);
    await expect(page.locator('html')).toHaveAttribute('lang', path.startsWith('/ru/') ? 'ru' : 'en');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', origin + path);
    expect(titles.has(await page.title())).toBe(false);
    titles.add(await page.title());
    const schema = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(schema!)['@graph'].some((item: { '@type': string }) => item['@type'] === 'WebPage')).toBe(true);
    if (path !== '/') {
      await expect(page.locator('h2')).not.toHaveCount(0);
      await expect(page.locator('link[hreflang]')).toHaveCount(0);
    }
    await expect(page.locator('a[href="/rules"], a[href="/ru/rules"]')).not.toHaveCount(0);
  }
  await context.close();
});

test('sitemap, robots, redirects and private/error routing use correct responses', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(robots.headers()['content-type']).toContain('text/plain');
  expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toContain('xml');
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(7);
  expect(xml).not.toMatch(/player|lobby|debug|admin/);
  for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
    expect((await request.get(match[1].replace(origin, ''))).status()).toBe(200);
  }
  const redirect = await request.get('/rules/?source=test', { maxRedirects: 0 });
  expect(redirect.status()).toBe(301);
  expect(redirect.headers().location).toBe('/rules?source=test');
  for (const path of ['/', ...slugs.map(slug => `/${slug}`)]) {
    const alias = `${path === '/' ? '' : path}/index.html?source=test`;
    const response = await request.get(alias, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(`${path}?source=test`);
  }
  const missing = await request.get('/nonexistent-seo-page');
  expect(missing.status()).toBe(404);
  for (const path of ['/player/test/player/token', '/lobby/test', '/debug/test']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    const html = await response.text();
    expect(html).toContain('noindex, follow');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('<h1');
  }
});

for (const width of [360, 390, 400]) {
  test(`homepage and guides fit ${width}px and navigation works`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Play with bots' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Report a problem' })).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    for (const path of ['/', ...slugs.map(slug => `/${slug}`), '/ru/rules']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (path === '/rules') await page.screenshot({ path: testInfo.outputPath(`rules-${width}.png`), fullPage: true });
    }
    await expect(page.getByRole('link', { name: 'EN', exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/\/rules$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByRole('link', { name: 'Play Omaha Hi-Lo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play with friends' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('old translated statistics redirects to English and ignores saved language', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('omaha-language', 'ru'));
  await page.route('**/api/archive?*', route => route.fulfill({ json: { rows: [], page: 1, totalPages: 1 } }));
  await page.goto('/ru/statistics');
  await expect(page).toHaveURL(/\/statistics$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Hand archive', exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play with bots' })).toBeVisible();
});

test('static homepage entry links open existing setup and the built game still starts', async ({ page }) => {
  await page.goto('/?start=friends');
  await expect(page.getByRole('heading', { name: "Friends' tables - PIN required", exact: true })).toBeVisible();
  await page.goto('/?start=bots');
  await expect(page.getByRole('button', { name: 'Play now', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play now', exact: true }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(page.getByRole('group', { name: 'Actions', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Report a problem', exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test('index.html aliases keep the canonical content after JavaScript loads', async ({ page }) => {
  for (const path of ['/rules', '/ru/rules']) {
    await page.goto(`${path}/index.html`);
    await expect(page).toHaveURL(new RegExp(`${path.replace('/ru/', '/')}$`));
    await expect(page.locator('h1')).toContainText('Rules');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', origin + path.replace('/ru/', '/'));
  }
});

test('statistics Back, Lobby and About leave the statistics route', async ({ page }) => {
  await page.route('**/api/archive?*', route => route.fulfill({ json: { rows: [], page: 1, totalPages: 1 } }));
  for (const target of ['back', 'lobby', 'about']) {
    await page.goto('/statistics');
    await expect(page.getByRole('heading', { name: 'Hand archive', exact: true })).toBeVisible();
    if (target === 'back') await page.getByRole('button', { name: /Back$/ }).click();
    else await page.getByRole('tab', { name: target === 'about' ? /ABOUT/ : 'LOBBY' }).click();
    await expect(page).toHaveURL(target === 'about' ? 'http://localhost:4000/?view=about' : 'http://localhost:4000/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/`);
    await expect(page.getByRole('heading', { name: 'Omaha Hi-Lo Statistics & Hand Archive', exact: true })).toHaveCount(0);
    if (target === 'about') await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
    else await expect(page.getByRole('button', { name: 'Play with bots' })).toBeVisible();
  }
});

test('translated statistics redirects to English at game entry', async ({ page }) => {
  await page.route('**/api/archive?*', route => route.fulfill({ json: { rows: [], page: 1, totalPages: 1 } }));
  for (const language of ['ru', 'en']) {
    await page.goto(language === 'ru' ? '/ru/statistics' : '/statistics');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByRole('link', { name: 'Play Omaha Hi-Lo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play with bots' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }
});

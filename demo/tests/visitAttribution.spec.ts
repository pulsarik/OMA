import { expect, test } from '@jest/globals';
import { captureVisitAttribution } from '../client/src/visitAttribution';

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
  };
}

test('preserves the external source through lobby navigation and reloads without storing private URL data', () => {
  const storage = memoryStorage();
  const expected = { referrer: 'https://www.google.com', utmSource: '' };
  expect(captureVisitAttribution('https://omaha.test/', 'https://www.google.com/search?q=private', storage)).toEqual(expected);
  expect(captureVisitAttribution('https://omaha.test/lobby/123?pin=1234', 'https://omaha.test/', storage)).toEqual(expected);
  expect(captureVisitAttribution('https://omaha.test/player/123', '', storage)).toEqual(expected);
  expect(storage.getItem('omaha-visit-attribution')).not.toContain('private');
});

test('new external or tagged arrivals replace previous attribution', () => {
  const storage = memoryStorage();
  captureVisitAttribution('https://omaha.test/', '', storage);
  expect(captureVisitAttribution('https://omaha.test/?utm_source=newsletter', '', storage))
    .toEqual({ referrer: '', utmSource: 'newsletter' });
  expect(captureVisitAttribution('https://omaha.test/', 'https://example.com/article', storage))
    .toEqual({ referrer: 'https://example.com', utmSource: '' });
});

test('direct visits and unavailable or corrupt storage do not prevent playing', () => {
  expect(captureVisitAttribution('https://omaha.test/', '')).toEqual({ referrer: '', utmSource: '' });
  const storage = { getItem: () => '{invalid', setItem: () => { throw new Error('blocked'); } };
  expect(captureVisitAttribution('https://omaha.test/', '', storage)).toEqual({ referrer: '', utmSource: '' });
  expect(captureVisitAttribution('https://omaha.test/', 'https://example.com/path', storage))
    .toEqual({ referrer: 'https://example.com', utmSource: '' });
});

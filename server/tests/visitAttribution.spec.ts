import { visitCountry, visitSource } from '../src/visitAttribution';

test('country uses optional CDN metadata and excludes unknown/Tor codes', () => {
  expect(visitCountry({ 'cf-ipcountry': 'de' })).toBe('DE');
  for (const value of [undefined, 'XX', 'T1', 'Germany', ['DE', 'US']]) {
    expect(visitCountry({ 'cf-ipcountry': value })).toBeUndefined();
  }
});

test('source distinguishes old clients, direct visits, referrals and campaigns', () => {
  expect(visitSource(undefined)).toBeUndefined();
  expect(visitSource({ referrer: '', utmSource: '' })).toBe('direct');
  expect(visitSource({ referrer: 'https://www.google.com/search?q=private', utmSource: '' }))
    .toBe('referral:www.google.com');
  expect(visitSource({ referrer: 'https://example.com/private', utmSource: ' newsletter ' }))
    .toBe('campaign:newsletter');
  expect(visitSource({ referrer: 'javascript:alert(1)', utmSource: '' })).toBeUndefined();
  expect(visitSource({ referrer: {}, utmSource: [] })).toBeUndefined();
  expect(visitSource({ referrer: '', utmSource: 'x'.repeat(300) })).toHaveLength(109);
});

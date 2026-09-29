import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const blockFile = join(tmpdir(), `openclaw-collector-blocks-${process.pid}.json`);
process.env.OPENCLAW_COLLECTOR_BLOCK_STATE = blockFile;
process.env.OPENCLAW_BLOCK_COOLDOWN_MS = '60000';

const policy = await import('../lib/collector-policy.mjs');

test.after(() => {
  try { rmSync(blockFile, { force: true }); } catch {}
});

test('collector identity is stable and not a rotating consumer browser', () => {
  const a = policy.collectorUserAgent();
  const b = policy.collectorUserAgent();
  assert.equal(a, b);
  assert.doesNotMatch(a, /^Mozilla\//);
});
test('public headers remove personal/session correlation by default', () => {
  const headers = policy.sanitizePublicHeaders({
    Authorization: 'Bearer secret',
    Cookie: 'sid=personal; walmart.nearestStoreId=123',
    Referer: 'https://private.example/account',
    'X-Page-View-Id': 'abc',
    'User-Agent': 'Mozilla/5.0',
    Accept: 'application/json',
  });
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers.Cookie, undefined);
  assert.equal(headers.Referer, undefined);
  assert.equal(headers['X-Page-View-Id'], undefined);
  assert.notEqual(headers['User-Agent'], 'Mozilla/5.0');
  assert.equal(headers.Accept, 'application/json');
  assert.equal(headers.DNT, '1');
});

test('explicit anonymous context cookies are narrowly allowlisted', () => {
  const headers = policy.sanitizePublicHeaders({
    Cookie: 'sid=personal; walmart.nearestStoreId=123; other=456',
  }, {
    allowedCookieNames: ['walmart.nearestStoreId'],
  });
  assert.equal(headers.Cookie, 'walmart.nearestStoreId=123');
});
test('service authorization requires an explicit policy exception', () => {
  const headers = policy.sanitizePublicHeaders({
    Authorization: 'Bearer service-token',
  }, {
    allowServiceAuthorization: true,
  });
  assert.equal(headers.Authorization, 'Bearer service-token');
});

test('source fingerprint ignores secrets but preserves provenance identity', () => {
  const first = 'https://example.com/items?page=2&token=secret-one#frag';
  const second = 'https://example.com/items?token=secret-two&page=2';
  assert.equal(policy.canonicalizeSourceUrl(first), 'https://example.com/items?page=2');
  assert.equal(policy.sourceFingerprint(first), policy.sourceFingerprint(second));
  assert.match(policy.sourceFingerprint(first), /^[a-f0-9]{32}$/);
});

test('fetch options omit ambient credentials', () => {
  const options = policy.buildPublicFetchOptions({
    headers: { Cookie: 'sid=secret', Accept: 'text/html' },
  });
  assert.equal(options.credentials, 'omit');
  assert.equal(options.headers.Cookie, undefined);
  assert.equal(options.headers.Accept, 'text/html');
});
test('blocked hosts are persisted and rejected before another request', () => {
  const url = 'https://blocked.example/catalog';
  const entry = policy.markHostBlocked(url, 429);
  assert.equal(entry.status, 429);
  assert.ok(Date.parse(entry.until) > Date.now());
  assert.equal(policy.getHostBlock(url)?.status, 429);
  assert.throws(
    () => policy.assertHostNotBlocked(url),
    err => err?.code === 'COLLECTOR_BLOCKED' && err?.status === 429,
  );
});

test('block response statuses are explicit', () => {
  assert.equal(policy.isBlockStatus(401), true);
  assert.equal(policy.isBlockStatus(403), true);
  assert.equal(policy.isBlockStatus(429), true);
  assert.equal(policy.isBlockStatus(500), false);
});
test('isolated egress is an explicit runtime gate', () => {
  const prior = process.env.OPENCLAW_EGRESS_PROFILE;
  delete process.env.OPENCLAW_EGRESS_PROFILE;
  assert.equal(policy.isIsolatedEgressConfigured(), false);
  process.env.OPENCLAW_EGRESS_PROFILE = 'isolated';
  assert.equal(policy.isIsolatedEgressConfigured(), true);
  if (prior === undefined) delete process.env.OPENCLAW_EGRESS_PROFILE;
  else process.env.OPENCLAW_EGRESS_PROFILE = prior;
});

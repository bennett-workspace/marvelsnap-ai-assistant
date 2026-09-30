const { test } = require('node:test');
const assert = require('node:assert');
const { parseThaiDate, freshness } = require('./freshness.js');

test('parseThaiDate reads a plain date', () => {
  assert.strictEqual(parseThaiDate('20 ก.ย. 2026'), '2026-09-20');
});

test('parseThaiDate takes the last date', () => {
  assert.strictEqual(parseThaiDate('3/4 · Series 5 · Seasonal SNAP Pack — 29 ก.ย. 2026'), '2026-09-29');
  assert.strictEqual(parseThaiDate('1 ก.ย. – 6 ต.ค. 2026'), '2026-10-06');
});

test('parseThaiDate converts BE years', () => {
  assert.strictEqual(parseThaiDate('5 มี.ค. 2569'), '2026-03-05');
});

test('parseThaiDate returns null on garbage', () => {
  assert.strictEqual(parseThaiDate('soon'), null);
  assert.strictEqual(parseThaiDate(''), null);
});

const NOW = new Date('2026-09-30T00:00:00Z');
const byItem = rows => Object.fromEntries(rows.map(r => [r.item, r.status]));

test('freshness flags stale meta, due upcoming and a missing collection', () => {
  const D = { PATCH: { metaDate: '1 ก.ย. 2026 (x)', upcoming: [['A', '… — 29 ก.ย. 2026', 't'], ['B', 'no date', 't']] } };
  const rows = freshness(D, { now: NOW, collectionFile: null });
  const s = byItem(rows);
  assert.strictEqual(s.meta, 'stale');
  assert.strictEqual(s.collection, 'unknown');
  assert.strictEqual(s['upcoming:A'], 'due');
  assert.strictEqual(s['upcoming:B'], 'unknown');
  assert.deepStrictEqual(rows.map(r => r.item), ['meta', 'collection', 'upcoming:A', 'upcoming:B', 'latestPatch']);
});

test('freshness keeps unparseable metaDate unknown', () => {
  const s = byItem(freshness({ PATCH: { metaDate: 'n/a', upcoming: [] } }, { now: NOW, collectionFile: null }));
  assert.strictEqual(s.meta, 'unknown');
});

test('freshness counts a future upcoming date as fresh', () => {
  const D = { PATCH: { metaDate: '25 ก.ย. 2026', upcoming: [['A', '5 ต.ค. 2026', 't']] } };
  const s = byItem(freshness(D, { now: NOW, collectionFile: null }));
  assert.strictEqual(s['upcoming:A'], 'fresh');
  assert.strictEqual(s.meta, 'fresh');
});

test('parseThaiDate rejects impossible days instead of guessing', () => {
  assert.strictEqual(parseThaiDate('31 ก.พ. 2026'), null);
  assert.strictEqual(parseThaiDate('0 ต.ค. 2026'), null);
  assert.strictEqual(parseThaiDate('29 ก.พ. 2028'), '2028-02-29');
});

test('parseThaiDate needs whole numbers, not digits cut from longer ones', () => {
  assert.strictEqual(parseThaiDate('123 ก.ย. 2026'), null);
  assert.strictEqual(parseThaiDate('20 ก.ย. 12026'), null);
});

test('freshness marks a bad latestPatch date unknown', () => {
  const rows = freshness({ PATCH: { metaDate: 'n/a', upcoming: [] } }, { now: NOW, collectionFile: null, latestPatch: { version: 'v', releasedAt: 'garbage' } });
  assert.strictEqual(rows.find(r => r.item === 'latestPatch').status, 'unknown');
});

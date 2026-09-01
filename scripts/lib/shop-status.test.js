const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Single source of truth: pull the functions out of the app file itself.
const html = fs.readFileSync(path.resolve(__dirname, '../../marvel-snap-deck-builder.html'), 'utf8');
const m = html.match(/\/\* @testable:shop \*\/([\s\S]*?)\/\* @end:shop \*\//);
if (!m) throw new Error('shop status block markers not found in marvel-snap-deck-builder.html');
const { shopStatus, shopBuckets } = new Function(m[1] + '\nreturn { shopStatus, shopBuckets };')();

const b = (from, to, id) => ({ id: id || from + '_' + to, from, to });

test('a window containing today is live', () => {
  assert.strictEqual(shopStatus(b('2026-09-01', '2026-09-05'), '2026-09-02'), 'live');
});

test('boundary days count as live', () => {
  assert.strictEqual(shopStatus(b('2026-09-02', '2026-09-05'), '2026-09-02'), 'live');
  assert.strictEqual(shopStatus(b('2026-09-01', '2026-09-02'), '2026-09-02'), 'live');
});

test('a future window is upcoming and a past one is ended', () => {
  assert.strictEqual(shopStatus(b('2026-09-06', '2026-09-07'), '2026-09-02'), 'upcoming');
  assert.strictEqual(shopStatus(b('2026-08-20', '2026-09-01'), '2026-09-02'), 'ended');
});

test('shopBuckets sorts each bundle into exactly one bucket', () => {
  const shop = { snapshotAt: '2026-09-02', bundles: [
    b('2026-09-01', '2026-09-05', 'a'),
    b('2026-09-06', '2026-09-07', 'b'),
    b('2026-08-20', '2026-09-01', 'c')
  ]};
  const r = shopBuckets(shop, '2026-09-02');
  assert.deepStrictEqual(r.live.map(x => x.id), ['a']);
  assert.deepStrictEqual(r.upcoming.map(x => x.id), ['b']);
  assert.deepStrictEqual(r.ended.map(x => x.id), ['c']);
  assert.strictEqual(r.live.length + r.upcoming.length + r.ended.length, shop.bundles.length);
});

test('live bundles are ordered by which ends soonest', () => {
  const shop = { snapshotAt: '2026-09-02', bundles: [
    b('2026-09-01', '2026-09-09', 'later'),
    b('2026-09-01', '2026-09-03', 'sooner')
  ]};
  assert.deepStrictEqual(shopBuckets(shop, '2026-09-02').live.map(x => x.id), ['sooner', 'later']);
});

test('upcoming bundles are ordered by which starts soonest', () => {
  const shop = { snapshotAt: '2026-09-02', bundles: [
    b('2026-09-20', '2026-09-21', 'late'),
    b('2026-09-04', '2026-09-05', 'early')
  ]};
  assert.deepStrictEqual(shopBuckets(shop, '2026-09-02').upcoming.map(x => x.id), ['early', 'late']);
});

test('a snapshot older than 10 days is flagged stale', () => {
  const shop = { snapshotAt: '2026-09-02', bundles: [] };
  assert.strictEqual(shopBuckets(shop, '2026-09-10').stale, false);
  assert.strictEqual(shopBuckets(shop, '2026-09-12').stale, false);
  assert.strictEqual(shopBuckets(shop, '2026-09-13').stale, true);
  assert.strictEqual(shopBuckets(shop, '2026-09-13').daysOld, 11);
});

test('a missing or empty shop yields empty buckets rather than throwing', () => {
  const r = shopBuckets(null, '2026-09-02');
  assert.deepStrictEqual([r.live, r.upcoming, r.ended], [[], [], []]);
});

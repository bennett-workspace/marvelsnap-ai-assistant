const { test } = require('node:test');
const assert = require('node:assert');
const { listVersions, resolveVersion, loadAt, entityKeyFor, buildProvenance, provenance, readPatches } = require('./history.js');
const { loadCurrent } = require('../patch-tools/current-state.js');

test('listVersions starts with the baseline and follows the manifest', () => {
  const v = listVersions();
  assert.strictEqual(v[0].version, '2026.08.16.000');
  assert.strictEqual(v[0].source, 'baseline (HTML)');
  assert.strictEqual(v[15].version, '2026.08.16.015');
  assert.ok(v.slice(1).every(e => typeof e.source === 'string'));
  assert.ok(v.every(e => !('operations' in e)));
});

test('resolveVersion accepts full, suffix and number', () => {
  assert.strictEqual(resolveVersion('2026.08.16.015'), '2026.08.16.015');
  assert.strictEqual(resolveVersion('015'), '2026.08.16.015');
  assert.strictEqual(resolveVersion(15), '2026.08.16.015');
  assert.strictEqual(resolveVersion(0), '2026.08.16.000');
});

test('resolveVersion rejects unknown', () => {
  assert.throws(() => resolveVersion('999'), /unknown version: 999/);
});

test('loadAt(latest) equals loadCurrent', () => {
  assert.deepStrictEqual(loadAt(listVersions().at(-1).version), loadCurrent().D);
});

test('loadAt 014 has 498 cards and no TheInversion', () => {
  const D = loadAt('014');
  assert.strictEqual(D.CARDS.length, 498);
  assert.ok(!D.CARDS.some(c => c.id === 'TheInversion'));
});

test('loadAt 015 has 499 cards', () => {
  assert.strictEqual(loadAt('015').CARDS.length, 499);
});

test('loadAt returns independent copies', () => {
  const a = loadAt('015');
  a.CARDS[0].c = 99;
  assert.notStrictEqual(loadAt('015').CARDS[0].c, 99);
});

test('buildProvenance follows ids across an index-shifting remove', () => {
  const baseline = { CARDS: [{ id: 'A', c: 1 }, { id: 'B', c: 1 }, { id: 'C', c: 1 }], PATCH: {} };
  const patches = [
    { version: 'v1', source: 's1', releasedAt: 'r1', operations: [{ op: 'remove', path: '/CARDS/0' }] },
    { version: 'v2', source: 's2', releasedAt: 'r2', operations: [{ op: 'replace', path: '/CARDS/1/c', value: 5 }] },
  ];
  const prov = buildProvenance(baseline, patches);
  assert.deepStrictEqual(prov.get('card:C'), [{ version: 'v2', op: 'replace', field: 'c', source: 's2', releasedAt: 'r2' }]);
  assert.deepStrictEqual(prov.get('card:A'), [{ version: 'v1', op: 'remove', field: null, source: 's1', releasedAt: 'r1' }]);
  assert.strictEqual(prov.has('card:B'), false);
  assert.strictEqual(baseline.CARDS.length, 3, 'baseline must not be mutated');
});

test('entityKeyFor maps each root', () => {
  const D = { CARDS: [], PATCH: {}, MATCH: { ramp: [1, 2, 3] }, SHOP: {} };
  assert.deepStrictEqual(entityKeyFor(D, { op: 'replace', path: '/PATCH/upcoming' }), { key: 'patch:upcoming', field: null });
  assert.deepStrictEqual(entityKeyFor(D, { op: 'replace', path: '/MATCH/ramp/2' }), { key: 'match:ramp', field: '2' });
  assert.deepStrictEqual(entityKeyFor(D, { op: 'add', path: '/SHOP', value: {} }), { key: 'shop', field: null });
  assert.deepStrictEqual(entityKeyFor(D, { op: 'add', path: '/CARDS/-', value: { id: 'X' } }), { key: 'card:X', field: null });
});

test('entityKeyFor decodes ~1 and ~0', () => {
  const D = { MATCH: {} };
  assert.strictEqual(entityKeyFor(D, { op: 'add', path: '/MATCH/a~1b/x', value: 1 }).key, 'match:a/b');
  assert.strictEqual(entityKeyFor(D, { op: 'add', path: '/MATCH/a~0b', value: 1 }).key, 'match:a~b');
});

test('entityKeyFor reports an id-less array entry as unresolved', () => {
  const D = { CARDS: [{ n: 'no id' }] };
  assert.deepStrictEqual(entityKeyFor(D, { op: 'replace', path: '/CARDS/0/c', value: 1 }), { key: 'unresolved', field: '/CARDS/0/c' });
});

test('real provenance of TheInversion is its v015 add', () => {
  const p15 = readPatches().find(p => p.version === '2026.08.16.015');
  assert.deepStrictEqual(provenance().get('card:TheInversion'), [
    { version: '2026.08.16.015', op: 'add', field: null, source: p15.source, releasedAt: p15.releasedAt },
  ]);
});

test('real provenance has no unresolved ops', () => {
  assert.strictEqual(provenance().has('unresolved'), false);
});

test('entityKeyFor keys a whole-collection replace by the collection', () => {
  const D = { META: [{ id: 'a' }] };
  assert.deepStrictEqual(entityKeyFor(D, { op: 'replace', path: '/META', value: [] }), { key: 'meta', field: null });
});

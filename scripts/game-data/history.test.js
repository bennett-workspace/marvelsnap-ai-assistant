const { test } = require('node:test');
const assert = require('node:assert');
const { listVersions, resolveVersion, loadAt } = require('./history.js');
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

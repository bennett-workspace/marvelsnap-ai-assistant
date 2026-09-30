const { test } = require('node:test');
const assert = require('node:assert');
const { diffStates } = require('./diff.js');
const { loadAt } = require('./history.js');

const A = { CARDS: [{ id: 'x', c: 1, p: 1 }, { id: 'y', c: 2, p: 2 }], PATCH: { v: 1, k: 's' }, SHOP: { a: 1 }, MATCH: {} };
const B = { CARDS: [{ id: 'x', c: 1, p: 3 }, { id: 'z', c: 4, p: 4 }], PATCH: { v: 2, k: 's' }, SHOP: { a: 2 }, MATCH: {} };

test('diffStates on a fixture', () => {
  const d = diffStates(A, B);
  assert.deepStrictEqual(d.cards, {
    added: ['z'], removed: ['y'],
    changed: [{ id: 'x', fields: [{ field: 'p', before: 1, after: 3 }] }],
  });
  assert.deepStrictEqual(d.locations, { added: [], removed: [], changed: [] });
  assert.deepStrictEqual(d.patch, [{ field: 'v', before: 1, after: 2 }]);
  assert.strictEqual(d.other.SHOP, true);
  assert.strictEqual(d.other.MATCH, false);
});

test('diffStates does not mutate inputs', () => {
  const a = JSON.stringify(A), b = JSON.stringify(B);
  diffStates(A, B);
  assert.strictEqual(JSON.stringify(A), a);
  assert.strictEqual(JSON.stringify(B), b);
});

test('real diff 014 -> 015 is exactly The Inversion', () => {
  const d = diffStates(loadAt('014'), loadAt('015'));
  const empty = { added: [], removed: [], changed: [] };
  assert.deepStrictEqual(d.cards, { added: ['TheInversion'], removed: [], changed: [] });
  assert.deepStrictEqual(d.locations, empty);
  assert.deepStrictEqual(d.meta, empty);
  assert.deepStrictEqual(d.archetypes, empty);
  assert.deepStrictEqual(d.patch.map(f => f.field).sort(), ['dataVersion', 'upcoming']);
  assert.ok(Object.values(d.other).every(v => v === false));
});

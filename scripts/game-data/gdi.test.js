const { test } = require('node:test');
const assert = require('node:assert');
const { findCard, main } = require('./gdi.js');
const { loadAt } = require('./history.js');

const cards = loadAt('015').CARDS;

function run(argv) {
  const lines = [];
  const code = main(argv, l => lines.push(String(l)));
  return { code, text: lines.join('\n') };
}

test('findCard prefers exact name over substring', () => {
  assert.strictEqual(findCard(cards, 'hulk').card.n, 'Hulk');
});

test('findCard matches an exact name case-insensitively', () => {
  assert.strictEqual(findCard(cards, 'red hulk').card.n, 'Red Hulk');
});

test('findCard treats a single substring hit as a match', () => {
  assert.strictEqual(findCard(cards, 'hulk f').card.n, 'Red Hulk Fractured Frontier');
});

test('findCard lists candidates when ambiguous', () => {
  assert.deepStrictEqual(findCard(cards, 'red hul'), { candidates: ['Red Hulk', 'Red Hulk Fractured Frontier'] });
});

test('findCard returns no candidates for no match', () => {
  assert.deepStrictEqual(findCard(cards, 'zzz'), { candidates: [] });
});

test('main card prints The Inversion with provenance', () => {
  const { code, text } = run(['card', 'The Inversion']);
  assert.strictEqual(code, 0);
  assert.match(text, /TheInversion/);
  assert.match(text, /3\/0/);
  assert.match(text, /2026\.08\.16\.015 add/);
});

test('main at before existence exits 1', () => {
  const { code, text } = run(['at', '014', 'card', 'TheInversion']);
  assert.strictEqual(code, 1);
  assert.match(text, /not present at 2026\.08\.16\.014/);
});

test('main diff --json matches diffStates', () => {
  const { code, text } = run(['diff', '014', '015', '--json']);
  assert.strictEqual(code, 0);
  assert.deepStrictEqual(JSON.parse(text).cards.added, ['TheInversion']);
});

test('main unknown command exits 2 with usage', () => {
  const { code, text } = run(['frobnicate']);
  assert.strictEqual(code, 2);
  assert.match(text, /usage/i);
});

test('main unknown version exits 2', () => {
  const { code, text } = run(['diff', '014', '999']);
  assert.strictEqual(code, 2);
  assert.match(text, /unknown version: 999/);
});

test('--json errors are JSON: ambiguous, absent, not present, unknown version', () => {
  const amb = run(['card', 'red', 'hul', '--json']);
  assert.strictEqual(amb.code, 1);
  assert.deepStrictEqual(JSON.parse(amb.text), { error: 'ambiguous', query: 'red hul', candidates: ['Red Hulk', 'Red Hulk Fractured Frontier'] });
  assert.strictEqual(JSON.parse(run(['card', 'zzz', '--json']).text).error, 'not found');
  const np = JSON.parse(run(['at', '014', 'card', 'TheInversion', '--json']).text);
  assert.deepStrictEqual(np, { error: 'not present', query: 'TheInversion', version: '2026.08.16.014', candidates: [] });
  const uv = run(['at', '999', 'card', 'x', '--json']);
  assert.strictEqual(uv.code, 2);
  assert.deepStrictEqual(JSON.parse(uv.text), { error: 'unknown version: 999' });
});

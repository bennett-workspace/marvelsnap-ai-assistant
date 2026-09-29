const { test } = require('node:test');
const assert = require('node:assert');
const { extractFacts, parseFactsBlock, diffFacts, findAnchors, checkAnchors } = require('./check-repo-map.js');

const HTML = [
  '<script>',
  "var K={col:'x.v1',decks:'y.v1'};",
  'V.alpha=function(){};',
  'V.beta = function(){};',
  'V.alpha=function(){};',
  '</script>',
].join('\n');

test('extractFacts reads routes, storage keys, scripts', () => {
  const facts = extractFacts({
    html: HTML,
    files: ['scripts/a.js', 'scripts/lib/b.test.js', 'README.md', 'verify-manifest.js'],
    current: { PATCH: {}, CARDS: [] },
  });
  assert.deepStrictEqual(facts.routes, ['alpha', 'beta']);
  assert.deepStrictEqual(facts.storageKeys, { col: 'x.v1', decks: 'y.v1' });
  assert.deepStrictEqual(facts.scripts, ['scripts/a.js', 'scripts/lib/b.test.js', 'verify-manifest.js']);
  assert.deepStrictEqual(facts.snapdataKeys, ['CARDS', 'PATCH']);
});

const MD = [
  '# Map',
  '',
  '## Facts',
  '',
  '```json repo-facts',
  '{"routes":["alpha"]}',
  '```',
  '',
].join('\n');

test('parseFactsBlock reads the block', () => {
  assert.deepStrictEqual(parseFactsBlock(MD), { routes: ['alpha'] });
});

test('parseFactsBlock reads the block from CRLF text', () => {
  assert.deepStrictEqual(parseFactsBlock(MD.replace(/\n/g, '\r\n')), { routes: ['alpha'] });
});

test('parseFactsBlock throws when missing', () => {
  assert.throws(() => parseFactsBlock('# Map\n\n```json\n{}\n```\n'), /repo-facts block not found/);
});

test('parseFactsBlock throws on two blocks', () => {
  assert.throws(() => parseFactsBlock(MD + MD), /multiple repo-facts blocks/);
});

test('diffFacts reports added and removed routes', () => {
  const problems = diffFacts({ routes: ['a', 'b'] }, { routes: ['b', 'c'] });
  assert.strictEqual(problems.length, 1);
  assert.strictEqual(problems[0].section, 'routes');
  assert.match(problems[0].message, /added: c/);
  assert.match(problems[0].message, /removed: a/);
});

test('diffFacts reports a changed storage key', () => {
  const problems = diffFacts({ storageKeys: { col: 'x.v1' } }, { storageKeys: { col: 'x.v2' } });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0].message, /col: "x\.v1" -> "x\.v2"/);
});

test('diffFacts returns [] for equal facts', () => {
  const f = { routes: ['a'], snapdataKeys: ['CARDS'], storageKeys: { col: 'x' }, scripts: ['s.js'] };
  assert.deepStrictEqual(diffFacts(f, JSON.parse(JSON.stringify(f))), []);
});

test('findAnchors finds functions and paths', () => {
  const md = 'Uses `buildDeck()` and `V.recommend()`; run `scripts/deck-tools/validate-decks.js`.';
  assert.deepStrictEqual(findAnchors(md), {
    functions: ['buildDeck', 'recommend'],
    paths: ['scripts/deck-tools/validate-decks.js'],
  });
});

test('findAnchors ignores placeholders and globs', () => {
  const md = '`V.<route>` `patches/*.json` `<runDir>/cards.json` `%LocalAppData%Low/x.json` `https://a/b.js`';
  assert.deepStrictEqual(findAnchors(md), { functions: [], paths: [] });
});

test('checkAnchors accepts both definition styles', () => {
  const html = 'function foo(){}\nvar bar=function(){};';
  const problems = checkAnchors({ functions: ['foo', 'bar'], paths: [] }, { html, jsSources: {}, exists: () => true });
  assert.deepStrictEqual(problems, []);
});

test('checkAnchors finds a function defined in a script file', () => {
  const problems = checkAnchors({ functions: ['loadCurrent'], paths: [] },
    { html: '', jsSources: { 'scripts/x.js': 'function loadCurrent() {}' }, exists: () => true });
  assert.deepStrictEqual(problems, []);
});

test('checkAnchors reports a missing function and path', () => {
  const problems = checkAnchors({ functions: ['gone'], paths: ['nope.js'] }, { html: '', jsSources: {}, exists: () => false });
  assert.strictEqual(problems.length, 2);
  assert.ok(problems.every(p => p.section === 'anchors'));
  assert.match(problems[0].message, /gone\(\)/);
  assert.match(problems[1].message, /nope\.js/);
});

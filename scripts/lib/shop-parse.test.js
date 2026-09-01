const { test } = require('node:test');
const assert = require('node:assert');
const { parsePrice, parsePct, parseDateRange, classifyItem, slugify } = require('./shop-parse.js');

test('parsePrice reads USD', () => {
  assert.deepStrictEqual(parsePrice('$4.99'), { kind: 'usd', amount: 4.99 });
  assert.deepStrictEqual(parsePrice('$99.99'), { kind: 'usd', amount: 99.99 });
});

test('parsePrice reads gold, including thousands separators', () => {
  assert.deepStrictEqual(parsePrice('600 Gold'), { kind: 'gold', amount: 600 });
  assert.deepStrictEqual(parsePrice('1,500 Gold'), { kind: 'gold', amount: 1500 });
});

test('parsePrice throws rather than guessing', () => {
  assert.throws(() => parsePrice('Bundle Value'), /unparseable price/i);
  assert.throws(() => parsePrice(''), /unparseable price/i);
});

test('parsePct reads a percentage', () => {
  assert.strictEqual(parsePct('1334%'), 1334);
  assert.strictEqual(parsePct('0%'), 0);
});

test('parsePct throws on non-percentages', () => {
  assert.throws(() => parsePct('Currency Value'), /unparseable percent/i);
});

test('parseDateRange resolves a same-month range against the snapshot year', () => {
  assert.deepStrictEqual(
    parseDateRange('Sep 1 - Sep 5', '2026-09-02'),
    { from: '2026-09-01', to: '2026-09-05' });
});

test('parseDateRange handles a cross-month range', () => {
  assert.deepStrictEqual(
    parseDateRange('Aug 31 - Sep 2', '2026-09-02'),
    { from: '2026-08-31', to: '2026-09-02' });
});

test('parseDateRange rolls the end date into the next year when it wraps', () => {
  assert.deepStrictEqual(
    parseDateRange('Dec 28 - Jan 3', '2026-12-30'),
    { from: '2026-12-28', to: '2027-01-03' });
});

test('parseDateRange pulls a far-past start forward to next year', () => {
  // Scraped in December, a "Jan 5 - Jan 9" window is next January, not last.
  assert.deepStrictEqual(
    parseDateRange('Jan 5 - Jan 9', '2026-12-30'),
    { from: '2027-01-05', to: '2027-01-09' });
});

test('parseDateRange throws on malformed input', () => {
  assert.throws(() => parseDateRange('sometime soon', '2026-09-02'), /unparseable date range/i);
});

test('classifyItem recognises a variant id', () => {
  assert.deepStrictEqual(classifyItem('LukeCage_10'),
    { kind: 'variant', card: 'Luke Cage', variantId: 'LukeCage_10', label: 'LukeCage_10' });
});

test('classifyItem recognises currencies', () => {
  assert.deepStrictEqual(classifyItem("500 Collector's Tokens"),
    { kind: 'tokens', qty: 500, label: "500 Collector's Tokens" });
  assert.deepStrictEqual(classifyItem('1000 Credits'),
    { kind: 'credits', qty: 1000, label: '1000 Credits' });
  assert.deepStrictEqual(classifyItem('65 Random Boosters'),
    { kind: 'boosters', qty: 65, label: '65 Random Boosters' });
});

test('classifyItem keeps unknown rewards instead of dropping them', () => {
  assert.deepStrictEqual(classifyItem('Mystery Border'),
    { kind: 'other', label: 'Mystery Border' });
});

test('slugify makes a stable id', () => {
  assert.strictEqual(slugify('Sep 26 Cage'), 'sep-26-cage');
  assert.strictEqual(slugify("Aug 26 B P 04"), 'aug-26-b-p-04');
});

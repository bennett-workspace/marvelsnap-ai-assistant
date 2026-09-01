# UI Motion, Highlight Bar, and Shop Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a motion layer across the app, a highlight bar summarising recent game updates, and a new shop view backed by a dated bundle snapshot shipped through the patch pipeline.

**Architecture:** The app is one static HTML file (`marvel-snap-deck-builder.html`, ~1.58MB) with a single `<style>` block (lines 11–263) and two `<script>` blocks. All data lives in `window.SNAPDATA` and is updated by JSON-Patch files under `patches/`, verified by SHA-256 against `manifest.json`. Shop data is added as a new `SHOP` key via patch `2026.08.16.012`; a Node build script scrapes snap.fan and emits that patch. Status (live / upcoming / ended) is computed in the browser from `from`/`to` dates so one snapshot stays correct for days.

**Tech Stack:** Vanilla JS + CSS in a single HTML file. Node 24 for build scripts and tests, using the built-in `node --test` runner and `node:assert` — no npm dependencies, no `package.json`.

**Spec:** `docs/superpowers/specs/2026-09-02-ui-motion-and-shop-tab-design.md`

## Global Constraints

- **Repo:** `C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant`. The app file `marvel-snap-deck-builder.html` exists in **two** places that must stay byte-identical: repo root and `C:\Users\natta\Desktop\AI\Marvel Snap\`. Edit the repo copy, then `cp` to the Desktop copy.
- **Never run `git push`.** Commit only. The user pushes via GitHub Desktop.
- **Line endings:** `.gitattributes` pins `manifest.json` and `patches/*.json` to `eol=lf`. Never hand-edit a patch file's hash; always take it from the build script output, and always run `node verify-manifest.js` before committing a manifest change.
- **Patch version for this work:** `2026.08.16.012`, `fromVersion` `2026.08.16.011`.
- **Thai UI copy:** natural Thai, not literal translation. Card names, deck names, and bundle names stay in English as published.
- **Never invent data.** Bundle names are published codenames; strip only a leading `MMM YY ` prefix. Unpriced rewards render as `ไม่ตีราคา`, never `0`.
- **Reduced motion:** line 262 is `@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}#stars{display:none}}`. Every animation added must be plain CSS `animation`/`transition` so this guard reaches it. JS-driven motion must check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` itself, as line 2740 already does.
- **Stagger cap:** 12. Enforced where the index is emitted, never by trusting callers.

---

### Task 1: Shop parsing library

Pure functions that turn snap.fan's text into structured data. No I/O, so they are fast to test and the tests are the specification.

**Files:**
- Create: `scripts/lib/shop-parse.js`
- Test: `scripts/lib/shop-parse.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parsePrice(text)` → `{kind:'usd'|'gold', amount:number}`; throws `Error` on unparseable input.
  - `parsePct(text)` → `number`; throws on unparseable input.
  - `parseDateRange(text, snapshotISO)` → `{from:'YYYY-MM-DD', to:'YYYY-MM-DD'}`; throws on unparseable input.
  - `classifyItem(label)` → `{kind, qty?, card?, variantId?, label}`.
  - `slugify(name)` → `string`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/shop-parse.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant" && node --test`
Expected: FAIL — `Cannot find module './shop-parse.js'`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/shop-parse.js`:

```js
'use strict';

const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
const DAY = 86400000;

function parsePrice(text) {
  const s = String(text == null ? '' : text).trim();
  let m = s.match(/^\$\s*([\d,]+(?:\.\d+)?)$/);
  if (m) return { kind: 'usd', amount: Number(m[1].replace(/,/g, '')) };
  m = s.match(/^([\d,]+)\s*Gold$/i);
  if (m) return { kind: 'gold', amount: Number(m[1].replace(/,/g, '')) };
  throw new Error('unparseable price: ' + JSON.stringify(s));
}

function parsePct(text) {
  const s = String(text == null ? '' : text).trim();
  const m = s.match(/^([\d,]+(?:\.\d+)?)\s*%$/);
  if (!m) throw new Error('unparseable percent: ' + JSON.stringify(s));
  return Number(m[1].replace(/,/g, ''));
}

function iso(d) {
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0');
}

function parseDateRange(text, snapshotISO) {
  const s = String(text == null ? '' : text).trim();
  const m = s.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s*-\s*(?:([A-Z][a-z]{2})\s+)?(\d{1,2})$/);
  if (!m || !(m[1] in MONTHS)) throw new Error('unparseable date range: ' + JSON.stringify(s));
  const endMon = m[3] === undefined ? m[1] : m[3];
  if (!(endMon in MONTHS)) throw new Error('unparseable date range: ' + JSON.stringify(s));

  const snap = new Date(snapshotISO + 'T00:00:00Z');
  let year = snap.getUTCFullYear();
  let from = new Date(Date.UTC(year, MONTHS[m[1]], Number(m[2])));

  // A window scraped near a year boundary can land in the wrong year. Pull it
  // to whichever side of the snapshot it is actually near.
  if (from.getTime() - snap.getTime() > 180 * DAY) {
    from = new Date(Date.UTC(--year, MONTHS[m[1]], Number(m[2])));
  } else if (snap.getTime() - from.getTime() > 180 * DAY) {
    from = new Date(Date.UTC(++year, MONTHS[m[1]], Number(m[2])));
  }

  let to = new Date(Date.UTC(year, MONTHS[endMon], Number(m[4])));
  if (to.getTime() < from.getTime()) to = new Date(Date.UTC(year + 1, MONTHS[endMon], Number(m[4])));

  return { from: iso(from), to: iso(to) };
}

function classifyItem(label) {
  const s = String(label == null ? '' : label).trim();
  let m = s.match(/^([A-Za-z0-9.'-]+)_(\d+)$/);
  if (m) {
    // "LukeCage" -> "Luke Cage"; leaves already-spaced or lowercase ids alone.
    const card = m[1].replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
    return { kind: 'variant', card, variantId: s, label: s };
  }
  const qty = (t) => Number(t.replace(/,/g, ''));
  if ((m = s.match(/^([\d,]+)\s+Collector'?s?\s+Tokens$/i))) return { kind: 'tokens',   qty: qty(m[1]), label: s };
  if ((m = s.match(/^([\d,]+)\s+Credits$/i)))                 return { kind: 'credits',  qty: qty(m[1]), label: s };
  if ((m = s.match(/^([\d,]+)\s+(?:Random\s+)?Boosters$/i)))  return { kind: 'boosters', qty: qty(m[1]), label: s };
  if ((m = s.match(/^([\d,]+)\s+Gold$/i)))                    return { kind: 'gold',     qty: qty(m[1]), label: s };
  return { kind: 'other', label: s };
}

function slugify(name) {
  return String(name == null ? '' : name)
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { parsePrice, parsePct, parseDateRange, classifyItem, slugify };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant" && node --test`
Expected: PASS — 14 tests, 0 fail.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant"
git add scripts/lib/shop-parse.js scripts/lib/shop-parse.test.js
git commit -m "Add shop data parsing library with tests

Pure parsers for snap.fan bundle text: price (USD and gold), percentage,
date range, reward classification, and id slugs. The date parser resolves
the missing year against the snapshot and handles December-to-January
windows, which would otherwise resolve backwards."
```

---

### Task 2: Shop patch build script

Scrapes snap.fan, assembles `SHOP`, and emits patch `2026.08.16.012`.

**Files:**
- Create: `scripts/build-shop-patch.js`
- Modify: `manifest.json` (append the v012 entry)

**Interfaces:**
- Consumes: `scripts/lib/shop-parse.js` from Task 1.
- Produces: `patches/2026.08.16.012.json` adding `/SHOP` to `SNAPDATA`, with the shape given in the spec.

- [ ] **Step 1: Write the build script**

Create `scripts/build-shop-patch.js`:

```js
'use strict';
/*
 * Scrapes snap.fan/bundles and emits the SHOP patch.
 *
 * Fails loudly. A bundle whose date range or price will not parse aborts the
 * whole run and names the offender, because a silently half-populated shop is
 * worse than no shop: the user cannot tell absence of data from absence of
 * bundles.
 *
 * Usage: node scripts/build-shop-patch.js [path-to-saved.html]
 *   With no argument it fetches the page live.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { parsePrice, parsePct, parseDateRange, classifyItem, slugify } = require('./lib/shop-parse.js');

const REPO = path.resolve(__dirname, '..');
const VERSION = '2026.08.16.012';
const FROM_VERSION = '2026.08.16.011';
const SOURCE_URL = 'https://snap.fan/bundles/';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let d = ''; res.setEncoding('utf8');
      res.on('data', c => d += c); res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function toLines(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  h = h.replace(/<[^>]+>/g, '\n');
  const decode = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
                       .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
  return decode(h).split('\n').map(s => s.trim()).filter(Boolean);
}

const RANGE_RE = /^[A-Z][a-z]{2}\s+\d{1,2}\s*-\s*(?:[A-Z][a-z]{2}\s+)?\d{1,2}$/;

function parseBundles(lines, snapshotAt, skipped) {
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    if (!RANGE_RE.test(lines[i])) continue;
    const name = lines[i - 1];
    const rangeText = lines[i];
    // Fields follow a fixed order: price, "Bundle Value", pct, "Currency Value", pct
    const priceText = lines[i + 1];
    if (priceText === 'Bundle Value') {
      // snap.fan really does list some entries with no published price. Skip
      // them, but count and report — a dropped bundle must never be silent.
      skipped.push(name);
      continue;
    }

    let price, dates;
    try { dates = parseDateRange(rangeText, snapshotAt); }
    catch (e) { throw new Error('bundle "' + name + '": ' + e.message); }
    try { price = parsePrice(priceText); }
    catch (e) { throw new Error('bundle "' + name + '": ' + e.message); }

    let valuePct = null, currencyPct = null;
    if (lines[i + 2] === 'Bundle Value') valuePct = parsePct(lines[i + 3]);
    if (lines[i + 4] === 'Currency Value') currencyPct = parsePct(lines[i + 5]);

    // Rewards run from after the percentages to "View Breakdown"
    let j = i + 6;
    const rewardLabels = [];
    while (j < lines.length && lines[j] !== 'View Breakdown' && !RANGE_RE.test(lines[j])) {
      rewardLabels.push(lines[j]); j++;
    }

    // The breakdown repeats each reward followed by its gold value
    const goldByLabel = {};
    if (lines[j] === 'View Breakdown') {
      let k = j;
      while (k < lines.length && lines[k] !== 'Total Gold Value' && !RANGE_RE.test(lines[k])) k++;
      const seg = lines.slice(j, k);
      for (let p = 0; p < seg.length - 1; p++) {
        if (rewardLabels.includes(seg[p]) && /^[\d,]+$/.test(seg[p + 1])) {
          goldByLabel[seg[p]] = Number(seg[p + 1].replace(/,/g, ''));
        }
      }
    }

    let goldValue = null;
    const tot = lines.indexOf('Total Gold Value', i);
    if (tot > -1 && tot < i + 60 && /^[\d,]+$/.test(lines[tot + 1] || '')) {
      goldValue = Number(lines[tot + 1].replace(/,/g, ''));
    }

    out.push({
      id: slugify(name),
      name: name.replace(/^[A-Z][a-z]{2}\s+\d{2}\s+/, ''),
      from: dates.from,
      to: dates.to,
      price, valuePct, currencyPct, goldValue,
      items: rewardLabels.map(l => {
        const it = classifyItem(l);
        it.goldValue = Object.prototype.hasOwnProperty.call(goldByLabel, l) ? goldByLabel[l] : null;
        return it;
      })
    });
  }
  return out;
}

(async function main() {
  const snapshotAt = new Date().toISOString().slice(0, 10);
  const html = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : await fetchText(SOURCE_URL);
  const skipped = [];
  const bundles = parseBundles(toLines(html), snapshotAt, skipped);

  if (!bundles.length) throw new Error('no bundles parsed — page layout probably changed; refusing to emit an empty shop');
  if (skipped.length) console.warn('skipped (no published price): ' + skipped.length + ' — ' + skipped.join(', '));
  if (skipped.length > bundles.length) {
    throw new Error('skipped more listings (' + skipped.length + ') than parsed (' + bundles.length +
      ') — the price column probably moved; refusing to ship a half-populated shop');
  }

  const seen = new Set();
  for (const b of bundles) {
    if (seen.has(b.id)) throw new Error('duplicate bundle id: ' + b.id);
    seen.add(b.id);
  }

  const patch = {
    version: VERSION,
    fromVersion: FROM_VERSION,
    schemaVersion: 1,
    releasedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    source: 'snap.fan/bundles snapshot ' + snapshotAt,
    summary: 'เพิ่มหน้าร้านค้า — bundle ที่ขายอยู่และที่กำลังจะเข้า ' + bundles.length +
             ' รายการ (ข้อมูล ณ ' + snapshotAt + ') พร้อมราคา ช่วงวันที่ ความคุ้ม และของที่ได้',
    operations: [
      { op: 'add', path: '/SHOP', value: { snapshotAt, source: 'snap.fan/bundles', bundles } }
    ]
  };

  const json = JSON.stringify(patch, null, 2);
  fs.writeFileSync(path.join(REPO, 'patches', VERSION + '.json'), json, 'utf8');
  console.log('wrote patches/' + VERSION + '.json');
  console.log('bundles:', bundles.length);
  console.log('sha256:', crypto.createHash('sha256').update(json, 'utf8').digest('hex'));
})().catch(e => { console.error('BUILD FAILED:', e.message); process.exit(1); });
```

- [ ] **Step 2: Run it and confirm it produces sane data**

Run: `cd "C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant" && node scripts/build-shop-patch.js`
Expected: writes the patch, prints a bundle count of roughly 20–30 and a sha256.

Then confirm the content is real, not empty shells:

```bash
node -e "const p=require('./patches/2026.08.16.012.json');const b=p.operations[0].value.bundles;console.log('bundles',b.length);console.log('with price',b.filter(x=>x.price).length);console.log('with items',b.filter(x=>x.items.length).length);console.log(JSON.stringify(b[0],null,2));"
```

Expected: every bundle has a price; most have at least one item. If any bundle has zero items, inspect before continuing — that is a parser gap, not acceptable output.

- [ ] **Step 3: Add the manifest entry**

Append to the `patches` array in `manifest.json`, using the sha256 printed in Step 2, and set `latestVersion` to `2026.08.16.012`:

```json
{
  "version": "2026.08.16.012",
  "fromVersion": "2026.08.16.011",
  "url": "patches/2026.08.16.012.json",
  "sha256": "<paste from build output>",
  "releasedAt": "<paste from the patch file>",
  "source": "snap.fan/bundles",
  "summary": "<paste the summary from the patch file>"
}
```

- [ ] **Step 4: Verify the manifest**

Run: `git add -A && node verify-manifest.js`
Expected: ALL CHECKS PASSED, 12 patches listed.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-shop-patch.js patches/2026.08.16.012.json manifest.json
git commit -m "Add shop bundle data via patch v012

Scrapes snap.fan/bundles into a dated SHOP snapshot. The script aborts
and names the bundle rather than emitting partial data, and refuses to
write an empty shop if the page layout changes."
```

---

### Task 3: Client-side shop status logic

The browser decides live / upcoming / ended from the snapshot. Kept as a pure function inside the HTML with extraction markers so it has one source of truth and still gets unit tests.

**Files:**
- Modify: `marvel-snap-deck-builder.html` (add function near the other helpers, after `esc` at line 670)
- Test: `scripts/lib/shop-status.test.js`

**Interfaces:**
- Consumes: bundle objects from Task 2.
- Produces:
  - `shopStatus(bundle, todayISO)` → `'live' | 'upcoming' | 'ended'`
  - `shopBuckets(shop, todayISO)` → `{live:[], upcoming:[], ended:[], stale:boolean, daysOld:number}`

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/shop-status.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant" && node --test`
Expected: FAIL — "shop status block markers not found".

- [ ] **Step 3: Add the marked block to the app**

In `marvel-snap-deck-builder.html`, immediately after the `esc` helper (line 670), insert:

```js
/* @testable:shop */
/* Bundle status is computed at render time from the snapshot's dates, so one
   snapshot stays correct for days. Dates are plain YYYY-MM-DD and compare
   correctly as strings, which sidesteps timezone drift entirely. */
function shopStatus(b, todayISO){
  if(!b||!b.from||!b.to) return 'ended';
  if(todayISO < b.from) return 'upcoming';
  if(todayISO > b.to) return 'ended';
  return 'live';
}
function shopBuckets(shop, todayISO){
  var out={live:[],upcoming:[],ended:[],stale:false,daysOld:0};
  if(!shop||!shop.bundles) return out;
  shop.bundles.forEach(function(b){ out[shopStatus(b,todayISO)].push(b); });
  out.live.sort(function(x,y){ return x.to<y.to?-1:x.to>y.to?1:0; });
  out.upcoming.sort(function(x,y){ return x.from<y.from?-1:x.from>y.from?1:0; });
  out.ended.sort(function(x,y){ return x.to<y.to?1:x.to>y.to?-1:0; });
  if(shop.snapshotAt){
    out.daysOld=Math.floor((Date.parse(todayISO+'T00:00:00Z')-Date.parse(shop.snapshotAt+'T00:00:00Z'))/86400000);
    out.stale=out.daysOld>10;
  }
  return out;
}
/* @end:shop */
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS — 8 tests, 0 fail.

- [ ] **Step 5: Sync the Desktop copy and commit**

```bash
cp marvel-snap-deck-builder.html "C:\Users\natta\Desktop\AI\Marvel Snap\marvel-snap-deck-builder.html"
git add marvel-snap-deck-builder.html scripts/lib/shop-status.test.js
git commit -m "Add client-side shop status bucketing

Status is derived from each bundle's date window at render time rather
than baked into the snapshot, so one scrape stays accurate for days.
Tests extract the functions from the app file so there is one copy."
```

---

### Task 4: Motion layer

**Files:**
- Modify: `marvel-snap-deck-builder.html` — CSS block (before line 262), `render()` (line 2329), `deckLibCard` (line 1909)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS classes `.viewin`, `.stagger > *`; helper `staggerIdx(i)` returning a `style` attribute string with the cap applied.

- [ ] **Step 1: Add motion tokens and keyframes**

In the `<style>` block, immediately **before** line 262's `prefers-reduced-motion` rule (so the guard still overrides everything), add:

```css
:root{
  --dur-fast:120ms; --dur:220ms; --dur-slow:420ms;
  --ease:cubic-bezier(.22,.61,.36,1);
  --ease-spring:cubic-bezier(.34,1.56,.64,1);
}
@keyframes viewIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes itemIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}

.viewin{animation:viewIn var(--dur) var(--ease) both}
.stagger>*{animation:itemIn var(--dur) var(--ease) both;animation-delay:calc(var(--i,0) * 28ms)}

.card{transition:transform var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease),box-shadow var(--dur-fast) var(--ease)}
.card:hover{transform:translateY(-2px);border-color:var(--line2)}
.btn,.pill,.card{transition:transform var(--dur-fast) var(--ease-spring),background var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease)}
.btn:active,.pill:active,.card:active{transform:scale(.97)}

.skel{background:linear-gradient(90deg,var(--panel) 25%,var(--panel2) 37%,var(--panel) 63%);
  background-size:200% 100%;animation:shimmer 1.4s linear infinite;border-radius:var(--r)}
```

- [ ] **Step 2: Animate the view on route change**

In `render()` (line 2329), replace the line `v.innerHTML=html;` with:

```js
  v.innerHTML=html;
  v.classList.remove('viewin');
  void v.offsetWidth;   /* restart the animation on every route change */
  v.classList.add('viewin');
```

- [ ] **Step 3: Add the capped stagger helper**

Next to the other helpers (after the `/* @end:shop */` block added in Task 3), add:

```js
/* Stagger is capped so a long list cannot queue an absurd delay: the deck
   library renders 77 cards, and an uncapped 28ms step would leave the last
   one waiting over two seconds while every one of them holds an animation. */
var STAGGER_CAP=12;
function staggerIdx(i){ return ' style="--i:'+(i<STAGGER_CAP?i:STAGGER_CAP)+'"'; }
```

- [ ] **Step 4: Apply the stagger to the deck library**

In `deckLibCard` (line 1909), change the signature to accept an index and emit the variable. Change:

```js
function deckLibCard(d){
```
to:
```js
function deckLibCard(d,i){
```

and change the opening of its returned markup from:

```js
  return '<div class="card">'+
```
to:
```js
  return '<div class="card"'+staggerIdx(i||0)+'>'+
```

Then in `renderDeckLib` (line 1928), find the `.map(deckLibCard)` or equivalent call and ensure the index is passed — `.map(function(d,i){return deckLibCard(d,i);})` — and add `stagger` to the grid container's class list.

- [ ] **Step 5: Verify motion in the browser, including reduced motion**

Serve and open the app:

```bash
cd "C:\Users\natta\Desktop\AI\Marvel Snap" && python -m http.server 8791
```

Open `http://localhost:8791/marvel-snap-deck-builder.html`, click between nav items, and confirm the view fades and rises, cards lift on hover, and buttons dent on press.

Then confirm the reduced-motion guard still wins — in the browser console:

```js
matchMedia('(prefers-reduced-motion: reduce)').matches
```
and with the OS setting on (or via devtools emulation), reload and confirm no animation plays at all.

- [ ] **Step 6: Measure frame rate on the deck library**

This is the constraint from the spec and must be a number, not an impression. With devtools Performance open, record while navigating to คลังเด็ค, and note the FPS during the entry animation.

Expected: sustained above 50fps. If below, reduce `STAGGER_CAP` and re-measure. Record the figure in the commit message.

- [ ] **Step 7: Sync and commit**

```bash
cp marvel-snap-deck-builder.html "C:\Users\natta\Desktop\AI\Marvel Snap\marvel-snap-deck-builder.html"
git add marvel-snap-deck-builder.html
git commit -m "Add motion layer across all views

View transitions, capped card stagger, hover lift, and press feedback,
built as plain CSS animations so the existing prefers-reduced-motion
guard at line 262 disables all of it. Stagger caps at 12 items; the deck
library holds 77 cards and an uncapped step would leave the last one
waiting seconds. Measured <N>fps on the deck library entry animation."
```

---

### Task 5: Highlight bar

**Files:**
- Modify: `marvel-snap-deck-builder.html` — helpers, CSS, and `V.dashboard` (line 1243)

**Interfaces:**
- Consumes: `staggerIdx` from Task 4.
- Produces: `highlightChips()` → array of `{icon, text, go}`; `highlightBar()` → HTML string.

- [ ] **Step 1: Add the chip derivation**

Everything is derived from data already present, so the bar cannot go stale on its own. Add near the other helpers:

```js
/* Derived from data the patch already carries — nothing new is stored, so
   this cannot drift out of sync with what it describes. */
function highlightChips(){
  var out=[];
  if(P.season) out.push({icon:'🎬',text:'ซีซั่นใหม่ — '+P.season,go:'meta'});
  var nCards=CARDS.filter(function(c){return c['new'];}).length;
  if(nCards) out.push({icon:'🃏',text:'การ์ดใหม่ '+nCards+' ใบ',go:'database'});
  var ref=(P.metaDate||'').match(/\d{4}-\d{2}-\d{2}/);
  var nBal=CARDS.filter(function(c){
    var h=c.hist&&c.hist[0]; if(!h||h[1]) return false;
    return !ref || Math.abs(Date.parse(h[0])-Date.parse(ref[0]))<=14*86400000;
  }).length;
  if(nBal&&P.ota) out.push({icon:'⚖️',text:P.ota+' — ปรับ '+nBal+' ใบ',go:'database'});
  if(P.upcoming&&P.upcoming.length) out.push({icon:'🔮',text:'กำลังจะมา '+P.upcoming.length+' ใบ',go:'meta'});
  return out;
}
```

Note: `P.metaDate` is Thai-formatted (`31 ส.ค. 2026`) and will not match the ISO regex, so `ref` is null and the 14-day filter is skipped — every balance change counts. That is the intended fallback; the guard exists for when a future patch carries an ISO date.

- [ ] **Step 2: Add the bar markup and dismissal**

```js
var HL_KEY='snapdb.highlight.dismissed.';
function highlightBar(){
  var chips=highlightChips();
  if(!chips.length) return '';
  if(load(HL_KEY+(P.dataVersion||'0'),false)) return '';
  return '<div class="hlbar stagger" id="hlbar">'+
    chips.map(function(c,i){
      return '<button class="hlchip" data-go="'+esc(c.go)+'"'+staggerIdx(i)+'>'+
        '<span class="hlic">'+c.icon+'</span>'+esc(c.text)+'</button>';
    }).join('')+
    '<button class="hlx" data-hldismiss="1" title="ซ่อนแถบนี้" aria-label="ซ่อนแถบอัปเดต">✕</button></div>';
}
```

Add CSS beside the other rules:

```css
.hlbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px;padding:10px 12px;
  border:1px solid var(--line2);border-radius:var(--r);background:linear-gradient(90deg,var(--panel),var(--panel2))}
.hlchip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;
  border:1px solid var(--line);background:rgba(0,0,0,.25);color:var(--ink);font-size:.82rem;cursor:pointer}
.hlchip:hover{border-color:var(--gold);color:var(--gold)}
.hlic{animation:pulse 2.4s var(--ease) infinite}
.hlx{margin-left:auto;background:none;border:0;color:var(--ink3);cursor:pointer;font-size:.9rem;padding:4px 6px}
.hlx:hover{color:var(--red)}
```

- [ ] **Step 3: Wire dismissal into the existing click delegation**

Find the delegated click handler that reads `data-go` (the same one handling `data-synccol` and `data-unsync`) and add `data-hldismiss` to its selector string, then add the branch alongside the others:

```js
if(d.hldismiss!==undefined){ save(HL_KEY+(P.dataVersion||'0'),true); render(); return; }
```

Dismissal is keyed to `dataVersion`, so the next patch brings the bar back — it is a convenience, not a permanent preference.

- [ ] **Step 4: Render it on the dashboard**

In `V.dashboard` (line 1243), insert `highlightBar()+` immediately after the opening `return` so the bar sits above the page title.

- [ ] **Step 5: Verify in the browser**

Reload `http://localhost:8791/marvel-snap-deck-builder.html` and confirm: chips appear for season / new cards / OTA / upcoming; clicking a chip navigates; ✕ hides the bar and it stays hidden across a reload; then in the console run `localStorage.removeItem('snapdb.highlight.dismissed.'+SNAPDATA.PATCH.dataVersion)` and reload to confirm it returns.

- [ ] **Step 6: Sync and commit**

```bash
cp marvel-snap-deck-builder.html "C:\Users\natta\Desktop\AI\Marvel Snap\marvel-snap-deck-builder.html"
git add marvel-snap-deck-builder.html
git commit -m "Add update highlight bar to the dashboard

Chips are derived from data the patch already carries — season, cards
flagged new, recent balance changes, upcoming cards — so the bar cannot
go stale independently of what it describes. Dismissal is keyed to
dataVersion, so a new patch brings it back."
```

---

### Task 6: Shop view

**Files:**
- Modify: `marvel-snap-deck-builder.html` — `NAV` (line 1205), new `V.shop`

**Interfaces:**
- Consumes: `shopBuckets` (Task 3), `staggerIdx` (Task 4), `SHOP` data (Task 2).
- Produces: route `shop`.

- [ ] **Step 1: Add the nav entry**

In the `NAV` array, insert after the `decklib` entry:

```js
['shop','🛒','ร้านค้า'],
```

- [ ] **Step 2: Expose SHOP alongside the other data roots**

`SHOP` is new, and old snapshots will not have it. At each of the five places that destructure `window.SNAPDATA` (lines 301, 487, 543, 566, 574 — they all read `CARDS=D.CARDS; LOCS=D.LOCATIONS; ...`), add `SHOP=D.SHOP||null;`, and declare `SHOP` in the same `var` statement as `CARDS` at line 301.

- [ ] **Step 3: Write the view**

Place this at **top level**, directly after `V.meta` ends (around line 1875) — not inside another function. `itemLine` reads the global `byName` map defined at line 302; note that `allArtists()` at line 2088 declares its own local `byName`, so code placed inside that function would silently read the wrong map.

```js
/* ---------- shop ---------- */
function fmtPrice(p){
  if(!p) return '—';
  return p.kind==='usd' ? '$'+Number(p.amount).toFixed(2) : Number(p.amount).toLocaleString()+' Gold';
}
function valueClass(pct){
  if(pct==null) return '';
  if(pct>=300) return 'vhot';
  if(pct>=150) return 'vgood';
  return 'vmeh';
}
function itemLine(it){
  var label;
  if(it.kind==='variant'){
    /* Variant art is not on any CDN we can hotlink (see the v008 migration),
       so show the base card's art and label it as a skin rather than showing
       a broken image or implying this is the base card. */
    var cc=byName[String(it.card||'').toLowerCase()];
    var thumb=cc&&cc.art?'<img class="rwthumb" loading="lazy" src="'+esc(cc.art)+'" alt="">':'';
    label=thumb+'<span>สกินการ์ด '+esc(it.card)+' <span class="tiny mono">('+esc(it.variantId)+')</span></span>';
  }
  else if(it.kind==='tokens')   label='Collector\'s Tokens ×'+it.qty.toLocaleString();
  else if(it.kind==='credits')  label='Credits ×'+it.qty.toLocaleString();
  else if(it.kind==='boosters') label='Boosters ×'+it.qty.toLocaleString();
  else if(it.kind==='gold')     label='Gold ×'+it.qty.toLocaleString();
  else label=esc(it.label);
  var gv=it.goldValue==null?'<span class="muted">ไม่ตีราคา</span>':(it.goldValue.toLocaleString()+' gold');
  return '<li><span class="rwlabel">'+label+'</span><span class="tiny mono">'+gv+'</span></li>';
}
function bundleCard(b,i){
  var vc=valueClass(b.valuePct);
  return '<div class="card"'+staggerIdx(i)+'>'+
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">'+
      '<h3 class="mt" style="margin:0">'+esc(b.name)+'</h3>'+
      (b.valuePct!=null?'<span class="vbadge '+vc+'">'+b.valuePct+'%</span>':'')+
    '</div>'+
    '<p class="tiny mono" style="margin:6px 0">'+esc(b.from)+' → '+esc(b.to)+' · '+esc(fmtPrice(b.price))+
      (b.goldValue!=null?' · มูลค่า ~'+b.goldValue.toLocaleString()+' gold':'')+'</p>'+
    (b.items&&b.items.length?'<details><summary class="tiny">ดูของที่ได้ ('+b.items.length+')</summary>'+
      '<ul class="rewards">'+b.items.map(itemLine).join('')+'</ul></details>':'')+
  '</div>';
}
V.shop=function(){
  if(!SHOP||!SHOP.bundles||!SHOP.bundles.length){
    return '<h1 class="vt">ร้านค้า</h1>'+
      '<div class="empty"><b>ยังไม่มีข้อมูลร้านค้า</b><p class="small muted">'+
      'ข้อมูลร้านค้ามากับ patch — ไปที่หน้าตั้งค่าแล้วกดอัปเดต patch ก่อนนะครับ</p></div>';
  }
  var today=new Date().toISOString().slice(0,10);
  var r=shopBuckets(SHOP,today);
  var head='<h1 class="vt">ร้านค้า</h1>'+
    '<p class="vsub">ข้อมูล ณ '+esc(SHOP.snapshotAt)+' จาก '+esc(SHOP.source)+
    ' — สถานะคำนวณจากวันที่ของแต่ละ bundle เทียบกับวันนี้</p>';
  if(r.stale) head+='<div class="card" style="border-color:var(--gold)"><p class="small" style="color:var(--gold)">'+
    '⚠️ ข้อมูลนี้เก่า '+r.daysOld+' วันแล้ว — bundle ที่ขึ้นว่า "ขายอยู่" อาจจบไปแล้ว '+
    'กดอัปเดต patch ที่หน้าตั้งค่าเพื่อดึงชุดใหม่</p></div>';
  function sec(title,list,emptyMsg){
    if(!list.length) return '<h2 class="st">'+title+'</h2><p class="small muted">'+emptyMsg+'</p>';
    return '<h2 class="st">'+title+' ('+list.length+')</h2>'+
      '<div class="grid g2 stagger">'+list.map(bundleCard).join('')+'</div>';
  }
  var ranOut = !r.live.length && !r.upcoming.length;
  return head+
    sec('ขายอยู่ตอนนี้',r.live, ranOut?'ข้อมูลชุดนี้หมดช่วงแล้ว — ไม่ได้แปลว่าไม่มีของขาย กดอัปเดต patch เพื่อดึงชุดใหม่':'ไม่มี bundle ที่ขายอยู่ในข้อมูลชุดนี้')+
    sec('กำลังจะเข้า',r.upcoming,'ไม่มีข้อมูล bundle ที่กำลังจะเข้าในชุดนี้')+
    (r.ended.length?'<details style="margin-top:16px"><summary class="small muted">จบไปแล้ว ('+r.ended.length+')</summary>'+
      '<div class="grid g2" style="margin-top:10px">'+r.ended.map(function(b,i){return bundleCard(b,i);}).join('')+'</div></details>':'');
};
```

Remove the stray `priceText` helper above — only `fmtPrice` is used. (It is listed here so the reviewer catches it; delete it rather than shipping dead code.)

Add CSS:

```css
.vbadge{font:600 .78rem/1 var(--mono);padding:4px 8px;border-radius:999px;border:1px solid var(--line)}
.vbadge.vhot{color:var(--grn);border-color:var(--grn)}
.vbadge.vgood{color:var(--gold);border-color:var(--gold)}
.vbadge.vmeh{color:var(--ink3)}
.rewards{list-style:none;margin:8px 0 0;padding:0}
.rewards li{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-top:1px solid var(--line);align-items:center}
.rwlabel{display:flex;align-items:center;gap:8px;min-width:0}
.rwthumb{width:28px;height:28px;object-fit:cover;border-radius:6px;flex:none}
```

- [ ] **Step 4: Apply the patch and verify the view in the browser**

Serve the app, go to ตั้งค่า → ⚡ อัปเดต Patch, confirm it reaches `2026.08.16.012`, then open ร้านค้า.

Confirm: the ข้อมูล ณ line shows the snapshot date; live bundles appear under ขายอยู่ตอนนี้ ordered by soonest to end; upcoming ones appear separately; expanding a bundle lists rewards with gold values, and any unpriced reward reads ไม่ตีราคา rather than 0.

Then force the stale path in the console and confirm the warning renders:

```js
SNAPDATA.SHOP.snapshotAt='2026-08-01'; render();
```

Reload afterwards to undo.

- [ ] **Step 5: Sync and commit**

```bash
cp marvel-snap-deck-builder.html "C:\Users\natta\Desktop\AI\Marvel Snap\marvel-snap-deck-builder.html"
git add marvel-snap-deck-builder.html
git commit -m "Add shop view

Sections bundles into live, upcoming, and ended from their date windows
against today. Shows the snapshot date always, warns past ten days, and
distinguishes 'this snapshot ran out of data' from 'nothing is on sale'."
```

---

### Task 7: Dashboard rebuild

**Files:**
- Modify: `marvel-snap-deck-builder.html` — `V.dashboard` (line 1243)

**Interfaces:**
- Consumes: `highlightBar` (Task 5), `staggerIdx` (Task 4).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Restructure the view**

Reorder `V.dashboard` to lead with what changed: `highlightBar()`, then the season card, then the stat tiles, then the top three meta decks, then the getting-started card. Keep every existing element and its data — this is a reordering and restyling pass, not a content rewrite. Add `stagger` to the stat-tile and meta-deck grid containers and pass an index into each child via `staggerIdx(i)`.

- [ ] **Step 2: Add the count-up on the stat tiles**

Numbers counting up on first paint is the one JS-driven animation in this work, so it must check reduced motion itself — the CSS guard cannot reach it:

```js
function countUp(el,to){
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=to;return;}
  var t0=null,dur=600;
  function step(ts){
    if(t0==null)t0=ts;
    var k=Math.min(1,(ts-t0)/dur);
    el.textContent=Math.round(to*(1-Math.pow(1-k,3)));
    if(k<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

Give each stat number `class="statnum" data-to="<value>"`, and in `render()` — after the existing `if(document.getElementById('cards'))` block — add:

```js
  Array.prototype.forEach.call(v.querySelectorAll('.statnum'),function(el){
    countUp(el,Number(el.getAttribute('data-to')||0));
  });
```

- [ ] **Step 2b: Verify counts are still correct, not just animated**

The numbers must end on the true values. In the console after the dashboard renders:

```js
[...document.querySelectorAll('.statnum')].map(e=>[e.textContent,e.dataset.to])
```
Expected: each pair matches. A count-up that lands on the wrong number is worse than no animation.

- [ ] **Step 3: Verify and commit**

Reload, confirm the dashboard leads with the highlight bar, tiles stagger in and count up, and that with reduced motion enabled the numbers appear immediately at their final values with no motion.

```bash
cp marvel-snap-deck-builder.html "C:\Users\natta\Desktop\AI\Marvel Snap\marvel-snap-deck-builder.html"
git add marvel-snap-deck-builder.html
git commit -m "Rebuild dashboard around what changed

Leads with the highlight bar and season, then staggered stat tiles that
count up, then the top meta decks. The count-up checks reduced motion
itself since it is JS-driven and the CSS guard cannot reach it."
```

---

### Task 8: Current meta rebuild

**Files:**
- Modify: `marvel-snap-deck-builder.html` — `V.meta` (line 1856)

**Interfaces:**
- Consumes: `staggerIdx` (Task 4).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Group the tier table into sections**

Replace the single flat table with one section per tier, in order Trending → Tier 1 → Tier 2 → Tier 3 → มือใหม่, skipping tiers with no decks. Within a section render deck name, cube, and win rate as a card rather than a table row, using the existing tier colour map:

```js
{Trending:'var(--trend)','Tier 1':'var(--t1)','Tier 2':'var(--t2)','Tier 3':'var(--t3)','มือใหม่':'var(--grn)'}
```

Add `stagger` to each section's grid and pass `staggerIdx(i)` per card.

- [ ] **Step 2: Turn the upcoming list into a card grid**

Render `P.upcoming` as cards in a `grid g2 stagger` container. Keep the existing caption verbatim — it is accurate as written:

`ค่าใช้จ่าย/พลังและข้อความความสามารถดึงจากฐานข้อมูลการ์ดทางการ — ยังไม่ใส่ในฐานข้อมูลหลักจนกว่าจะเปิดให้เล่นจริง และค่าพลังอาจถูกปรับก่อนปล่อยได้`

- [ ] **Step 3: Verify no deck is lost in the regrouping**

The flat table showed all 77 decks; the grouped sections must too. In the console:

```js
go('meta');
document.querySelectorAll('#view .grid .card').length
```
Expected: 77 deck cards plus the upcoming cards. If the total is short, a tier is being dropped.

- [ ] **Step 4: Sync and commit**

```bash
cp marvel-snap-deck-builder.html "C:\Users\natta\Desktop\AI\Marvel Snap\marvel-snap-deck-builder.html"
git add marvel-snap-deck-builder.html
git commit -m "Rebuild current meta view

Groups the flat tier table into per-tier sections of cards and renders
upcoming cards as a grid. Verified all 77 decks survive the regrouping."
```

---

### Task 9: Full verification and ship

**Files:**
- Modify: none expected; fix whatever the checks surface.

- [ ] **Step 1: Run every automated check**

```bash
cd "C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant"
node --test
node verify-manifest.js
```
Expected: all tests pass; ALL CHECKS PASSED with 12 patches.

- [ ] **Step 2: Confirm the two app copies are identical**

```bash
diff -q marvel-snap-deck-builder.html "C:\Users\natta\Desktop\AI\Marvel Snap\marvel-snap-deck-builder.html" && echo IN SYNC
```
Expected: `IN SYNC`. The deployed page is the repo copy; a drift here ships a different app than the one that was tested.

- [ ] **Step 3: Clean-state end-to-end run**

Serve the app, clear storage, reload, and apply patches from scratch:

```js
localStorage.clear();
(await indexedDB.databases()).forEach(d=>indexedDB.deleteDatabase(d.name));
```

Reload, ตั้งค่า → อัปเดต Patch, expect `อัปเดตสำเร็จ! เวอร์ชันปัจจุบัน: 2026.08.16.012`. Then visit every one of the 16 routes and confirm none throws — `render()` catches errors into a visible error panel, so watch for that panel as well as the console.

- [ ] **Step 4: Commit any fixes, then hand off for push**

```bash
git add -A && git commit -m "Fix issues found in full verification pass"
```

Tell the user the commits are ready and to push via GitHub Desktop. **Do not run `git push`.**

- [ ] **Step 5: Verify on the live site after the user confirms the push**

```bash
node verify-manifest.js --remote
```
Expected: every patch, including v012, matches its published bytes.

Then load `https://bennett-workspace.github.io/marvelsnap-ai-assistant/marvel-snap-deck-builder.html`, clear storage, and apply patches. Expected: reaches `2026.08.16.012` and the shop view renders. Local success is not evidence about production — that assumption is exactly what let the v009 hash bug reach every user.

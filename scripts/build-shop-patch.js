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

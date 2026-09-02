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

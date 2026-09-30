// Which game data is stale, per docs/skills/CONVENTIONS.md §4. Dates in the
// app data are Thai ("20 ก.ย. 2026"); anything unparseable is `unknown`,
// never guessed.

const fs = require('fs');
const path = require('path');

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_RE = [...MONTHS].sort((a, b) => b.length - a.length).map(m => m.replace(/\./g, '\\.')).join('|');
const DATE_RE = new RegExp(`(\\d{1,2})\\s*(${MONTH_RE})\\s*(\\d{4})`, 'g');

const META_MAX_DAYS = 14;
const COLLECTION_MAX_DAYS = 3;
const DAY = 86400000;

const DEFAULT_COLLECTION_FILE = path.join(process.env.LOCALAPPDATA || '', '..', 'LocalLow',
  'Second Dinner', 'SNAP', 'Standalone', 'States', 'nvprod', 'CollectionState.json');

function parseThaiDate(s) {
  const matches = [...String(s || '').matchAll(DATE_RE)];
  if (!matches.length) return null;
  const [, d, mon, y] = matches[matches.length - 1];
  const year = Number(y) >= 2400 ? Number(y) - 543 : Number(y);
  const month = MONTHS.indexOf(mon) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const utcDay = date => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
const ageDays = (iso, now) => Math.floor((utcDay(now) - Date.parse(iso + 'T00:00:00Z')) / DAY);

function freshness(D, { now, collectionFile, latestPatch } = {}) {
  const P = D.PATCH || {};
  const rows = [];

  const meta = parseThaiDate(P.metaDate);
  if (!meta) rows.push({ item: 'meta', status: 'unknown', detail: `metaDate not parseable: ${P.metaDate}` });
  else {
    const age = ageDays(meta, now);
    rows.push({ item: 'meta', status: age > META_MAX_DAYS ? 'stale' : 'fresh', detail: `meta from ${meta}, ${age} days old (stale after ${META_MAX_DAYS})` });
  }

  const file = collectionFile === undefined ? DEFAULT_COLLECTION_FILE : collectionFile;
  if (!file || !fs.existsSync(file)) rows.push({ item: 'collection', status: 'unknown', detail: 'game collection file not found' });
  else {
    const mtime = fs.statSync(file).mtime;
    const age = Math.floor((utcDay(now) - utcDay(mtime)) / DAY);
    rows.push({ item: 'collection', status: age > COLLECTION_MAX_DAYS ? 'stale' : 'fresh', detail: `game file modified ${mtime.toISOString()}, ${age} days old (stale after ${COLLECTION_MAX_DAYS})` });
  }

  for (const [name, info] of P.upcoming || []) {
    const date = parseThaiDate(info);
    if (!date) rows.push({ item: `upcoming:${name}`, status: 'unknown', detail: 'no release date' });
    else {
      const due = ageDays(date, now) >= 0;
      rows.push({ item: `upcoming:${name}`, status: due ? 'due' : 'fresh', detail: due ? `release date ${date} has passed — verify release (PATCH_UPDATE_PLAYBOOK §3)` : `releases ${date}` });
    }
  }

  if (latestPatch && latestPatch.releasedAt) {
    const age = Math.floor((utcDay(now) - utcDay(new Date(latestPatch.releasedAt))) / DAY);
    rows.push({ item: 'latestPatch', status: 'fresh', detail: `${latestPatch.version} released ${latestPatch.releasedAt}, ${age} days ago` });
  } else rows.push({ item: 'latestPatch', status: 'unknown', detail: 'no patch information given' });

  return rows;
}

module.exports = { parseThaiDate, freshness, DEFAULT_COLLECTION_FILE };

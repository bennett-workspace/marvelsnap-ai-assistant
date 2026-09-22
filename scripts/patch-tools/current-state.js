'use strict';
/*
 * Reconstructs the app's true current data state: the baseline SNAPDATA
 * embedded in marvel-snap-deck-builder.html, with every patch in patches/
 * applied on top, in filename order.
 *
 * This is the ONLY reliable way to inspect "what the app currently shows"
 * for anything added after the baseline (e.g. Death Fractured Frontier,
 * added via a v006 "add" op — it does not exist in the raw baseline at
 * all, so reading the HTML's embedded SNAPDATA directly gives the wrong
 * answer for CARDS.length, deck contents, upcoming lists, etc.)
 *
 * Usage from another script:
 *   const { loadCurrent, applyOps } = require('./current-state.js');
 *   const { D, versions } = loadCurrent();
 *
 * Usage standalone (prints a summary):
 *   node scripts/patch-tools/current-state.js
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const APP_HTML = path.join(REPO, 'marvel-snap-deck-builder.html');
const PATCH_DIR = path.join(REPO, 'patches');

function extractBaselineSnapdata(html) {
  const startMarker = 'window.SNAPDATA=';
  const start = html.indexOf(startMarker) + startMarker.length;
  let depth = 0, inStr = false, escFlag = false, end = -1;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (escFlag) { escFlag = false; }
      else if (ch === '\\') { escFlag = true; }
      else if (ch === '"') { inStr = false; }
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') { depth++; }
    else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return JSON.parse(html.slice(start, end));
}

function applyOps(doc, operations) {
  operations.forEach(o => {
    const parts = o.path.split('/').slice(1).map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    let target = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      let key = parts[i];
      if (Array.isArray(target)) key = key === '-' ? target.length : parseInt(key, 10);
      target = target[key];
    }
    let lastKey = parts[parts.length - 1];
    if (Array.isArray(target)) lastKey = lastKey === '-' ? target.length : parseInt(lastKey, 10);
    if (o.op === 'add') {
      if (Array.isArray(target)) target.splice(lastKey, 0, o.value);
      else target[lastKey] = o.value;
    } else if (o.op === 'replace') {
      target[lastKey] = o.value;
    } else if (o.op === 'remove') {
      if (Array.isArray(target)) target.splice(lastKey, 1);
      else delete target[lastKey];
    } else {
      throw new Error('unsupported op: ' + o.op);
    }
  });
}

function loadCurrent() {
  const html = fs.readFileSync(APP_HTML, 'utf8');
  const D = extractBaselineSnapdata(html);
  const versions = fs.readdirSync(PATCH_DIR).filter(f => f.endsWith('.json')).sort();
  versions.forEach(v => {
    const p = JSON.parse(fs.readFileSync(path.join(PATCH_DIR, v), 'utf8'));
    applyOps(D, p.operations);
  });
  return { D, versions };
}

module.exports = { loadCurrent, applyOps, extractBaselineSnapdata };

if (require.main === module) {
  const { D, versions } = loadCurrent();
  console.log('Applied', versions.length, 'patches, latest:', versions[versions.length - 1]);
  console.log('CARDS:', D.CARDS.length, '| LOCATIONS:', D.LOCATIONS.length, '| META decks:', D.META.length);
  console.log('SHOP:', D.SHOP ? D.SHOP.bundles.length + ' bundles, snapshot ' + D.SHOP.snapshotAt : 'none');
  console.log('season:', D.PATCH.season);
  console.log('ota:', D.PATCH.ota);
  console.log('metaDate:', D.PATCH.metaDate);
  console.log('upcoming:', D.PATCH.upcoming.map(u => u[0]));
  const newCards = D.CARDS.filter(c => c['new']).map(c => c.n);
  console.log('cards flagged new (' + newCards.length + '):', newCards);
}

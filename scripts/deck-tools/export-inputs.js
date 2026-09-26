'use strict';
/*
 * Writes the ground-truth input files every deck-building agent reads.
 * Agents reason about strategy; this script owns the facts (card stats,
 * ownership, meta evidence) so no agent has to recall or guess them.
 *
 * Usage: node scripts/deck-tools/export-inputs.js <runDir> [collectionStatePath]
 *
 * Ownership comes from the game's own CollectionState.json (Steam PC
 * client). Cards are the app's current state: baseline + every patch.
 */
const fs = require('fs');
const path = require('path');
const { loadCurrent } = require('../patch-tools/current-state.js');

const runDir = process.argv[2];
if (!runDir) { console.error('usage: export-inputs.js <runDir> [collectionStatePath]'); process.exit(1); }
fs.mkdirSync(runDir, { recursive: true });

const home = process.env.USERPROFILE || process.env.HOME;
const collectionPath = process.argv[3] ||
  path.join(home, 'AppData', 'LocalLow', 'Second Dinner', 'SNAP', 'Standalone', 'States', 'nvprod', 'CollectionState.json');

const { D, versions } = loadCurrent();
const byId = new Map(D.CARDS.map(c => [c.id, c]));

let raw = fs.readFileSync(collectionPath, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // the game writes a BOM
const col = JSON.parse(raw);
const ownedIds = new Set(col.ServerState.Cards.map(c => c.CardDefId));
const unknownIds = [...ownedIds].filter(id => !byId.has(id));
const mtime = fs.statSync(collectionPath).mtime.toISOString();

const recentCutoff = Date.now() - 45 * 86400000;
const cards = D.CARDS.map(c => {
  const h = c.hist && c.hist[0];
  const change = h && !h[1] && Date.parse(h[0]) >= recentCutoff
    ? { date: h[0], cost: h[2], power: h[3] } : null;
  return {
    id: c.id, name: c.n, cost: c.c, power: c.p, ability: c.a || '',
    series: c.s, tags: c.t || [], owned: ownedIds.has(c.id),
    isNew: !!c['new'], recentChange: change
  };
}).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

const byName = new Map(cards.map(c => [c.name, c]));
const split = names => ({
  owned: names.filter(n => byName.get(n) && byName.get(n).owned),
  missing: names.filter(n => !byName.get(n) || !byName.get(n).owned)
});

const metaDecks = D.META.map(d => {
  const s = split(d.cards);
  return {
    id: d.id, name: d.name, tier: d.tier, cube: d.cube, winRate: d.wr,
    archetype: d.arch, note: d.note, cards: d.cards,
    ownedCount: s.owned.length, missing: s.missing
  };
}).sort((a, b) => a.missing.length - b.missing.length);

const archetypes = D.ARCHETYPES.map(a => ({
  id: a.id, name: a.name, nameTh: a.nameTh, tier: a.tier, beginner: a.beginner,
  desc: a.desc, win: a.win,
  core: split(a.core || []), flex: split(a.flex || [])
}));

const missingBySeries = {};
cards.filter(c => !c.owned).forEach(c => { (missingBySeries[c.series] = missingBySeries[c.series] || []).push(c.name); });

const collection = {
  source: collectionPath, fileModified: mtime,
  ownedCount: cards.filter(c => c.owned).length,
  missingCount: cards.filter(c => !c.owned).length,
  totalCards: cards.length,
  collectionScore: col.ServerState.CollectionScore ? col.ServerState.CollectionScore.Amount : null,
  ownedIdsNotInAppData: unknownIds,
  owned: cards.filter(c => c.owned).map(c => c.name),
  missingBySeries
};

const context = {
  generatedAt: new Date().toISOString(),
  appDataVersion: D.PATCH.dataVersion, patchesApplied: versions.length,
  season: D.PATCH.season, ota: D.PATCH.ota, metaDate: D.PATCH.metaDate,
  upcomingNotYetReleased: D.PATCH.upcoming.map(u => u[0]),
  deckRules: {
    size: 12,
    duplicates: 'not allowed — one copy of each card (the app builder enforces this with a per-id seen guard)',
    source: 'marvel-snap-deck-builder.html: deck builder add() guard and recommend scoring both require exactly 12 unique cards'
  },
  deckCode: {
    format: 'base64 of UTF-8 JSON {"Name": string<=40 chars, "Cards": [{"CardDefId": id}, ...]}',
    source: 'marvel-snap-deck-builder.html deckCode()/parseDeckCode(); the app\'s นำเข้าเด็ค box and the game both accept it'
  },
  knowledgeWarning: 'Many cards (2025-2026) postdate model training. Card ability text and cost/power in cards.json are authoritative and current (post-OTA). Never rely on remembered stats.'
};

const write = (f, o) => fs.writeFileSync(path.join(runDir, f), JSON.stringify(o, null, 2), 'utf8');
write('cards.json', cards);
write('collection.json', collection);
write('meta-decks.json', metaDecks);
write('archetypes.json', archetypes);
write('matchups.json', D.MATCH);
write('context.json', context);

console.log('run dir:', runDir);
console.log('cards:', cards.length, '| owned:', collection.ownedCount, '| missing:', collection.missingCount);
console.log('collection file modified:', mtime);
console.log('meta decks:', metaDecks.length, '| fully owned meta decks:', metaDecks.filter(d => !d.missing.length).length);
if (unknownIds.length) console.warn('WARNING owned ids missing from app data (app needs a patch):', unknownIds);

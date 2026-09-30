// Game data at any version: the HTML baseline plus patches replayed in
// manifest order. Nothing is stored; every call rebuilds from the files.

const fs = require('fs');
const path = require('path');
const { extractBaselineSnapdata, applyOps } = require('../patch-tools/current-state.js');

const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
const BASELINE_VERSION = '2026.08.16.000';

let baselineCache = null;

function loadBaseline() {
  if (!baselineCache) {
    const html = fs.readFileSync(path.join(ROOT, 'marvel-snap-deck-builder.html'), 'utf8');
    baselineCache = extractBaselineSnapdata(html);
  }
  return structuredClone(baselineCache);
}

function readPatches() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  return manifest.patches.map(entry => {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT, entry.url), 'utf8'));
    return {
      version: p.version, fromVersion: p.fromVersion, releasedAt: p.releasedAt || null,
      source: p.source || null, summary: p.summary || null, file: entry.url, operations: p.operations,
    };
  });
}

function listVersions() {
  const baseline = { version: BASELINE_VERSION, fromVersion: null, releasedAt: null, source: 'baseline (HTML)', summary: null, file: null };
  return [baseline, ...readPatches().map(({ operations, ...rest }) => rest)];
}

function resolveVersion(v, versions = listVersions().map(e => e.version)) {
  const s = String(v);
  const hit = versions.find(ver => ver === s || ver.endsWith('.' + s.padStart(3, '0')));
  if (!hit || !/^\d+$|^\d{4}\.\d{2}\.\d{2}\.\d{3}$/.test(s)) throw new Error('unknown version: ' + v);
  return hit;
}

function loadAt(v) {
  const target = resolveVersion(v);
  const D = loadBaseline();
  if (target === BASELINE_VERSION) return D;
  for (const p of readPatches()) {
    applyOps(D, p.operations);
    if (p.version === target) break;
  }
  return D;
}

// Patch ops address arrays by index, and a remove shifts every later index,
// so an op's entity must be read from the state *before* the op applies.
const ARRAY_ROOTS = { CARDS: 'card', LOCATIONS: 'location', META: 'meta', ARCHETYPES: 'archetype' };

function entityKeyFor(D, op) {
  const segs = op.path.split('/').slice(1).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  const [root, second] = segs;
  const rest = n => (segs.length > n ? segs.slice(n).join('/') : null);

  if (ARRAY_ROOTS[root]) {
    if (segs.length === 1) return { key: root.toLowerCase(), field: null }; // whole collection replaced
    const whole = segs.length === 2;
    let id;
    if (second === '-' || (op.op === 'add' && whole)) id = op.value && op.value.id;
    else id = (D[root] && D[root][Number(second)] || {}).id || (whole && op.value && op.value.id);
    if (!id) return { key: 'unresolved', field: op.path };
    return { key: `${ARRAY_ROOTS[root]}:${id}`, field: rest(2) };
  }
  if (root === 'PATCH' || root === 'MATCH') {
    const prefix = root.toLowerCase();
    return second === undefined ? { key: prefix, field: null } : { key: `${prefix}:${second}`, field: rest(2) };
  }
  return { key: root.toLowerCase(), field: rest(1) };
}

function buildProvenance(baseline, patches) {
  const D = structuredClone(baseline);
  const prov = new Map();
  for (const p of patches) {
    for (const op of p.operations) {
      const { key, field } = entityKeyFor(D, op);
      if (!prov.has(key)) prov.set(key, []);
      prov.get(key).push({ version: p.version, op: op.op, field, source: p.source, releasedAt: p.releasedAt });
      applyOps(D, [op]);
    }
  }
  return prov;
}

function provenance() {
  return buildProvenance(loadBaseline(), readPatches());
}

module.exports = {
  BASELINE_VERSION, readPatches, listVersions, resolveVersion, loadBaseline, loadAt,
  entityKeyFor, buildProvenance, provenance,
};

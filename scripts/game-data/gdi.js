// gdi — game data intelligence CLI.
//   versions | card <q> | at <version> card <q> | diff <vA> <vB> | freshness   [--json]

const { listVersions, resolveVersion, loadAt, provenance } = require('./history.js');
const { diffStates } = require('./diff.js');
const { freshness } = require('./freshness.js');

const USAGE = 'usage: gdi.js versions | card <query> | at <version> card <query> | diff <vA> <vB> | freshness   [--json]';

function findCard(cards, query) {
  const q = String(query).toLowerCase();
  const exact = cards.find(c => c.id === query) || cards.find(c => c.n.toLowerCase() === q);
  if (exact) return { card: exact };
  const hits = cards.filter(c => c.n.toLowerCase().includes(q));
  return hits.length === 1 ? { card: hits[0] } : { candidates: hits.map(c => c.n) };
}

function cardLines(card, prov) {
  const lines = [`${card.n} (${card.id}) ${card.c}/${card.p} · ${card.s}`, card.a, 'hist:'];
  for (const h of card.hist || []) lines.push(`  ${h.join(' | ')}`);
  if (prov) {
    lines.push('provenance:');
    for (const r of prov.get(`card:${card.id}`) || []) lines.push(`  ${r.version} ${r.op} ${r.field ?? '-'} ${r.source}`);
  }
  return lines;
}

function diffLines(d) {
  const lines = [];
  for (const [kind, key] of [['card', 'cards'], ['location', 'locations'], ['meta', 'meta'], ['archetype', 'archetypes']]) {
    d[key].added.forEach(id => lines.push(`+ ${kind} ${id}`));
    d[key].removed.forEach(id => lines.push(`- ${kind} ${id}`));
    for (const c of d[key].changed) for (const f of c.fields) {
      const show = v => (typeof v === 'object' ? '[…]' : JSON.stringify(v));
      lines.push(`~ ${kind} ${c.id} ${f.field}: ${show(f.before)} -> ${show(f.after)}`);
    }
  }
  d.patch.forEach(f => lines.push(`~ PATCH ${f.field}`));
  Object.entries(d.other).filter(([, v]) => v).forEach(([k]) => lines.push(`~ ${k}`));
  return lines.length ? lines : ['no differences'];
}

function lookup(D, query, out, json, prov, version) {
  const r = findCard(D.CARDS, query);
  if (r.card) {
    if (json) out(JSON.stringify({ card: r.card, provenance: prov ? prov.get(`card:${r.card.id}`) || [] : undefined }, null, 2));
    else cardLines(r.card, prov).forEach(l => out(l));
    return 0;
  }
  if (r.candidates.length) out(`ambiguous "${query}": ${r.candidates.join(', ')}`);
  else out(version ? `"${query}" not present at ${version}` : `no card matches "${query}"`);
  return 1;
}

function main(argv, out = console.log) {
  const json = argv.includes('--json');
  const args = argv.filter(a => a !== '--json');
  try {
    switch (args[0]) {
      case 'versions': {
        const v = listVersions();
        if (json) out(JSON.stringify(v, null, 2));
        else v.forEach(e => out(`${e.version}  ${e.releasedAt || '-'}  ${(e.source || '').slice(0, 70)}`));
        return 0;
      }
      case 'card':
        if (!args[1]) break;
        return lookup(loadAt(listVersions().at(-1).version), args.slice(1).join(' '), out, json, provenance(), null);
      case 'at': {
        if (args[2] !== 'card' || !args[3]) break;
        const version = resolveVersion(args[1]);
        return lookup(loadAt(version), args.slice(3).join(' '), out, json, null, version);
      }
      case 'diff': {
        if (!args[1] || !args[2]) break;
        const d = diffStates(loadAt(resolveVersion(args[1])), loadAt(resolveVersion(args[2])));
        if (json) out(JSON.stringify(d, null, 2));
        else diffLines(d).forEach(l => out(l));
        return 0;
      }
      case 'freshness': {
        const versions = listVersions();
        const latest = versions.at(-1);
        const rows = freshness(loadAt(latest.version), { now: new Date(), latestPatch: latest });
        if (json) out(JSON.stringify(rows, null, 2));
        else rows.forEach(r => out(`${r.status.padEnd(7)} ${r.item} — ${r.detail}`));
        return 0;
      }
    }
  } catch (e) {
    if (/^unknown version/.test(e.message)) { out(e.message); return 2; }
    throw e;
  }
  out(USAGE);
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { findCard, main };

'use strict';
/*
 * Deterministic half of the Deck Validator: the rules no agent is allowed
 * to judge by eye. Synergy, win condition, and playability are the
 * validator agent's job; card count, uniqueness, real card names, and
 * owned/missing truth are this script's.
 *
 * Usage: node scripts/deck-tools/validate-decks.js <runDir> <decksFile>
 *   reads  <runDir>/cards.json and <runDir>/<decksFile>
 *   writes <runDir>/<decksFile minus .json>.checked.json
 *   exit 1 if any deck fails a hard rule
 *
 * Deck shape (from the Deck Builder agent):
 *   { "id", "category": "owned" | "upgrade", "name", "cards": [12 names],
 *     "roles": { "<card name>": "core|enabler|payoff|support|interaction|finisher" },
 *     "missing": [names]   // upgrade decks only: must equal the true missing set
 *   }
 */
const fs = require('fs');
const path = require('path');

const [runDir, decksFile] = process.argv.slice(2);
if (!runDir || !decksFile) { console.error('usage: validate-decks.js <runDir> <decksFile>'); process.exit(1); }

const cards = JSON.parse(fs.readFileSync(path.join(runDir, 'cards.json'), 'utf8'));
const byName = new Map(cards.map(c => [c.name, c]));
const lower = new Map(cards.map(c => [c.name.toLowerCase(), c.name]));
const input = JSON.parse(fs.readFileSync(path.join(runDir, decksFile), 'utf8'));
const decks = Array.isArray(input) ? input : input.decks;
const ROLES = new Set(['core', 'enabler', 'payoff', 'support', 'interaction', 'finisher']);

function deckCode(name, cardObjs) {
  const obj = { Name: String(name || 'Deck').slice(0, 40), Cards: cardObjs.map(c => ({ CardDefId: c.id })) };
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
}

let failed = 0;
const out = decks.map(d => {
  const problems = [];
  const names = d.cards || [];
  if (names.length !== 12) problems.push('has ' + names.length + ' cards, needs exactly 12');
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) problems.push('duplicate cards: ' + [...new Set(dupes)].join(', '));
  const unknown = names.filter(n => !byName.has(n));
  unknown.forEach(n => {
    const hint = lower.get(String(n).toLowerCase());
    problems.push('unknown card "' + n + '"' + (hint ? ' (did you mean "' + hint + '"?)' : ''));
  });
  const objs = names.filter(n => byName.has(n)).map(n => byName.get(n));
  const trueMissing = objs.filter(c => !c.owned).map(c => c.name);

  if (d.category === 'owned') {
    if (trueMissing.length) problems.push('owned deck contains cards the user does NOT own: ' + trueMissing.join(', '));
  } else if (d.category === 'upgrade') {
    if (!trueMissing.length) problems.push('upgrade deck has no missing cards — it belongs in category "owned"');
    const claimed = new Set(d.missing || []);
    const notClaimed = trueMissing.filter(n => !claimed.has(n));
    const falselyClaimed = [...claimed].filter(n => !trueMissing.includes(n));
    if (notClaimed.length) problems.push('missing cards not declared: ' + notClaimed.join(', '));
    if (falselyClaimed.length) problems.push('declared missing but actually owned or not in deck: ' + falselyClaimed.join(', '));
  } else {
    problems.push('category must be "owned" or "upgrade", got ' + JSON.stringify(d.category));
  }

  const roles = d.roles || {};
  const noRole = names.filter(n => !roles[n]);
  if (noRole.length) problems.push('cards with no stated role: ' + noRole.join(', '));
  const badRole = names.filter(n => roles[n] && !ROLES.has(roles[n]));
  if (badRole.length) problems.push('invalid role for: ' + badRole.map(n => n + '=' + roles[n]).join(', '));

  const curve = [0, 0, 0, 0, 0, 0, 0];
  objs.forEach(c => { curve[Math.min(6, Math.max(0, c.cost))]++; });
  const ok = problems.length === 0;
  if (!ok) failed++;
  return Object.assign({}, d, {
    hardRules: ok ? 'PASS' : 'REJECT',
    problems,
    computed: {
      missing: trueMissing,
      curve: { '0': curve[0], '1': curve[1], '2': curve[2], '3': curve[3], '4': curve[4], '5': curve[5], '6+': curve[6] },
      avgCost: objs.length ? +(objs.reduce((s, c) => s + c.cost, 0) / objs.length).toFixed(2) : null,
      deckCode: ok ? deckCode(d.name, objs) : null
    }
  });
});

const outFile = path.join(runDir, decksFile.replace(/\.json$/, '') + '.checked.json');
fs.writeFileSync(outFile, JSON.stringify({ decks: out }, null, 2), 'utf8');
out.forEach(d => console.log((d.hardRules === 'PASS' ? '  PASS   ' : '  REJECT ') + d.id + ' ' + d.name +
  (d.problems.length ? '\n           - ' + d.problems.join('\n           - ') : '')));
console.log('\n' + (out.length - failed) + '/' + out.length + ' decks pass hard rules -> ' + outFile);
process.exit(failed ? 1 : 0);

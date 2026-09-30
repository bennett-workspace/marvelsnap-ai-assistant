// Structural difference between two SNAPDATA states. Reports what changed,
// never what it means — classifying buffs, nerfs and releases is the job of
// game-update-intelligence.

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function diffCollection(before = [], after = []) {
  const byId = new Map(before.map(e => [e.id, e]));
  const afterIds = new Set(after.map(e => e.id));
  const added = [], changed = [];
  for (const e of after) {
    const old = byId.get(e.id);
    if (!old) { added.push(e.id); continue; }
    const keys = [...new Set([...Object.keys(old), ...Object.keys(e)])].sort();
    const fields = keys.filter(k => !same(old[k], e[k])).map(k => ({ field: k, before: old[k], after: e[k] }));
    if (fields.length) changed.push({ id: e.id, fields });
  }
  const removed = before.filter(e => !afterIds.has(e.id)).map(e => e.id);
  return { added, removed, changed };
}

function diffStates(A, B) {
  const pa = A.PATCH || {}, pb = B.PATCH || {};
  const patch = [...new Set([...Object.keys(pa), ...Object.keys(pb)])]
    .filter(k => !same(pa[k], pb[k]))
    .map(k => ({ field: k, before: pa[k], after: pb[k] }));
  const other = {};
  for (const k of ['MATCH', 'SHOP', 'EXTRATAGS', 'BUILD']) other[k] = !same(A[k], B[k]);
  return {
    cards: diffCollection(A.CARDS, B.CARDS),
    locations: diffCollection(A.LOCATIONS, B.LOCATIONS),
    meta: diffCollection(A.META, B.META),
    archetypes: diffCollection(A.ARCHETYPES, B.ARCHETYPES),
    patch,
    other,
  };
}

module.exports = { diffStates };

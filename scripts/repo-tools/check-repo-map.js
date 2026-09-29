// Checks .claude/skills/repository-knowledge/repo-map.md against the code.
// Structural facts and anchors must match (exit 1 otherwise); counts that
// change with every data patch are printed for information only.

function extractFacts({ html, files, current }) {
  const routes = [...new Set([...html.matchAll(/V\.(\w+)\s*=\s*function/g)].map(m => m[1]))].sort();

  const storageKeys = {};
  const k = html.match(/var K=\{([^}]*)\}/);
  if (k) for (const m of k[1].matchAll(/(\w+)\s*:\s*'([^']*)'/g)) storageKeys[m[1]] = m[2];

  const scripts = files
    .filter(f => /^scripts\/.*\.js$/.test(f) || f === 'verify-manifest.js')
    .sort();

  return { routes, snapdataKeys: Object.keys(current).sort(), storageKeys, scripts };
}

function parseFactsBlock(md) {
  const blocks = [...md.matchAll(/^```json repo-facts\r?\n([\s\S]*?)^```/gm)];
  if (blocks.length === 0) throw new Error('repo-facts block not found');
  if (blocks.length > 1) throw new Error('multiple repo-facts blocks');
  return JSON.parse(blocks[0][1]);
}

function diffList(expected, actual) {
  const added = actual.filter(x => !expected.includes(x));
  const removed = expected.filter(x => !actual.includes(x));
  const parts = [];
  if (added.length) parts.push('added: ' + added.join(', '));
  if (removed.length) parts.push('removed: ' + removed.join(', '));
  return parts.join('; ');
}

function diffMap(expected, actual) {
  const parts = [];
  for (const key of Object.keys(actual)) {
    if (!(key in expected)) parts.push(`added: ${key}`);
    else if (expected[key] !== actual[key]) parts.push(`${key}: "${expected[key]}" -> "${actual[key]}"`);
  }
  for (const key of Object.keys(expected)) if (!(key in actual)) parts.push(`removed: ${key}`);
  return parts.join('; ');
}

function diffFacts(expected, actual) {
  const problems = [];
  for (const section of Object.keys(actual)) {
    const exp = expected[section], act = actual[section];
    if (exp === undefined) { problems.push({ section, message: 'missing from the facts block' }); continue; }
    const message = Array.isArray(act) ? diffList(exp, act) : diffMap(exp, act);
    if (message) problems.push({ section, message });
  }
  return problems;
}

module.exports = { extractFacts, parseFactsBlock, diffFacts };

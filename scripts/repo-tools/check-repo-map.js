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

function findAnchors(md) {
  const functions = new Set(), paths = new Set();
  for (const [, token] of md.matchAll(/`([^`\n]+)`/g)) {
    const fn = token.match(/^([A-Za-z_$][\w$.]*)\(\)$/);
    if (fn) { functions.add(fn[1].split('.').pop()); continue; }
    if (/[<>*%\s:]/.test(token) || token.startsWith('http')) continue;
    if (token.includes('/') || /\.(js|json|md|html)$/.test(token)) paths.add(token);
  }
  return { functions: [...functions], paths: [...paths] };
}

function checkAnchors(anchors, { html, jsSources, exists }) {
  const sources = [html, ...Object.values(jsSources)];
  const problems = [];
  for (const name of anchors.functions) {
    const esc = name.replace(/\$/g, '\\$');
    const re = new RegExp(`function ${esc}\\b|\\b${esc}\\s*=\\s*function`);
    if (!sources.some(s => re.test(s))) problems.push({ section: 'anchors', message: `missing function: ${name}()` });
  }
  for (const p of anchors.paths) {
    if (!exists(p)) problems.push({ section: 'anchors', message: `missing path: ${p}` });
  }
  return problems;
}

// ---- CLI ----

const fs = require('fs');
const path = require('path');

const MAP = '.claude/skills/repository-knowledge/repo-map.md';
const APP = 'marvel-snap-deck-builder.html';

function listFiles(root) {
  try {
    const out = require('child_process').execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    const files = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        if (e.name === '.git' || e.name === 'node_modules') continue;
        const rel = dir ? `${dir}/${e.name}` : e.name;
        if (e.isDirectory()) walk(rel); else files.push(rel);
      }
    })('');
    return files;
  }
}

function loadState(root, html) {
  const { extractBaselineSnapdata, applyOps } = require('../patch-tools/current-state.js');
  const D = extractBaselineSnapdata(html);
  const dir = path.join(root, 'patches');
  const versions = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  for (const v of versions) applyOps(D, JSON.parse(fs.readFileSync(path.join(dir, v), 'utf8')).operations);
  return { D, versions };
}

function main(argv) {
  const root = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
  const mapPath = path.join(root, MAP);
  const html = fs.readFileSync(path.join(root, APP), 'utf8');
  const files = listFiles(root);
  const { D, versions } = loadState(root, html);
  const actual = extractFacts({ html, files, current: D });

  if (argv.includes('--facts')) {
    console.log('```json repo-facts\n' + JSON.stringify(actual, null, 2) + '\n```');
    return 0;
  }
  if (!fs.existsSync(mapPath)) {
    console.error(`repo map not found: ${MAP}`);
    return 2;
  }

  const md = fs.readFileSync(mapPath, 'utf8');
  const info = {
    cards: (D.CARDS || []).length,
    locations: (D.LOCATIONS || []).length,
    latestPatch: versions[versions.length - 1] || null,
    patchFiles: versions.length,
  };
  let problems;
  try {
    problems = diffFacts(parseFactsBlock(md), actual);
  } catch (e) {
    problems = [{ section: 'facts', message: e.message }];
  }
  const jsSources = {};
  for (const f of actual.scripts) jsSources[f] = fs.readFileSync(path.join(root, f), 'utf8');
  problems.push(...checkAnchors(findAnchors(md), { html, jsSources, exists: p => fs.existsSync(path.join(root, p)) }));

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ ok: problems.length === 0, info, problems }, null, 2));
  } else {
    console.log(`cards: ${info.cards} | locations: ${info.locations} | latest patch: ${info.latestPatch} | patch files: ${info.patchFiles}`);
    if (problems.length === 0) console.log('PASS');
    for (const p of problems) console.log(`STALE ${p.section}: ${p.message}`);
  }
  return problems.length === 0 ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { extractFacts, parseFactsBlock, diffFacts, findAnchors, checkAnchors };

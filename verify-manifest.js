#!/usr/bin/env node
/*
 * Verifies manifest.json against the bytes clients actually download.
 *
 * The app fetches each patch from raw.githubusercontent.com and refuses to
 * apply it unless its SHA-256 matches the manifest. Those served bytes are
 * git's stored blob (LF), which on Windows is NOT what sits in the working
 * tree: core.autocrlf rewrites checked-out files to CRLF, changing their
 * bytes and therefore their hash.
 *
 * Hashing the working-tree file instead of the blob is exactly how patch
 * 2026.08.16.009 shipped three corrupted hashes and broke updates for every
 * user, so this script hashes the blob (`git show :<path>`) and additionally
 * asserts no patch file carries CR bytes at all.
 *
 * Usage: node verify-manifest.js [--remote]
 *   --remote  also fetch each patch from raw.githubusercontent.com and check
 *             the published bytes (requires the commit to be pushed).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const repoRoot = __dirname;
const checkRemote = process.argv.includes('--remote');
const RAW = 'https://raw.githubusercontent.com/bennett-workspace/marvelsnap-ai-assistant/main';

let failures = 0;
const fail = msg => { console.error('  FAIL  ' + msg); failures++; };
const pass = msg => console.log('  ok    ' + msg);

function blobBytes(relPath) {
  // ":path" reads the staged/index version, which is the normalized (LF) blob
  return execFileSync('git', ['show', ':' + relPath], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
}

const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));

console.log('manifest.latestVersion =', manifest.latestVersion);
console.log('patches listed =', manifest.patches.length);

console.log('\n--- sha256(blob) vs manifest ---');
for (const p of manifest.patches) {
  const rel = 'patches/' + p.version + '.json';
  let buf;
  try {
    buf = blobBytes(rel);
  } catch (e) {
    fail(p.version + ' — not committed yet (' + rel + '); stage it before verifying');
    continue;
  }
  const h = crypto.createHash('sha256').update(buf).digest('hex');
  if (h === p.sha256) pass(p.version);
  else fail(p.version + '\n          manifest: ' + p.sha256 + '\n          blob:     ' + h);
}

console.log('\n--- no CR bytes in served patch files ---');
for (const p of manifest.patches) {
  const rel = 'patches/' + p.version + '.json';
  let buf;
  try { buf = blobBytes(rel); } catch (e) { continue; }
  const cr = buf.indexOf(13);
  if (cr === -1) pass(p.version + ' is LF-only');
  else fail(p.version + ' contains CR at byte ' + cr + ' — .gitattributes should force eol=lf');
}

console.log('\n--- manifest internals ---');
const last = manifest.patches[manifest.patches.length - 1];
last && (manifest.latestVersion === last.version
  ? pass('latestVersion matches final patch entry')
  : fail('latestVersion ' + manifest.latestVersion + ' != final entry ' + last.version));

manifest.patches.forEach((p, i) => {
  if (i === 0) return;
  const prev = manifest.patches[i - 1].version;
  if (p.fromVersion !== prev) fail(p.version + '.fromVersion = ' + p.fromVersion + ', expected ' + prev);
});
if (!failures) pass('fromVersion chain is contiguous');

const seen = new Set();
manifest.patches.forEach(p => {
  if (seen.has(p.version)) fail('duplicate version entry ' + p.version);
  seen.add(p.version);
});

const onDisk = fs.readdirSync(path.join(repoRoot, 'patches')).filter(f => f.endsWith('.json')).sort();
const listed = manifest.patches.map(p => p.version + '.json');
onDisk.forEach(f => { if (!listed.includes(f)) fail('patches/' + f + ' exists but is not listed in manifest'); });
if (onDisk.length === listed.length) pass('every patch file on disk is listed');

if (checkRemote) {
  console.log('\n--- published bytes on raw.githubusercontent ---');
  const https = require('https');
  const get = url => new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
  (async () => {
    for (const p of manifest.patches) {
      try {
        const buf = await get(RAW + '/patches/' + p.version + '.json');
        const h = crypto.createHash('sha256').update(buf).digest('hex');
        if (h === p.sha256) pass(p.version + ' (published)');
        else fail(p.version + ' published bytes hash ' + h + ', manifest says ' + p.sha256);
      } catch (e) {
        fail(p.version + ' — could not fetch published copy: ' + e.message);
      }
    }
    done();
  })();
} else {
  done();
}

function done() {
  console.log('\n' + (failures ? failures + ' CHECK(S) FAILED' : 'ALL CHECKS PASSED'));
  process.exit(failures ? 1 : 0);
}

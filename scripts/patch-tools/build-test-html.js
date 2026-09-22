'use strict';
/*
 * Copies the app HTML to a throwaway test file and repoints its
 * PATCH_BASE at a local server, so the full check -> download -> verify
 * -> apply pipeline can be exercised against locally-built patches
 * before anything is pushed (patches on a branch, or freshly built and
 * not yet committed, are not reachable at raw.githubusercontent.com).
 *
 * Usage:
 *   1. cd into the Desktop folder that holds BOTH marvel-snap-deck-builder.html
 *      and this repo as a subfolder (marvelsnap-ai-assistant/), then:
 *        python -m http.server 8791
 *   2. node marvelsnap-ai-assistant/scripts/patch-tools/build-test-html.js
 *   3. Open http://localhost:8791/_test_patch_local.html in a real browser
 *      (or Claude's browser tool), clear localStorage + IndexedDB, reload,
 *      go to ตั้งค่า -> อัปเดต Patch.
 *   4. Delete _test_patch_local.html when done — it is scratch, never commit it.
 *
 * This only works when the two copies of the app HTML are already in sync
 * (see the repo's Global Constraint about editing the repo copy then
 * copying it to the Desktop path) — it copies FROM the Desktop path.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const DESKTOP_DIR = path.resolve(REPO, '..'); // parent of the repo folder
const REPO_NAME = path.basename(REPO);
const SRC = path.join(DESKTOP_DIR, 'marvel-snap-deck-builder.html');
const DEST = path.join(DESKTOP_DIR, '_test_patch_local.html');

if (!fs.existsSync(SRC)) {
  console.error('Expected to find marvel-snap-deck-builder.html at:', SRC);
  console.error('This script assumes the classic layout: Desktop/AI/Marvel Snap/marvel-snap-deck-builder.html');
  console.error('with this repo checked out alongside it at Desktop/AI/Marvel Snap/' + REPO_NAME + '/');
  process.exit(1);
}

let html = fs.readFileSync(SRC, 'utf8');

const manifestOld = "manifest:'https://raw.githubusercontent.com/'+PATCH_REPO+'/'+PATCH_BRANCH+'/manifest.json?'+v,";
const manifestNew = `manifest:'http://localhost:8791/${REPO_NAME}/manifest.json?'+v,`;
const fileOld = "file:function(path){ return 'https://raw.githubusercontent.com/'+PATCH_REPO+'/'+PATCH_BRANCH+'/'+path; }";
const fileNew = `file:function(path){ return 'http://localhost:8791/${REPO_NAME}/'+path; }`;

if (!html.includes(manifestOld) || !html.includes(fileOld)) {
  console.error('PATCH_BASE shape has changed in marvel-snap-deck-builder.html — update the string literals in this script to match.');
  process.exit(1);
}

html = html.replace(manifestOld, manifestNew).replace(fileOld, fileNew);
fs.writeFileSync(DEST, html, 'utf8');
console.log('wrote', DEST);
console.log('serve http://localhost:8791/ from', DESKTOP_DIR, 'then open _test_patch_local.html');

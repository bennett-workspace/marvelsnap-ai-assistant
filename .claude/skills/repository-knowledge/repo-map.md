# Repository map — marvelsnap-ai-assistant

This map is written for agents. The anchors are identifiers rather than line
numbers, so grep for them. Run `scripts/repo-tools/check-repo-map.js` before
trusting this file: it checks the Facts block and confirms that every
backticked function call and path still exists. Runtime files outside the
repo are written as `<runDir>/…` so the check skips them.

## Overview

- **The app is one static file:** `marvel-snap-deck-builder.html`. It is
  about 3,000 lines of vanilla JS, HTML and CSS with no framework and no
  build step. GitHub Pages serves it from `main`.
- **There is no backend, database or server API.** All state lives in the
  browser: `localStorage` plus two IndexedDB databases. A "service" in this
  project means one of two things:
  - a Node script under `scripts/`, which Claude runs
  - client-side JS inside the HTML
- **There is no AI in the app.** The `advisor` view is a keyword search over
  the local data, built by `advisorResultHTML()`. The intelligence lives in
  Claude skills under `.claude/skills/`.
- **The data comes from four places:**
  - the baseline `window.SNAPDATA` blob embedded in the HTML
  - JSON-Patch files in `patches/`, which the app applies at runtime
  - the Steam game's local CollectionState.json, for the user's collection
  - `extension/`, a Chrome/Edge extension that sends that file into the
    page automatically

## Routes

`NAV` lists the views. `go()` sets `route`, and `render()` calls
`V.<route>`. The view returns an HTML string, which replaces the whole view
on every render because there is no diffing. One delegated click handler
reads `data-*` attributes, mutates state, and calls `render()` again.

| route | label (Thai UI) | main data it reads |
|---|---|---|
| dashboard | แดชบอร์ด | CARDS, LOCS, ARCH, META, P, col, cur, decks, `recommendSplit()` |
| collection | การ์ดของฉัน | CARDS, ARCH, col |
| builder | สร้างเด็ค | ARCH, col, cur, decks, `recommend()` |
| recommend | เด็คแนะนำ | CARDS, ARCH, META, MATCH, P, col, `recommendSplit()`, `archView()` |
| advisor | ผู้ช่วยแนะนำ | keyword search via `advisorResultHTML()` |
| analyze | วิเคราะห์เด็ค | col, cur |
| locations | Locations | LOCS, col, cur |
| matchups | แมตช์อัพ | ARCH, MATCH, P, col |
| meta | เมตาปัจจุบัน | META, P, decks |
| decklib | คลังเด็ค | meta sample decks via `deckLibFilterBar()` |
| shop | ร้านค้า | SHOP, ARCH, META, P, col, decks |
| database | ฐานข้อมูลการ์ด | CARDS, P |
| series | Series | CARDS, col, cur |
| variants | Variants | CARDS (`vr`), col |
| artists | Variant Artists | CARDS (`vr`), col |
| settings | ตั้งค่า | everything: import/export, sync, patches, `deckCode()` |

## Data

`window.SNAPDATA` becomes `D`, and boot assigns the globals from it:
`CARDS=D.CARDS, LOCS=D.LOCATIONS, ARCH=D.ARCHETYPES, META=D.META,
MATCH=D.MATCH, P=D.PATCH, SHOP=D.SHOP`. The same assignment is repeated
after a patch, a snapshot load and a rollback.

- **The baseline is stale.** The blob sits on one line of about 1.38 MB
  (line 331 today). It holds only the data as of `2026.08.16.000`. The
  current truth is the baseline plus every file in `patches/`: use
  `loadCurrent()` from `scripts/patch-tools/current-state.js`. Never
  re-derive card facts from the HTML blob.
- **`CARDS[]` fields:**
  - `id`: CardDefId, the same as the game's
  - `n`: English name
  - `c`: cost
  - `p`: power
  - `a`: ability (English)
  - `aTh`: ability (Thai)
  - `s`: series
  - `art`, `t` (mechanic tags), `noab` (no ability), `arch` (archetype ids),
    `meta` (meta score)
  - `vr`: variants, as `[url, source/bundle, artist, owned-flag]`
  - `hist`: balance history, newest first, as
    `[dateISO, changedFlag, costStr, powerStr, abilityText]`.
    `changedFlag` is 1 for the card's debut entry and 0 for a balance
    change.
  - `new`: set on newly released cards
- **`LOCATIONS[]`:** `id, n, e` (effect), `eTh, t, art, arts`.
- **`ARCHETYPES[]`:** `id, name, nameTh, tier, diff, beginner, desc, win`,
  plus `core/flex/tech` card-id lists, `combo`, turn guides
  `early/mid/late/turns`, mulligan `keep/throw`, `situ`,
  `strong/weak/watch`, `goodLoc/badLoc`.
- **`META[]`:** ranked lists with `id, name, tier, cube, wr, games, arch,
  note, cards`.
  - Ids starting `ff` are the newest live block.
  - `arch-*` entries are archived lists, date-stamped in the name.
- **`MATCH`:** archetype id → matchup scores, from 1 (bad) to 5 (good).
- **`PATCH`:** `dataVersion, version, ota, season, metaDate, cardDataDate,
  sources, notice, keyword, upcoming`.
  - `upcoming` lists content that is announced but not yet released.
- **`SHOP`:** `snapshotAt, source, bundles`. It exists only after the shop
  patch.
- **`EXTRATAGS`:** extra mechanic-tag labels.
- **`BUILD`:** the counts at baseline build time. They go stale after the
  first patch, so do not trust them for current totals.
- **Indices:** `rebuildIndices()` builds `byId[id]` and
  `byName[name.toLowerCase()]`.

## Patch system

Full procedure: `docs/PATCH_UPDATE_PLAYBOOK.md`. What follows is only what
other skills need to know.

- **Files:** `manifest.json` lists every version with its SHA-256. The
  patches are `patches/<dataVersion>.json`, each holding
  `{operations:[RFC 6902 add|replace|remove]}`.
- **The client flow:**
  - `silentPatchCheck()` and `checkForPatch()` fetch the manifest from
    raw.githubusercontent.com.
  - `downloadAndVerifyPatch()` compares SHA-256 via `sha256Hex()`.
  - `validatePatchStructure()` checks the patch shape.
  - `applyJSONPatchOps()` applies it.
  - A snapshot is stored in IndexedDB `snapdb_patch` through the `idb*`
    helpers.
  - `loadStoredSnapshotIfAny()` restores it on boot.
  - `doPatchRollback()` undoes a patch, and `logPatchEvent()` logs events.
- **The offline equivalent is `current-state.js`:**
  - `loadCurrent()` returns `{D, versions}`
  - `applyOps()` applies operations
  - `extractBaselineSnapdata()` reads the baseline blob
- **Verification:** `verify-manifest.js` checks the manifest against the
  bytes clients download; `--remote` checks what is actually served.
- **Local testing:** `scripts/patch-tools/build-test-html.js` writes a test
  copy of the app pointed at a local patch server.

## Collection

- **In-memory state:** a `col` Set of card ids, loaded with `load(K.col)`
  and persisted with `saveCol()`, which wraps `save()`.
- **localStorage keys** (the `K` object; values are in the Facts block):
  - `col`: owned ids
  - `decks`: saved decks
  - `set`: settings
  - `syncedAt`: last sync time
  - `collLevel`: collection level
- **Ways the collection gets written:**
  1. Clicks in the collection view.
  2. Pasted list import via `importNames()`, called with mode `'col'` from
     settings.
  3. A full sync from the game file through `applyCollectionSyncText()`.
     - It reads `ServerState.Cards[].CardDefId` and replaces `col`
       entirely rather than merging.
     - The sync is triggered either by the file picker
       (`syncCollectionFromFile()`) or by the extension.
     - For the extension, `extension/content.js` sends the game file
       **automatically on every page load**, and again whenever the page
       posts `marvelsnap-request-sync`. It arrives as a `postMessage` whose
       `source` is `marvelsnap-sync-ext`. The page's `message` listener
       applies it silently.
     - So with the extension installed, simply opening the app replaces
       `col` with whichever account the game last wrote. Check this first
       when a collection "changes by itself".
- **The game file:**
  `%LocalAppData%Low/Second Dinner/SNAP/Standalone/States/nvprod/CollectionState.json`.
  - It starts with a UTF-8 BOM, which must be stripped before `JSON.parse`.
  - It reflects **whichever account is logged in** on the PC.
- **Offline readers:** `scripts/deck-tools/export-inputs.js` reads the same
  file and writes `<runDir>/collection.json` for the deck skills. User collection
  output never goes into this public repo.

## Decks

- **The rules** are 12 cards with no duplicates.
  - `buildDeck()` enforces them through its inner `add()` guard (`seen[c.id]`
    and `picked.length>=12`).
  - `toggleDeck()` caps a deck at 12 cards.
- **Current deck:** `cur = {name, arch, ids[]}` is a single global. It is
  made durable only by saving it into the `decks` array (`K.decks`).
- **Deck code:** `deckCode()` produces base64 of UTF-8 JSON
  `{Name (40 chars max), Cards:[{CardDefId}]}`, the same format the game
  uses. `parseDeckCode()` reverses it and drops unknown ids silently.
- **Import:** the settings box "นำเข้าเด็ค" calls `importNames()` with mode
  `'deck'`.
  - It first tries `parseDeckCode()`. If that fails, it falls back to fuzzy
    name matching.
  - It sets `cur` and goes to the builder.
  - Legality is not re-checked on import, so generated decks must be
    validated beforehand. `scripts/deck-tools/validate-decks.js` does this.
- **Recommendations:**
  - `buildDeck()` builds one deck per archetype from owned cards: core,
    then flex and tech ranked by `metaScore()` and efficiency, with a
    curve pass. It may return fewer than 12 cards.
  - `recommend()` scores each archetype deck: compatibility, synergy,
    `curveScore()`, power and meta.
  - `recommendSplit()` splits the results into ready and incomplete decks.
  - `bestDeckFromCollection()` backfills the best deck up to 12 cards.
  - `guessArch()` labels an imported deck with an archetype.

## Scripts and tools

| path | what / when |
|---|---|
| `verify-manifest.js` | Verify manifest hashes before committing a patch; `--remote` after a push |
| `scripts/patch-tools/current-state.js` | Merged current data (`loadCurrent()`); run standalone for a summary |
| `scripts/patch-tools/build-test-html.js` | Local end-to-end test page for new patches |
| `scripts/build-shop-patch.js` | Scrape snap.fan bundles into the SHOP patch; fails loudly on bad rows |
| `scripts/lib/shop-parse.js` | Pure parsers used by the shop patch (tests: `scripts/lib/shop-parse.test.js`, `scripts/lib/shop-status.test.js`) |
| `scripts/deck-tools/export-inputs.js` | Write deck-skill inputs (cards, collection, meta, matchups, context) to a run dir |
| `scripts/deck-tools/validate-decks.js` | Hard rules and deck codes for generated decks |
| `scripts/deck-tools/render-report.js` | Thai HTML deck guide from `<runDir>/07-report.json` |
| `scripts/repo-tools/check-repo-map.js` | This map's checker (tests: `scripts/repo-tools/check-repo-map.test.js`) |

Skills: `.claude/skills/marvel-snap-deck-builder/`, which is a 7-agent deck
pipeline, and `.claude/skills/repository-knowledge/`. Shared rules for all
skills are in `docs/skills/CONVENTIONS.md`, and the skill plan is in
`docs/skills/ECOSYSTEM.md`.

## Known hazards

- **Line endings.** Manifest hashes are computed over the LF git blob. A
  CRLF checkout changes the bytes and caused the v009 hash mismatch.
  `.gitattributes` pins `eol=lf` for patches and the manifest. Always hash
  the committed blob.
- **Serving lag.** raw.githubusercontent.com caches files for a few minutes
  after a push. If `verify-manifest.js --remote` fails right after a push,
  retry before debugging.
- **Account switches.** The game file follows the logged-in account. A drop
  in owned count or collection score means a different account, not lost
  cards.
- **Huge line.** Line 331 is about 1.38 MB. Never read it whole; grep and
  read with offsets.
- **Stale baseline.** `BUILD` counts and the baseline blob are stale. Use
  `loadCurrent()`.

## Facts

Generated by `node scripts/repo-tools/check-repo-map.js --facts`. Replace
the block wholesale when the check reports a STALE fact.

```json repo-facts
{
  "routes": [
    "advisor",
    "analyze",
    "artists",
    "builder",
    "collection",
    "dashboard",
    "database",
    "decklib",
    "locations",
    "matchups",
    "meta",
    "recommend",
    "series",
    "settings",
    "shop",
    "variants"
  ],
  "snapdataKeys": [
    "ARCHETYPES",
    "BUILD",
    "CARDS",
    "EXTRATAGS",
    "LOCATIONS",
    "MATCH",
    "META",
    "PATCH",
    "SHOP"
  ],
  "storageKeys": {
    "col": "snapdb.collection.v1",
    "decks": "snapdb.decks.v1",
    "set": "snapdb.settings.v1",
    "syncedAt": "snapdb.collection.syncedAt.v1",
    "collLevel": "snapdb.collection.level.v1"
  },
  "scripts": [
    "scripts/build-shop-patch.js",
    "scripts/deck-tools/export-inputs.js",
    "scripts/deck-tools/render-report.js",
    "scripts/deck-tools/validate-decks.js",
    "scripts/lib/shop-parse.js",
    "scripts/lib/shop-parse.test.js",
    "scripts/lib/shop-status.test.js",
    "scripts/patch-tools/build-test-html.js",
    "scripts/patch-tools/current-state.js",
    "scripts/repo-tools/check-repo-map.js",
    "scripts/repo-tools/check-repo-map.test.js",
    "verify-manifest.js"
  ]
}
```

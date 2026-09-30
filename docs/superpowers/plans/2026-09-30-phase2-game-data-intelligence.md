# Phase 2 — Game Data Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the history, provenance, diff and freshness functions over the patch history, a `gdi.js` CLI on top of them, and the `game-data-intelligence` skill.

**Architecture:** Nothing is stored. Each version is rebuilt by replaying `patches/*.json` (in manifest order) over the HTML baseline, using the existing `extractBaselineSnapdata` and `applyOps`. The pure functions take their inputs as arguments so tests can use fixtures. Thin wrappers bind those functions to the real repo.

**Tech Stack:** Node 24 (CommonJS, no dependencies) and `node:test`.

**Spec:** [`docs/superpowers/specs/2026-09-30-phase2-game-data-intelligence-design.md`](../specs/2026-09-30-phase2-game-data-intelligence-design.md)

## Global Constraints

- **Location.** Repo root is `C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant`, on branch `skills/phase2-game-data-intelligence`.
- **Commits.** Commit only, never `git push`. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Read-only over app data.** Never modify `marvel-snap-deck-builder.html`, `patches/`, `manifest.json` or `extension/`.
- **New code** goes in `scripts/game-data/`, with tests in `scripts/game-data/*.test.js`.
- **Running tests.** The command is `node --test "scripts/game-data/*.test.js"`. Node 24 rejects a directory argument.
- **Repo root in code** is `process.env.REPO_ROOT || path.resolve(__dirname, '..', '..')`, the same convention as `check-repo-map.js`.
- **Baseline version** is `'2026.08.16.000'`, with source `'baseline (HTML)'`.
- **Staleness thresholds:** meta is stale after 14 days, collection after 3 days. An upcoming entry is `due` once its date is today or earlier in UTC.
- **Fixed test data.** Real-data tests pin v014 and v015 explicitly, never "latest", so they keep passing after future patches. The one exception is the equality test "`loadAt(latest)` equals `loadCurrent`".
- **Repo map.** `node scripts/repo-tools/check-repo-map.js` must PASS at the end. New scripts change its `scripts` fact, so regenerate that fact with `--facts`.

## Review Focus

1. **Card queries where an exact name is also a substring of others.** `Hulk` exactly matches one card but is a substring of six (`Hulkbuster`, `She-Hulk` …). An exact id or name must win over substring matching. Test: `findCard prefers exact name over substring` (Task 5).
2. **`at <version>` for a card that did not exist yet.** Example: `at 014 card TheInversion`. It must print a clear "not present at that version" message and exit 1, never throw. Test in Task 5.
3. **JSON-Pointer escapes (`~1`, `~0`) in patch paths.** No real patch uses them today, but `applyOps` decodes them, so provenance must decode the same way. Test: `entityKeyFor decodes ~1 and ~0` (Task 2).
4. **An unparseable `PATCH.metaDate`, or an upcoming entry with no date.** The status must be `unknown`, with no crash and no guessed date. Test in Task 4.
5. **Input mutation.** `loadAt` and `diffStates` must never mutate their inputs or a shared cached baseline; two `loadAt` calls must be independent. Test: `loadAt returns independent copies` (Task 1).

---

### Task 1: Version list and replay

**Files:**
- Create: `scripts/game-data/history.js`
- Test: `scripts/game-data/history.test.js`

**Interfaces:**
- Consumes: `extractBaselineSnapdata(html)` and `applyOps(doc, ops)` from `scripts/patch-tools/current-state.js`, and `loadCurrent()` (tests only).
- Produces:
  - **`readPatches() -> Array<{ version, fromVersion, releasedAt, source, summary, file, operations }>`**, in `manifest.json` order. `file` is the path relative to the repo, such as `patches/2026.08.16.015.json`.
  - **`listVersions() -> Array<{ version, fromVersion, releasedAt, source, summary, file }>`**. It is the baseline entry followed by `readPatches()` with `operations` left out.
  - **`resolveVersion(v: string|number, versions?: string[]) -> string`**. It accepts a full version, a 3-digit suffix such as `'015'`, or a number such as `15`. Otherwise it throws `Error('unknown version: ' + v)`.
  - **`loadBaseline() -> object`**, a fresh deep copy on every call.
  - **`loadAt(v) -> object`**, the SNAPDATA after the baseline plus every patch up to and including `v`.
  - **`BASELINE_VERSION = '2026.08.16.000'`**.

- [ ] **Step 1: Write the failing tests** in `history.test.js`.
  - `listVersions starts with the baseline and follows the manifest`:
    - `[0].version === '2026.08.16.000'` and `[0].source === 'baseline (HTML)'`
    - `[15].version === '2026.08.16.015'`
    - every entry after index 0 has a string `source`
  - `resolveVersion accepts full, suffix and number`: `'2026.08.16.015'`, `'015'` and `15` all resolve to `'2026.08.16.015'`, and `0` resolves to `'2026.08.16.000'`.
  - `resolveVersion rejects unknown`: `assert.throws(() => resolveVersion('999'), /unknown version: 999/)`.
  - `loadAt(latest) equals loadCurrent`: `assert.deepStrictEqual(loadAt(listVersions().at(-1).version), loadCurrent().D)`.
  - `loadAt 014 has 498 cards and no TheInversion`, and `loadAt 015 has 499`.
  - `loadAt returns independent copies`: mutate `loadAt('015').CARDS[0].c = 99`, then check `loadAt('015').CARDS[0].c !== 99`.

- [ ] **Step 2: Run the tests and verify they fail.** Run `node --test "scripts/game-data/*.test.js"`. Expected: FAIL, `Cannot find module './history.js'`.

- [ ] **Step 3: Implement the functions in `history.js`.**
  - Cache the parsed baseline once. Always return `structuredClone` of it.
  - `loadAt` replays `readPatches()` up to and including the resolved version.

- [ ] **Step 4: Run the tests and verify they pass.** Run `node --test "scripts/game-data/*.test.js"`. Expected: all pass.

- [ ] **Step 5: Commit** with message `game-data: version list and replay (loadAt)`.

### Task 2: Provenance

**Files:**
- Modify: `scripts/game-data/history.js`
- Test: `scripts/game-data/history.test.js`

**Interfaces:**
- Consumes: Task 1 (`readPatches`, `loadBaseline`), and `applyOps`.
- Produces:
  - **`entityKeyFor(D, op) -> { key: string, field: string|null }`**. It follows the spec's Part 1 table. For array roots (`CARDS`, `LOCATIONS`, `META`, `ARCHETYPES`) it reads the id from `D[root][i]` *before* the op is applied. For an `add` it uses `op.value.id`, and when the whole entity is targeted the id comes from `op.value.id` if `D[root][i]` is missing.
    - The root-to-prefix mapping is `CARDS→card`, `LOCATIONS→location`, `META→meta` and `ARCHETYPES→archetype`.
    - It returns `{ key: 'unresolved', field: op.path }` when no id can be found.
    - Path segments are decoded with `~1→/` and then `~0→~`.
  - **`buildProvenance(baseline, patches) -> Map<string, Array<{ version, op, field, source, releasedAt }>>`**. It is pure: it clones `baseline`, and for each op it computes the key first, then applies the op.
  - **`provenance() -> Map`**, the same function bound to the real repo.

- [ ] **Step 1: Write the failing tests.**
  - `buildProvenance follows ids across an index-shifting remove`:
    - Baseline: `{ CARDS:[{id:'A',c:1},{id:'B',c:1},{id:'C',c:1}], PATCH:{} }`.
    - Patch v1 is `[{op:'remove',path:'/CARDS/0'}]`, and patch v2 is `[{op:'replace',path:'/CARDS/1/c',value:5}]`. Each patch object carries `version`, `source` and `releasedAt`.
    - Expected: `card:C` has one row, `{version:'v2', op:'replace', field:'c'}`. `card:A` has a row with `op:'remove'` and `field:null`. `card:B` has no rows.
  - `entityKeyFor maps each root`: `/PATCH/upcoming` gives `patch:upcoming` with field `null`, `/MATCH/ramp/2` gives `match:ramp` with field `'2'`, `/SHOP` gives `shop`, and `/CARDS/-` with `value.id:'X'` gives `card:X` with field `null`.
  - `entityKeyFor decodes ~1 and ~0`: `/MATCH/a~1b/x` gives key `match:a/b`, and `/MATCH/a~0b` gives key `match:a~b`.
  - `real provenance of TheInversion is its v015 add`: `provenance().get('card:TheInversion')` deep-equals one row with version `'2026.08.16.015'`, op `'add'` and field `null`. Compare `source` and `releasedAt` against that patch's own fields.
  - `real provenance has no unresolved ops`: `provenance().has('unresolved') === false`.

- [ ] **Step 2: Run the tests and verify they fail.** Run `node --test "scripts/game-data/*.test.js"`. Expected: FAIL, `buildProvenance is not a function`.

- [ ] **Step 3: Implement `entityKeyFor`, `buildProvenance` and `provenance` in `history.js`.**

- [ ] **Step 4: Run the tests and verify they pass.** Run `node --test "scripts/game-data/*.test.js"`. Expected: all pass.

- [ ] **Step 5: Commit** with message `game-data: provenance by entity id`.

### Task 3: Structural diff

**Files:**
- Create: `scripts/game-data/diff.js`
- Test: `scripts/game-data/diff.test.js`

**Interfaces:**
- Consumes: `loadAt` from Task 1 (tests only).
- Produces: **`diffStates(A, B) -> { cards, locations, meta, archetypes, patch, other }`**, in exactly the spec's Part 2 shape.
  - Collections are keyed by `id`. `changed[].fields` is sorted by field name.
  - `added` and `removed` are id arrays, in the order they appear in B and A respectively.
  - `other` has the keys `MATCH`, `SHOP`, `EXTRATAGS` and `BUILD`, each a boolean.

- [ ] **Step 1: Write the failing tests.**
  - `diffStates on a fixture`:
    - A: CARDS `[{id:'x',c:1,p:1},{id:'y',c:2,p:2}]`, PATCH `{v:1,k:'s'}`.
    - B: CARDS `[{id:'x',c:1,p:3},{id:'z',c:4,p:4}]`, PATCH `{v:2,k:'s'}`, and SHOP differs.
    - Expected:
      - `cards.added` `['z']` and `cards.removed` `['y']`
      - `cards.changed` `[{id:'x',fields:[{field:'p',before:1,after:3}]}]`
      - `patch` `[{field:'v',before:1,after:2}]`
      - `other.SHOP === true` and `other.MATCH === false`
    - The fixtures have no LOCATIONS, META or ARCHETYPES, so treat a missing collection as `[]`.
  - `diffStates does not mutate inputs`: `JSON.stringify` A and B before and after, and check they are equal.
  - `real diff 014 -> 015 is exactly The Inversion`:
    - `cards` deep-equals `{added:['TheInversion'],removed:[],changed:[]}`
    - `locations`, `meta` and `archetypes` are all empty
    - `patch.map(f => f.field).sort()` deep-equals `['dataVersion','upcoming']`
    - every value in `other` is `false`

- [ ] **Step 2: Run the tests and verify they fail.** Run `node --test "scripts/game-data/*.test.js"`. Expected: FAIL, `Cannot find module './diff.js'`.

- [ ] **Step 3: Implement `diffStates` in `diff.js`.** Compare with JSON equality after `JSON.stringify`, because key order is stable in this data.

- [ ] **Step 4: Run the tests and verify they pass.** Run `node --test "scripts/game-data/*.test.js"`. Expected: all pass.

- [ ] **Step 5: Commit** with message `game-data: structural diff between versions`.

### Task 4: Thai dates and freshness

**Files:**
- Create: `scripts/game-data/freshness.js`
- Test: `scripts/game-data/freshness.test.js`

**Interfaces:**
- Produces:
  - **`parseThaiDate(s: string) -> 'YYYY-MM-DD' | null`**. It takes the last match of `(\d{1,2})\s*(<month abbr>)\s*(\d{4})`. The months, in order, are `ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.`. Escape the dots in the regex, and match longer abbreviations first so that `มี.ค.` wins over any shorter overlap. A year of 2400 or more has 543 subtracted.
  - **`freshness(D, { now: Date, collectionFile?: string|null, latestPatch?: { version, releasedAt } }) -> Array<{ item, status, detail }>`**. Row order: `meta`, `collection`, then one `upcoming:<name>` per entry, then `latestPatch`. The statuses and rules are in the spec's Part 3. `detail` is a one-line English string that includes the date and the age in days.
    - When `collectionFile` is `undefined`, use the default game-file path from the spec.
    - When it is `null` or the file is missing, the row is `unknown`.
  - **`DEFAULT_COLLECTION_FILE`**, exported.

- [ ] **Step 1: Write the failing tests.**
  - `parseThaiDate reads a plain date`: `'20 ก.ย. 2026'` gives `'2026-09-20'`.
  - `parseThaiDate takes the last date`: `'3/4 · Series 5 · Seasonal SNAP Pack — 29 ก.ย. 2026'` gives `'2026-09-29'`, and `'1 ก.ย. – 6 ต.ค. 2026'` gives `'2026-10-06'`.
  - `parseThaiDate converts BE years`: `'5 มี.ค. 2569'` gives `'2026-03-05'`.
  - `parseThaiDate returns null on garbage`: `'soon'` and `''` both give `null`.
  - `freshness flags stale meta, due upcoming and a missing collection`:
    - D has PATCH `{ metaDate:'1 ก.ย. 2026 (x)', upcoming:[['A','… — 29 ก.ย. 2026','t'],['B','no date','t']] }`.
    - `now = new Date('2026-09-30T00:00:00Z')` and `collectionFile = null`.
    - Expected: `meta` is `stale`, `collection` is `unknown`, `upcoming:A` is `due`, `upcoming:B` is `unknown`.
  - `freshness keeps unparseable metaDate unknown`: `metaDate:'n/a'` gives `meta` `unknown`, and nothing throws.
  - `freshness counts a future upcoming date as fresh`: a date of `'5 ต.ค. 2026'` with the same `now` gives `fresh`.

- [ ] **Step 2: Run the tests and verify they fail.** Run `node --test "scripts/game-data/*.test.js"`. Expected: FAIL, `Cannot find module './freshness.js'`.

- [ ] **Step 3: Implement the functions in `freshness.js`.** Compute ages in whole UTC days. Get the collection file's age from `fs.statSync(file).mtime`.

- [ ] **Step 4: Run the tests and verify they pass.** Run `node --test "scripts/game-data/*.test.js"`. Expected: all pass.

- [ ] **Step 5: Commit** with message `game-data: Thai date parsing and freshness report`.

### Task 5: CLI, skill, docs

**Files:**
- Create: `scripts/game-data/gdi.js`
- Test: `scripts/game-data/gdi.test.js`
- Create: `.claude/skills/game-data-intelligence/SKILL.md`
- Modify: `.claude/skills/repository-knowledge/repo-map.md` (the *Scripts and tools* table and the Facts block)
- Modify: `docs/skills/ECOSYSTEM.md` (set the `game-data-intelligence` status to `done`)
- Modify: `docs/briefs/NEXT-SESSION.md` (Phase 2 done, Phase 3 `game-data-sync` next)

**Interfaces:**
- Consumes: Tasks 1–4 (`listVersions`, `resolveVersion`, `loadAt`, `provenance`, `diffStates`, `freshness`).
- Produces:
  - **`findCard(cards, query) -> { card } | { candidates: string[] }`**. Match an exact id first, then an exact name (case-insensitive), then a case-insensitive name substring. One substring hit counts as a match. No hits gives `{ candidates: [] }`.
  - **`main(argv: string[], out = console.log) -> number`** returns the exit code. It runs the CLI when `require.main === module`. The commands and `--json` follow the spec's Part 4.
  - **Output for `card`:**
    - one line `name (id) cost/power · series`
    - the ability
    - `hist:` rows, one per tuple
    - `provenance:` rows, formatted `version op field source`
  - **Output for `diff`:** lines such as `+ card TheInversion`, `- card X`, `~ card X p: 1 -> 3` and `~ PATCH upcoming`.
  - **Output for `freshness`:** one line per row, formatted `status item — detail`.

- [ ] **Step 1: Write the failing tests** in `gdi.test.js`.
  - `findCard prefers exact name over substring`: the query `'hulk'` on the current cards returns `{card}` with `n === 'Hulk'`.
  - `findCard matches an exact name case-insensitively`: the query `'red hulk'` returns `{card}` with `n === 'Red Hulk'`.
  - `findCard treats a single substring hit as a match`: the query `'hulk f'` returns `{card}` with `n === 'Red Hulk Fractured Frontier'`.
  - `findCard lists candidates when ambiguous`: the query `'red hul'` returns `{candidates: ['Red Hulk','Red Hulk Fractured Frontier']}`.
  - `findCard returns no candidates for no match`: the query `'zzz'` returns `{candidates: []}`.
  - `main card prints The Inversion with provenance`: collect `out` lines for `main(['card','The Inversion'], push)`. Expect code `0`, and the joined output contains `TheInversion`, `3/0` and `2026.08.16.015 add`.
  - `main at before existence exits 1`: `main(['at','014','card','TheInversion'], push)` returns `1`, and the output contains `not present at 2026.08.16.014`.
  - `main diff --json matches diffStates`: `JSON.parse` the output of `main(['diff','014','015','--json'])`, and check that `.cards.added` deep-equals `['TheInversion']`.
  - `main unknown command exits 2 with usage`.

- [ ] **Step 2: Run the tests and verify they fail.** Run `node --test "scripts/game-data/*.test.js"`. Expected: FAIL, `Cannot find module './gdi.js'`.

- [ ] **Step 3: Implement `findCard` and `main` in `gdi.js`.** On an unknown version, print the error message and return 2.

- [ ] **Step 4: Run the tests and verify they pass.** Run `node --test "scripts/game-data/*.test.js"`. Expected: all pass.

- [ ] **Step 5: Check freshness on real data.** Run `node scripts/game-data/gdi.js freshness`. Expected: a row `due upcoming:Scarlet Witch Queen of Chaos — …`, and `meta` fresh or stale according to today's date. The meta date is 20 Sep, so it is stale after 4 Oct.

- [ ] **Step 6: Write `SKILL.md`.**
  - Frontmatter: `name: game-data-intelligence`. The description reads: "Current and historical Marvel Snap game data — cards, locations, meta, patch state; what changed between versions; where a fact came from; what is stale. Use for any game-data question and before any skill relies on data being current."
  - Body:
    - link CONVENTIONS
    - the §6 contract fields
    - the five commands with one example each
    - the rule that other skills use these functions or commands and never read the HTML or replay patches themselves
    - the rule that a `due` upcoming row means "verify release per `docs/PATCH_UPDATE_PLAYBOOK.md` §3", not "released"

- [ ] **Step 7: Update the docs.**
  - `repo-map.md`: add one *Scripts and tools* row for `scripts/game-data/gdi.js` (history, diff, freshness and provenance CLI), and one row listing `history.js`, `diff.js` and `freshness.js`. Paste the fresh `--facts` block.
  - `ECOSYSTEM.md`: set the `game-data-intelligence` status to `done`.
  - `NEXT-SESSION.md`: set "Phase 1 is done" to Phases 1–2 done, and name the next phase as Phase 3 `game-data-sync`.

- [ ] **Step 8: Run the full verification.**
  - Run `node --test "scripts/**/*.test.js"`. Expected: all pass, with the previous 39 tests plus the new ones.
  - Run `node scripts/repo-tools/check-repo-map.js`. Expected: `PASS`.

- [ ] **Step 9: Commit** with message `Add game-data-intelligence skill and gdi CLI`.

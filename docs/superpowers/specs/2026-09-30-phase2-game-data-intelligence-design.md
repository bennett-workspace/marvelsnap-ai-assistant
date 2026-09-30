# Phase 2 — Game Data Intelligence

Date: 2026-09-30. Status: approved in chat, pending spec review.

- Brief: [`docs/briefs/2026-09-26-master-skill-ecosystem.md`](../../briefs/2026-09-26-master-skill-ecosystem.md),
  specifically S02 (game data intelligence), §9 (versioning), §10 (source
  trust) and §11 (freshness).
- Plan of all skills: [`docs/skills/ECOSYSTEM.md`](../../skills/ECOSYSTEM.md).
- Shared rules: [`docs/skills/CONVENTIONS.md`](../../skills/CONVENTIONS.md).

## Goal

Build one place every skill asks about game data. It answers four
questions:

1. What is the data now?
2. What was it at version X?
3. Where did this fact come from, meaning which patch and which source?
4. Which data is stale?

## Reality this design rests on

- **The history already exists.** The data history is the baseline in the
  HTML (version `2026.08.16.000`) plus `patches/2026.08.16.001` … `015`.
  - Every patch file has `version`, `fromVersion`, `releasedAt`, `source`
    and `summary`.
  - `manifest.json` lists them in order.
  - Every card has a balance `hist`.
- **Replaying is cheap.** `loadCurrent()` in
  `scripts/patch-tools/current-state.js` replays every patch in about
  20 ms. It only returns the latest state.
- **Patch ops address arrays by index, such as `/CARDS/123/c`, not by id.**
  Indices shift when an entry is removed; v013 removes 4 cards. Any
  history or provenance code must resolve the index to an id *before*
  applying each op.
- **Dates in the data are Thai-formatted**, such as `20 ก.ย. 2026` (a Thai
  month abbreviation followed by a CE year). Examples: `PATCH.metaDate`,
  and the second string of each `PATCH.upcoming` entry
  (`"3/4 · Series 5 · Seasonal SNAP Pack — 29 ก.ย. 2026"`).

## Scope

**In:** the four parts below. They are read-only over the repo.

**Out:**

| excluded | reason |
|---|---|
| Changes to the app HTML, patches or manifest | this phase only reads data |
| Data validation such as missing fields or bad values | that is `data-integrity`, Phase 5 |
| Fetching from the web | that is `game-data-sync`, Phase 3 |
| Classifying changes as buff, nerf or new card | that is `game-update-intelligence`, Phase 4 |
| A stored snapshot or database | history is replayed from patches on demand |

## Part 1 — `scripts/game-data/history.js`

- **`listVersions() -> [{ version, fromVersion, releasedAt, source, summary, file }]`**
  - The baseline comes first, as
    `{ version: '2026.08.16.000', fromVersion: null, releasedAt: null, source: 'baseline (HTML)', summary: null, file: null }`.
  - Then one entry per patch, in manifest order.
  - Patch files not listed in the manifest are ignored. `verify-manifest.js`
    reports them.
- **`resolveVersion(v) -> string`** accepts a full version, a 3-digit
  suffix (`'015'`) or a number (`15`). An unknown version throws
  `Error('unknown version: <v>')`.
- **`loadAt(v) -> D`** returns SNAPDATA after applying every patch up to
  and including `v`. For the latest version the result must deep-equal
  `loadCurrent().D`.
- **`provenance() -> Map<entityKey, Array<{ version, op, field, source, releasedAt }>>`**,
  built by replaying all patches.
  - **Entity keys:**

    | patch path | entity key |
    |---|---|
    | `/CARDS/<i>…` | `card:<id>` |
    | `/LOCATIONS/<i>…` | `location:<id>` |
    | `/META/<i>…` | `meta:<id>` |
    | `/ARCHETYPES/<i>…` | `archetype:<id>` |
    | `/PATCH/<field>…` | `patch:<field>` |
    | `/MATCH/<key>…` | `match:<key>` |
    | `/SHOP…` | `shop` |
    | `/EXTRATAGS…` | `extratags` |

  - **Resolving the id.** For an array path, the id is read from the
    entry at index `i` in the state *before* the op is applied. For an
    `add` at `-` or at an index, the id comes from `op.value.id`.
  - **`field`** is the rest of the path after the entity, such as `c`,
    `hist/0` or `art`. It is `null` when the whole entity is added,
    replaced or removed.
  - An op whose path cannot be resolved to an id is recorded under the
    key `unresolved`, not dropped.

## Part 2 — `scripts/game-data/diff.js`

**`diffStates(A, B) -> { cards, locations, meta, archetypes, patch, other }`**

- `cards`, `locations`, `meta` and `archetypes` each hold
  `{ added: [id], removed: [id], changed: [{ id, fields: [{ field, before, after }] }] }`.
  - Entries are matched by `id`.
  - Fields are compared at the top level with JSON equality. `hist`
    counts as one field, and so does `vr`.
- `patch` holds `[{ field, before, after }]` for top-level `PATCH` fields.
- `other` holds `{ MATCH: bool, SHOP: bool, EXTRATAGS: bool, BUILD: bool }`,
  meaning whether each one changed at all.

This part reports structure only. It never interprets a change.

## Part 3 — `scripts/game-data/freshness.js`

**`parseThaiDate(s) -> 'YYYY-MM-DD' | null`**

- It finds the **last** `<day> <Thai month abbr> <year>` in the string.
- The months are ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.
- A year of 2400 or more is Buddhist Era: subtract 543.
- It returns `null` when nothing matches. It never guesses.

**`freshness(D, { now: Date, collectionFile?: string|null, latestPatch }) -> [{ item, status, detail }]`**

`status` is `fresh`, `stale`, `due` or `unknown`. The rules come from
CONVENTIONS §4:

| item | rule |
|---|---|
| `meta` | date parsed from `PATCH.metaDate`. Stale when older than 14 days. |
| `collection` | modified time of the game file. Stale when older than 3 days. `unknown` when the file is missing. |
| `upcoming:<name>` | date parsed from the entry. `due` when the date is today or earlier (UTC), so a release check is needed. `unknown` when there is no date. |
| `latestPatch` | the latest patch's `releasedAt` and its age in days. Always `fresh`; this row is information only. |

The default collection file is
`%LOCALAPPDATA%/../LocalLow/Second Dinner/SNAP/Standalone/States/nvprod/CollectionState.json`.
`now` is injectable so tests can fix the date.

## Part 4 — CLI `scripts/game-data/gdi.js` and the skill

The commands are:

- `versions` prints version, date, source and summary (trimmed).
- `card <query>` prints the current fields (`c/p/a/s/t`), `hist` and
  provenance rows.
  - `query` matches an exact id, then an exact name (case-insensitive),
    then a substring of the name.
  - When more than one card matches, it lists the candidates and exits 1.
    When none match, it exits 1.
- `at <version> card <query>` prints the same fields from `loadAt(version)`.
  If the card does not exist at that version, it says so and exits 1.
- `diff <vA> <vB>` prints the `diffStates` output, one line per change.
- `freshness` prints the freshness rows.

Every command takes `--json` and prints machine output (the same data,
unformatted).

**Skill.** `.claude/skills/game-data-intelligence/SKILL.md` follows the
CONVENTIONS §6 contract. It covers:
- when to use it: any question about cards, locations, meta or patch
  state, current or historical, and any "is this data current?" check
- the commands above
- the rule that other skills get game data through these functions or
  commands, not by reading the HTML or replaying patches themselves

**Other files updated:**
- `repo-map.md`: a *Scripts and tools* row for each new script. The
  repo-map check must still pass.
- `ECOSYSTEM.md`: `game-data-intelligence` becomes done.
- `NEXT-SESSION.md`: points to Phase 3.

## Validation (done when)

1. `node --test` passes with the new tests in
   `scripts/game-data/*.test.js`. The tests cover:
   - `resolveVersion` in all three input forms, plus an unknown version
   - `loadAt(latest)` deep-equals `loadCurrent().D`
   - `loadAt('014')` has 498 cards and no `TheInversion`
   - provenance on a synthetic fixture where a `remove` shifts indices,
     so a later `/CARDS/1/c` op is attributed to the right id
   - on real data, provenance of `card:TheInversion` is exactly one row:
     version `…015`, op `add`, field `null`
   - `diffStates(loadAt('014'), loadAt('015'))` equals: cards.added
     `['TheInversion']`, nothing removed or changed, and patch fields
     exactly `upcoming` and `dataVersion`
   - `parseThaiDate` on `'20 ก.ย. 2026'`, on the last date in an upcoming
     string, on a BE year, and on garbage (which gives `null`)
   - `freshness` with a fixed `now`: stale meta, a `due` upcoming entry,
     a missing collection file giving `unknown`
2. `node scripts/game-data/gdi.js freshness` run today shows Scarlet Witch
   Queen of Chaos as `due`.
3. `node scripts/repo-tools/check-repo-map.js` passes.

## Risks

- **Id-less entries.** An entity without an `id` makes provenance fall
  back to the `unresolved` key. Tests assert that the real data produces
  zero unresolved rows.
- **Replay cost grows with patches.** It is linear. At about 20 ms for 15
  patches, it is not a concern for a long time.

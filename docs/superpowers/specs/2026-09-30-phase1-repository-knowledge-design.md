# Phase 1 — Repository Knowledge, shared conventions, ecosystem map

Date: 2026-09-30. Status: approved in chat, pending spec review.
Brief: [`docs/briefs/2026-09-26-master-skill-ecosystem.md`](../../briefs/2026-09-26-master-skill-ecosystem.md)
(§2 repository first, §26 skill contract, §29 phase order, §30 do not overengineer).
Handoff: [`docs/briefs/NEXT-SESSION.md`](../../briefs/NEXT-SESSION.md).

## Goal

Give every future Marvel Snap skill a cheap, trustworthy answer to "how does
this app work?" plus one set of shared rules, and lay out how all 26 skills
map onto what already exists. It is the foundation the brief's §29 puts
first.

## Reality this design rests on

- The app is one static file, `marvel-snap-deck-builder.html` (about 3,000
  lines, 1.6 MB). Line 331 is a single 1.38 MB line holding
  `window.SNAPDATA`. There is no backend, database or API. GitHub Pages
  serves it from `main`.
- "Skills" are Claude Code skills under `.claude/skills/<name>/`, meaning
  instructions plus Node scripts that Claude runs. They are not app services.
- Agent 1 of `marvel-snap-deck-builder` already does repository analysis,
  but it rescans the 1.6 MB file on every run. The result is discarded, and
  each rescan costs quota.
- `.claude/skills/marvel-snap-deck-builder/rules.md` already holds shared
  rules: UNKNOWN, game rules and the output envelope. Only that one skill
  uses them.

## Scope

In: the four parts below. Out: every other skill of the 26. The only change
to the existing deck-builder skill is the Agent 1 change in Part 4. No
changes to the app HTML.

## Part 1 — skill `repository-knowledge`

`.claude/skills/repository-knowledge/`

- `SKILL.md` covers:
  - **When to use it:** before any task that reads or changes the app,
    patches or scripts, and whenever another skill needs repository context.
  - **Step 1:** run `node scripts/repo-tools/check-repo-map.js`.
  - **Step 2:** on pass, answer from `repo-map.md`. On fail, the script
    names the stale sections. Re-read only that part of the code, update
    `repo-map.md`, and rerun the check until it passes.
  - **Reading the HTML:** never open line 331 whole. Use grep to find a
    function, then read with offsets around the match.
- `repo-map.md`, the map. It is written for agents: dense, factual, with
  anchors as function or identifier names rather than line numbers, which
  shift with every edit. It has these sections:
  1. **Overview.** One static file, GitHub Pages, no backend, and the
     `extension/` for collection sync.
  2. **Routes.** A table of the 16 `V.<route>` views, what each shows, and
     the data it reads.
  3. **Data.** The `window.SNAPDATA` keys and each one's meaning. Card
     fields (`id`, `n`, cost, power, text, `hist` …). The indices
     `byId`/`byName`.
  4. **Patch system.** `manifest.json`, SHA-256 over the LF git blob,
     runtime apply plus the IndexedDB snapshot, and `current-state.js` as
     the offline equivalent. Points to `docs/PATCH_UPDATE_PLAYBOOK.md`
     rather than repeating it.
  5. **Collection.** The `col` Set and the localStorage keys in `K`. The
     sources are extension `postMessage`, manual import in settings and
     clicks in the collection view. The game's `CollectionState.json`, and
     that it reflects whichever account is logged in.
  6. **Decks.** The 12-card rule and the unique-id guard. The deck code is
     base64 of `{Name,Cards:[{CardDefId}]}` (`deckCode`/`parseDeckCode`),
     and the import box accepts it. `V.recommend` and `buildDeck` logic.
  7. **Scripts and tools.** `verify-manifest.js`, `scripts/patch-tools/*`,
     `scripts/deck-tools/*`, `scripts/lib/*` and `scripts/build-shop-patch.js`.
     One line each: what it does and when to run it.
  8. **Known hazards.** The CRLF/autocrlf SHA mismatch (the v009 incident,
     `.gitattributes`). CDN propagation lag after a push. Account switches
     in the game file. The 1.38 MB line.
  9. **Facts block.** A fenced block tagged `json repo-facts` that the
     check script compares against the code (Part 2).
- Seed content comes from the 2026-09-26 Agent 1 output, which has no user
  data. Every claim is re-verified against the code while writing.

## Part 2 — `scripts/repo-tools/check-repo-map.js`

It extracts facts from the repo and checks `repo-map.md` against them.
Node only, no dependencies, and it uses `current-state.js` exports where
useful.

**Structural facts.** A mismatch in any of these gives exit 1:

| Fact | How it is extracted |
|---|---|
| `routes` | regex `V\.(\w+)\s*=\s*function` over the HTML |
| `snapdataKeys` | top-level keys of the baseline SNAPDATA (`extractBaselineSnapdata`) |
| `storageKeys` | the `var K={...}` object literal (key → string) |
| `scripts` | tracked `*.js` under `scripts/` plus `verify-manifest.js` (git ls-files) |

**Anchor checks.** A failure gives exit 1:

- Every backticked identifier in `repo-map.md` written as `name()` must
  exist in the HTML as `function name` or `name=function`, or in a named
  script file.
- Every backticked path that looks like a repo path must exist.

**Informational facts.** These are printed and never fail, because every
data patch changes them: card count, location count, latest patch version
and patch file count.

**Output.** The script prints `PASS` or a list of
`STALE <section>: expected X, found Y`.

**Flags.**
- `--facts` prints the freshly extracted facts block to paste into
  `repo-map.md`.
- `--json` gives machine output for other skills.

The module exports its pure functions: `extractFacts(html, files)`,
`parseFactsBlock(md)`, `diffFacts(expected, actual)` and
`findAnchors(md)`.

**Tests.** `scripts/repo-tools/check-repo-map.test.js`, run with
`node --test`, in the same style as `scripts/lib/shop-parse.test.js`. They
cover:
- extraction on a small synthetic HTML fixture
- diff reporting: added route, removed route, changed storage key
- anchor detection, for both a missing function and a missing path
- facts-block parsing

## Part 3 — shared conventions: `docs/skills/CONVENTIONS.md`

This file is for all 26 skills. It sits outside `.claude/skills/` so it is
not mistaken for a skill, and every `SKILL.md` links to it.

1. **Facts come from files.** Scripts own facts; agents reason. Data
   precedence: `current-state.js` output (baseline plus patches) beats
   baseline HTML, which beats memory. Card names are used exactly as in the
   data.
2. **Status vocabulary** (brief §3): `UNKNOWN` means absent,
   `UNVERIFIED` means uncertain, and `CONFLICTING_SOURCES` means sources
   disagree, in which case keep both claims with attribution.
3. **Source trust** (brief §10): OFFICIAL, TRUSTED, COMMUNITY, DATAMINED,
   RUMORED and UNKNOWN. RUMORED is never treated as confirmed, and
   DATAMINED never as official. There is a short table of the sources
   used today (the official site/X and marvelsnapzone, with its known
   Status-field lag) and their default trust level.
4. **Freshness** (brief §11): external facts carry `source`,
   `source_date` and `verified_at`. There is a rule for when data counts as
   stale.
5. **Game rules** you may rely on, moved verbatim from `rules.md`.
   Anything else is UNKNOWN.
6. **Skill contract** (brief §26): each `SKILL.md` states Purpose, Inputs,
   Outputs, Dependencies, Failure conditions and Validation.
7. **Output envelope** (brief §27), merged with the existing envelope:
   `{skill, status, confidence, inputs:{dataVersion,…}, findings,
   recommendations, issues, handoff, sources}`. The deck-builder agents
   keep their current field names, and the new fields are optional for
   them, so saved runs stay readable.
8. **Repo rules.** Commit only and never push. Use a feature branch for
   multi-step work. User data (collection, run outputs) stays outside the
   public repo, in `Desktop\AI\Marvel Snap\deckbuild-runs\`. Check plan
   usage during heavy work and warn before any window passes 95%.

`rules.md` in the deck-builder skill keeps only its pipeline-specific
parts: the `cards.json` ownership rule, the Collection and Strategy
sections and its own envelope note. For everything else it links to
CONVENTIONS.md, so no rule exists in two places.

## Part 4 — `docs/skills/ECOSYSTEM.md` and the Agent 1 change

**ECOSYSTEM.md.** One table row per skill, 26 rows:

| skill | brief § | phase | reuse / extend / new | builds on (existing file) | depends on | status |

It also includes:
- the §7 routing examples translated into skill chains
- how the deck-builder's Agents 1–7 split into skills in later phases
- a short list of brief features that do not fit a no-backend static app,
  each marked **ADAPTED** (for example "notification system" becomes an
  event list in a patch or report) or **DEFERRED** with the reason

It is updated at the end of every phase. It replaces the ad-hoc table in
`NEXT-SESSION.md`, which is then trimmed to point here.

**Agent 1 change.** `agents/1-repository.md` inputs become:
- `repository-knowledge` (run the check, read `repo-map.md`)
- `context.json`

The agent verifies claims from the map. It opens the HTML only for a claim
the map does not cover, or when the check fails. The handoff shape does
not change, so Agents 2–7 are untouched.

## Validation (done when)

1. `node --test scripts/repo-tools/` passes.
2. `node scripts/repo-tools/check-repo-map.js` passes on the real repo.
3. **Drift test.** In a scratch copy, rename a route in the HTML and edit a
   storage key. The check fails and names both. Removing a referenced
   function also fails.
4. **Agent 1 dry run.** Using sonnet on the saved 2026-09-29 run dir, the
   updated Agent 1 produces `01-repository.json` with every `context.json`
   claim CONFIRMED or REFUTED. It reads fewer HTML bytes than before; its
   own report of what it opened is enough evidence.
5. `validate-decks.js` still passes on the saved 2026-09-29
   `05-decks.json`. This is a regression check that nothing shared broke.
6. ECOSYSTEM.md has all 26 skills, and each has a phase and a
   reuse/extend/new verdict.

## Risks

- **The map drifts from the code, and prose drifts silently.** The check
  covers only structure and anchors. Mitigation: the anchor checks catch
  renamed functions, and the SKILL.md tells agents to report any map claim
  that turns out wrong.
- **Scope creep into later phases.** ECOSYSTEM.md only plans the other
  skills. It builds nothing for them.


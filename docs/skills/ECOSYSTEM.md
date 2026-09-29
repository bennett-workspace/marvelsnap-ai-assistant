# Marvel Snap skill ecosystem

This is the plan for 26 Claude skills, built from the brief
[`docs/briefs/2026-09-26-master-skill-ecosystem.md`](../briefs/2026-09-26-master-skill-ecosystem.md).
Shared rules: [`CONVENTIONS.md`](CONVENTIONS.md). How the app works: the
`repository-knowledge` skill.

The app is one static HTML page with no backend, so each skill is Claude
instructions plus Node scripts under `scripts/`, not an app service. Data
reaches the app only as verified patches (`docs/PATCH_UPDATE_PLAYBOOK.md`).

**Verdicts:**
- **REUSE**: wrap what exists and add little.
- **EXTEND**: existing pieces cover part of the job.
- **NEW**: nothing exists yet.

The phases follow brief §29.

## Skills

| skill | brief § | phase | verdict | builds on | depends on | status |
|---|---|---|---|---|---|---|
| `repository-knowledge` | S01 | 1 | EXTEND | deck-builder Agent 1; `repo-map.md`, `check-repo-map.js` | — | done |
| `game-data-intelligence` | S02 | 2 | EXTEND | `current-state.js` (`loadCurrent`), SNAPDATA, card `hist` | repository-knowledge | planned |
| `game-data-sync` | S03 | 3 | REUSE | `PATCH_UPDATE_PLAYBOOK.md`, `verify-manifest.js`, `build-test-html.js`, `build-shop-patch.js` | game-data-intelligence, data-integrity | planned |
| `game-update-intelligence` | S04 | 4 | EXTEND | patch diffs (old vs new `loadCurrent`), `PATCH.upcoming` | game-data-intelligence | planned |
| `card-database-intelligence` | S05 | 4 | EXTEND | `CARDS[]` incl. `hist`, `arch`, `vr` | game-data-intelligence | planned |
| `variant-tracker` | S06 | 4 | NEW | `CARDS[].vr` (url, bundle, artist), `SHOP.bundles`; no status/source model yet | card-database-intelligence, news-intelligence | planned |
| `season-release-tracker` | S07 | 4 | EXTEND | `PATCH.season`, `PATCH.upcoming`, playbook release checks | game-data-intelligence | planned |
| `patch-tracker` | S08 | 4 | REUSE | playbook steps, patch files as version history | game-data-sync | planned |
| `ota-tracker` | S09 | 4 | EXTEND | `hist` balance tuples; impact via archetypes/meta | card-database-intelligence | planned |
| `location-intelligence` | S10 | 4 | NEW | `LOCATIONS[]` (effect text), `ARCHETYPES[].goodLoc/badLoc` | game-data-intelligence | planned |
| `data-integrity` | S24 | 5 | EXTEND | `verify-manifest.js`, `validatePatchStructure` logic, playbook dedup step | game-data-intelligence | planned |
| `synergy-knowledge-graph` | S11 | 6 | EXTEND | deck-builder Agent 4, `ARCHETYPES[].combo`, card tags `t` | card-database-intelligence | planned |
| `collection-intelligence` | S15 | 7 | EXTEND | deck-builder Agent 2, `export-inputs.js` | card-database-intelligence, archetype-intelligence | planned |
| `collection-progress` | S16 | 7 | NEW | app collection view, `collLevel`; needs dated snapshots for growth | collection-intelligence | planned |
| `archetype-intelligence` | S12 | 8 | EXTEND | deck-builder Agent 3, `ARCHETYPES[]` | synergy-knowledge-graph | planned |
| `meta-intelligence` | S13 | 8 | EXTEND | `META[]` (tier, cube, wr, games), archived `arch-*` lists for trends | game-data-intelligence | planned |
| `counter-matchup-analyzer` | S14 | 8 | NEW | `MATCH` scores, `ARCHETYPES[].strong/weak` | archetype-intelligence, meta-intelligence | planned |
| `professional-deck-builder` | S19 | 9 | EXTEND | deck-builder Agent 5, `validate-decks.js` | collection, archetype, synergy, meta, counter | planned |
| `deck-simulator` | S20 | 10 | NEW | — (draw/curve/energy model over card text; no effect engine) | card-database-intelligence | planned |
| `deck-validator` | S21 | 11 | EXTEND | deck-builder Agent 6, `validate-decks.js` hard rules | professional-deck-builder, deck-simulator | planned |
| `deck-comparison` | S22 | 11 | NEW | validator and simulator outputs | deck-validator | planned |
| `deck-upgrade-planner` | S17 | 12 | EXTEND | deck-builder upgrade decks and substitutes | collection-intelligence, professional-deck-builder | planned |
| `wishlist-watchlist` | S18 | 13 | NEW | — (watch list file plus matcher over update events) | game-update-intelligence | planned |
| `news-intelligence` | S23 | 13 | NEW | playbook web checks, source trust table | game-data-sync | planned |
| `ux-report-generator` | S25 | 14 | EXTEND | deck-builder Agent 7, `render-report.js` | any analysis skill | planned |
| `marvel-snap-orchestrator` | §6–8 | 14 | EXTEND | deck-builder `SKILL.md` orchestration | all | planned |

Phase 15 is testing and a final review of the whole set (brief §24, §28).

## Routing

The brief §7 examples, written as skill chains:

- **"Build me a deck":** repository-knowledge → collection-intelligence
  ∥ card-database-intelligence → archetype-intelligence →
  synergy-knowledge-graph → professional-deck-builder → deck-validator
  (up to 3 revisions) → ux-report-generator.
- **"What's new?":** game-data-intelligence → game-update-intelligence →
  patch-tracker ∥ ota-tracker ∥ season-release-tracker ∥ variant-tracker
  ∥ news-intelligence → ux-report-generator.
- **"What new cards are coming?":** game-data-intelligence →
  season-release-tracker → card-database-intelligence →
  game-update-intelligence → ux-report-generator.
- **"What variants are coming?":** variant-tracker →
  game-data-intelligence → news-intelligence → ux-report-generator.
- **"What should I upgrade?":** collection-intelligence →
  deck-upgrade-planner → card-database-intelligence → meta-intelligence →
  synergy-knowledge-graph → ux-report-generator.
- **"Is this deck good?":** deck-validator → synergy-knowledge-graph →
  deck-simulator → meta-intelligence → counter-matchup-analyzer →
  ux-report-generator.

## Deck-builder split

`.claude/skills/marvel-snap-deck-builder/` keeps working unchanged until
its parts have replacements. Each agent moves to a skill:

| agent | becomes |
|---|---|
| 1 Repository Analyst | `repository-knowledge` (done: Agent 1 now reads the repo map) |
| 2 Collection Analyst | `collection-intelligence` |
| 3 Card & Archetype Analyst | `archetype-intelligence` |
| 4 Synergy & Combo Analyst | `synergy-knowledge-graph` |
| 5 Deck Builder | `professional-deck-builder` |
| 6 Deck Validator | `deck-validator` |
| 7 UX / Report Generator | `ux-report-generator` |
| orchestrator `SKILL.md` | `marvel-snap-orchestrator` |

The shared tools in `scripts/deck-tools/` stay where they are and serve
the new skills.

## Adapted or deferred

Some features in the brief assume a server or live infrastructure that
this app does not have:

| brief feature | decision | why |
|---|---|---|
| Notification events (§13) | ADAPTED | No push channel. Events become a list in the update report and, when useful, a `notice` in the next data patch that the app already shows. |
| Database and storage layer (§9) | ADAPTED | Versioned data already exists: every patch file is a version, and card `hist` holds balance history. History comes from replaying patches, not from a new database. |
| Sync jobs and services (§S03) | ADAPTED | Claude runs the playbook when asked. Scheduled runs are possible later with Claude scheduled tasks, but are not planned. |
| User-facing dashboard (§19) | ADAPTED | Reports are Thai HTML pages (artifacts). Changing the app UI needs its own spec per feature. |
| Live game and news fetching (§S23) | ADAPTED | Web search and fetch at run time, with the source trust levels. No crawler or stored feed. |
| Deck simulation of card effects (§S20) | DEFERRED (partial) | A full effect engine for about 500 cards is out of scope. The simulator models draws, energy and curve, and combo odds from card presence; effect outcomes stay agent judgment. |
| Pick rate and popularity (§S13) | DEFERRED | The meta source gives tier, cube and win rate only. These are marked UNKNOWN until a source provides them. |

## Updating this file

At the end of every phase:
1. set that phase's skills to `done`
2. correct any verdict that turned out wrong
3. move an item out of "Adapted or deferred" if the decision changed

`docs/briefs/NEXT-SESSION.md` points here for what comes next.

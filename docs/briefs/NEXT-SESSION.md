# Next session — pending work

Two jobs are queued. Check plan usage first (`get_usage`); warn the user before
any window passes 95% used.

## 1. Build the skill ecosystem

Brief: [`2026-09-26-master-skill-ecosystem.md`](2026-09-26-master-skill-ecosystem.md).
The user wants it split into **separate skills**, one folder each, under
`<repo>/.claude/skills/`:

```
marvel-snap-orchestrator      repository-knowledge        game-data-intelligence
game-data-sync                game-update-intelligence    card-database-intelligence
variant-tracker               season-release-tracker      patch-tracker
ota-tracker                   location-intelligence       synergy-knowledge-graph
archetype-intelligence        meta-intelligence           counter-matchup-analyzer
collection-intelligence       collection-progress         deck-upgrade-planner
wishlist-watchlist            news-intelligence           professional-deck-builder
deck-simulator                deck-validator              deck-comparison
data-integrity                ux-report-generator
```

The brief's own rule applies: reuse what exists, extend it, build only what is
missing. Read the brief's §2 (repository first) and §30 (do not overengineer)
before designing.

### Reality the brief does not know

- The app is **one static HTML file on GitHub Pages — no backend, no database,
  no API.** "Skills" here are Claude skills (instructions + Node scripts run by
  Claude), not app services. Anything the brief calls a service, sync job, or
  notification system is either a Claude-run script or new client-side UI.
- Data updates ship as JSON-Patch files verified by SHA-256 — see
  `docs/PATCH_UPDATE_PLAYBOOK.md`. The patch/OTA/season/card trackers and
  game-data-sync should wrap that playbook, not replace it.

### Existing pieces to fold in, not duplicate

| Existing | Becomes / feeds |
|---|---|
| `docs/PATCH_UPDATE_PLAYBOOK.md` | game-data-sync, patch-tracker, ota-tracker, season-release-tracker, game-update-intelligence |
| `scripts/patch-tools/current-state.js` | game-data-intelligence, card-database-intelligence (history lives in each card's `hist`) |
| `verify-manifest.js` | data-integrity |
| `.claude/skills/marvel-snap-deck-builder/` (7-agent pipeline) | split into marvel-snap-orchestrator, repository-knowledge, collection-intelligence, archetype-intelligence, synergy-knowledge-graph, professional-deck-builder, deck-validator, ux-report-generator |
| `scripts/deck-tools/` (export-inputs, validate-decks, render-report) | shared tools for the deck skills |
| App data: `CARDS`, `LOCATIONS`, `ARCHETYPES`, `META`, `MATCH`, `SHOP` | the data layer every skill reads |

Genuinely new: variant-tracker (app has variant art but no status/source
model), location-intelligence, counter-matchup-analyzer, collection-progress,
deck-upgrade-planner, wishlist-watchlist, news-intelligence, deck-simulator,
deck-comparison.

Expect this to span several sessions. Follow the brief's §29 phase order and
agree scope per phase with the user.

## 2. Deck-builder run — done 2026-09-29

Finished for the account now logged in on PC (282 owned). Outputs are in
`C:\Users\natta\Desktop\AI\Marvel Snap\deckbuild-runs\2026-09-29\`. The
game reports `TheInversion` as owned, but the app data has no card with that
id. The next data patch should add it.

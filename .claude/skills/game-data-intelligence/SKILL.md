---
name: game-data-intelligence
description: Current and historical Marvel Snap game data — cards, locations, meta, patch state; what changed between versions; where a fact came from; what is stale. Use for any game-data question and before any skill relies on data being current.
---

# Game Data Intelligence

Shared rules: [`docs/skills/CONVENTIONS.md`](../../../docs/skills/CONVENTIONS.md).
For how the app works, use `repository-knowledge`.

- **Purpose:** The one place to get game data, whether current or at any
  past version. It also answers "where did this fact come from?" and
  "is this still current?".
- **Inputs:** the repo (HTML baseline, `manifest.json`, `patches/`) and
  the game's `CollectionState.json`, which it reads for freshness only.
- **Outputs:** CLI text, or JSON with `--json`, and the functions below.
- **Dependencies:** `scripts/patch-tools/current-state.js`
  (`extractBaselineSnapdata`, `applyOps`).
- **Failure conditions:**

  | condition | exit code |
  |---|---|
  | unknown version | 2 |
  | bad command | 2, and prints usage |
  | card not found, or found more than once | 1, and lists the candidates |

- **Validation:** `node --test "scripts/game-data/*.test.js"`.

## Rule for every other skill

Get game data through these commands or functions. Never read the SNAPDATA
blob in the HTML, and never replay patches yourself. Patch ops address
arrays by index, so a hand-rolled replay attributes changes to the wrong
card once any entry has been removed.

## Commands

Run all of them from the repo root. Add `--json` to any of them for
machine output.

```bash
node scripts/game-data/gdi.js versions                   # every data version with its date, source, summary
node scripts/game-data/gdi.js card "The Inversion"       # current stats, ability, balance history, provenance
node scripts/game-data/gdi.js at 014 card Vulture        # the card as it was at v014
node scripts/game-data/gdi.js diff 013 014               # what changed between two versions
node scripts/game-data/gdi.js freshness                  # stale meta, old collection, upcoming cards past their date
```

**How versions are written.** A version can be given in full
(`2026.08.16.014`), as a 3-digit suffix (`014`) or as a number (`14`). The
baseline is `000`.

**How card queries match.** The query is tried in this order:
1. an exact id
2. an exact name, ignoring case
3. a name substring

If the substring step matches more than one card, the command lists the
candidates.

## Functions (Node)

- `scripts/game-data/history.js`:
  - `listVersions()`, `resolveVersion(v)` and `loadAt(v)`. `loadAt` returns
    an independent copy on every call.
  - `provenance()`, which returns a `Map` from an entity key (`card:<id>`,
    `location:<id>`, `meta:<id>`, `patch:<field>`, `meta` for a
    whole-collection replace …) to its rows `{version, op, field, source,
    releasedAt}`.
- `scripts/game-data/diff.js`: `diffStates(A, B)`, which reports structure
  only.
- `scripts/game-data/freshness.js`: `parseThaiDate(s)` and
  `freshness(D, {now, collectionFile, latestPatch})`.

## Reading the results

- **`diff` reports facts, not meaning.** Whether a change is a buff, a nerf
  or a release is decided by `game-update-intelligence`.
- **`due` on an upcoming card means only that its date has passed.** It
  does not mean the card is released. Confirm the release with an
  independent source first (`docs/PATCH_UPDATE_PLAYBOOK.md` §3).
- **Stale data has to be reported.** When `meta` or `collection` is
  `stale`, tell the user before giving advice that depends on it.
- **Provenance `source` comes from the patch file.** Apply the trust level
  from CONVENTIONS §3 when citing it.

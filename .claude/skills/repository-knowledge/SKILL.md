---
name: repository-knowledge
description: How the Marvel Snap deck-builder app is built — routes, SNAPDATA, patches, collection sync, deck codes, scripts, hazards. Use before reading or changing the app, patches or scripts, and whenever another Marvel Snap skill needs repository context.
---

# Repository Knowledge

Shared rules: [`docs/skills/CONVENTIONS.md`](../../../docs/skills/CONVENTIONS.md).

- **Purpose:** Give every skill a fast, checked answer to "how does this app
  work?" without rescanning a 1.6 MB HTML file.
- **Inputs:** the repo.
- **Outputs:** answers grounded in [`repo-map.md`](repo-map.md). A caller
  that needs them in a handoff cites `repo-map.md#<section>`.
- **Dependencies:** Node, plus
  `scripts/repo-tools/check-repo-map.js`.
- **Failure conditions:** the check exits 1 (STALE) or 2 (the map is
  missing or unreadable).
- **Validation:** the check passes after any change to the map.

## Steps

1. **Check.** Run this from the repo root:
   ```bash
   node scripts/repo-tools/check-repo-map.js
   ```
   It prints the current counts (cards, locations, latest patch) and then
   `PASS`, or one `STALE <section>: …` line per problem.
2. **PASS:** answer from `repo-map.md`. Take the current counts from the
   check's first line, not from the map.
3. **STALE:** fix the map before relying on it.
   - A facts section (`routes`, `snapdataKeys`, `storageKeys`, `scripts`)
     is stale: run with `--facts` and replace the `json repo-facts` block
     wholesale. Then re-read only the code behind the changed item and
     update the prose section that describes it.
   - `anchors` is stale: a function or path the map names is gone. Grep
     for the new name, then fix the map.
   - Rerun the check until it prints `PASS`. Commit the map together with
     the code change that caused the drift.
4. **The map is silent or wrong:** read the code, answer, and add the fact
   to the map. If a map claim was wrong, fix it and tell the user what was
   wrong.

## Reading the HTML

Never open line 331 of `marvel-snap-deck-builder.html` whole. It is about
1.38 MB of data on one line. Instead:

- Grep for an identifier, then read around the match with offsets.
- Take card, location, meta and patch data from `loadCurrent()` in
  `scripts/patch-tools/current-state.js`, not from the HTML.

`--json` prints `{ok, info, problems}` for scripts that call the check.

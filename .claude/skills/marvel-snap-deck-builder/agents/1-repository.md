# Agent 1 — Repository Analyst

Senior software architect reverse-engineering the app so the builders know
what the data and UI really are. Read-only: you change no file except your
output.

## Inputs

- `<repo>/marvel-snap-deck-builder.html` — the whole app: one static file,
  data in `window.SNAPDATA`, UI in plain JS views (`V.<route>`).
- `<repo>/patches/`, `<repo>/manifest.json` — data updates applied at runtime.
- `<repo>/scripts/patch-tools/current-state.js` — merges baseline + patches.
- `<runDir>/context.json` — the claims you verify.

The data blob is one line over a million characters. Search with grep for
function names; read around matches with offsets. Opening that line whole
wastes your context.

## Work

1. **Verify every claim in `context.json`** — deck size, duplicate rule,
   deck-code format, data version — against the code. Mark each CONFIRMED
   or REFUTED with `file:line` evidence.
2. **Map the flow**: user → UI → state → data → deck logic → result. Name
   the real source of cards, collection (`col` Set, localStorage key,
   CollectionState sync), saved decks, and card metadata.
3. **Existing deck logic**: how `V.recommend` and the builder score and
   pick decks today, and what the deck-import box accepts. The new decks
   must be importable through it.
4. **Integration points and risks** for delivering decks into this UI.

Done when every `context.json` claim has a verdict with evidence and the
four sections are filled.

## Handoff shape

```json
{
  "claims": [{ "claim": "", "verdict": "CONFIRMED|REFUTED", "evidence": "file:line", "note": "" }],
  "dataSources": { "cards": "", "collection": "", "decks": "", "metadata": "" },
  "uiFlow": "",
  "existingDeckLogic": "",
  "importPath": "how a user gets a generated deck into the app",
  "integrationPoints": [],
  "risks": []
}
```

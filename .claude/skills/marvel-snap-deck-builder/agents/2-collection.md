# Agent 2 — Collection Analyst

Judge the user's collection by **strategic usefulness**, not rarity.

## Inputs

`<runDir>/cards.json`, `collection.json`, `archetypes.json`,
`meta-decks.json`, `01-repository.json`.

## Work

1. Counts: owned, missing, by cost and by series.
2. For each archetype in `archetypes.json`: owned core vs missing core,
   owned flex. Call it **Strong**, **Playable**, **Incomplete**, or
   **Unavailable**, with the reason.
3. Archetypes the collection supports that the table does not name —
   discover them from the owned cards' abilities.
4. Strategic roles the collection is thin on (e.g. no location control, no
   early tech, few 6-cost finishers).
5. **Important missing cards**: the missing cards that would unlock or
   upgrade the most archetypes. Rank them, naming what each unlocks.
6. From `meta-decks.json`: meta lists owned outright and lists missing
   ≤3 cards.

Done when every archetype in `archetypes.json` has a verdict and every
"important missing" card names the archetypes it unlocks.

## Handoff shape

```json
{
  "counts": { "owned": 0, "missing": 0, "ownedByCost": {}, "missingBySeries": {} },
  "archetypes": [{ "id": "", "verdict": "Strong|Playable|Incomplete|Unavailable", "ownedCore": [], "missingCore": [], "ownedFlex": [], "reason": "" }],
  "discoveredArchetypes": [{ "name": "", "cards": [], "reason": "" }],
  "weakAreas": [],
  "importantMissing": [{ "card": "", "unlocks": [], "why": "" }],
  "metaOwned": [], "metaNearlyOwned": [{ "name": "", "missing": [] }]
}
```

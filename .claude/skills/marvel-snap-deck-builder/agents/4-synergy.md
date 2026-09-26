# Agent 4 — Synergy & Combo Analyst

Specialist in card interactions. A combo is two or more cards whose
abilities change each other's outcome — cards that merely fit on the same
turn are a curve, not a combo.

## Inputs

`<runDir>/cards.json`, `02-collection.json`, `03-archetypes.json`.

## Work

Focus on archetypes the Collection Analyst rated Strong or Playable, plus
the upgrade targets it ranked. For each:

1. **Pairs** (A + B) and **triples** (A + B + C) with a real interaction.
2. **Chains** (A → B → C → D) and a **turn sequence** (T2 … T6) that
   spends energy sensibly.
3. For every combo: required cards, required conditions (location, board
   state, reveal order), total energy, the turn it lands, expected outcome
   in Power or effect, **reliability** (high / medium / low, with why),
   an **alternative line**, and **counterplay** the opponent has.
4. Verify each interaction from the ability text: check reveal order,
   location limits (4 cards), and whether a trigger's condition can
   actually be met on that turn. Mark any interaction you cannot confirm
   from text as UNKNOWN and leave it out of the combos list.

Done when every combo has all fields filled and a text-verified mechanism.

## Handoff shape

```json
{
  "byArchetype": [{
    "archetype": "",
    "combos": [{
      "name": "", "cards": [], "type": "pair|triple|chain",
      "conditions": "", "energy": 0, "turn": "", "outcome": "",
      "reliability": "high|medium|low", "reliabilityWhy": "",
      "alternative": "", "counterplay": "", "allOwned": true
    }],
    "turnSequence": { "T1": "", "T2": "", "T3": "", "T4": "", "T5": "", "T6": "" }
  }],
  "unknowns": []
}
```

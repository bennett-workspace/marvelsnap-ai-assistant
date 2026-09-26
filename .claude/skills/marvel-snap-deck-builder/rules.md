# Rules every agent follows

You are one agent in a pipeline. The orchestrator owns the objective; do
your role and write your output file. You never dispatch other agents.

## Facts come from files

- `cards.json` is the only source for a card's cost, power, ability text,
  series, and ownership (`owned: true|false`). Stats are current and
  post-OTA. Many cards postdate your training — read the ability text; your
  memory of a card is a hypothesis, the file is the fact.
- Use card names **exactly** as spelled in `cards.json`.
- When a fact you need is absent, write `UNKNOWN` and say what is missing.
  If it decides whether a deck works, stop that deck and report it.

## Collection

Every card you mention is **OWNED** or **MISSING** per `cards.json`. Upgrade
advice names the missing card, what it replaces, and why.

## Strategy

Build around a plan: core + synergy + combo + curve + interaction + win
condition. Every card earns its slot with a stated purpose; a card with no
purpose is replaced. Playability beats theory — a line that needs five
specific cards in hand on curve is a hope, not a plan.

`meta-decks.json` is real ranked data (tier, cube average, win rate). Treat
a meta list the user owns, or nearly owns, as strong evidence an archetype
works now; still explain *why* it works.

## Game rules you may rely on

- Deck = exactly 12 cards, one copy each.
- 6 turns (some locations change this); energy = turn number unless a card
  or location says otherwise.
- Win 2 of 3 locations by total Power; a tied location goes to neither. If
  locations do not decide it, higher total Power across all locations wins.
- Cards are played face down, then revealed. The player winning more
  locations reveals first (tie → higher total Power; still tied → random).
  "On Reveal" fires when the card is revealed.
- 4 cards per location per side.

Anything beyond these and the card text is a mechanic you must mark UNKNOWN
rather than assume.

## Output envelope

Write JSON to the file the orchestrator names:

```json
{
  "agent": "<your role>",
  "status": "complete | partial | failed",
  "confidence": "high | medium | low",
  "findings": [],
  "recommendations": [],
  "issues": [],
  "handoff": {}
}
```

`handoff` carries what the next agent needs; your brief defines its shape.
Finish with a one-paragraph plain-text summary as your final message.

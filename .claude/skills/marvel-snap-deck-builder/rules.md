# Rules every agent follows

Read [`docs/skills/CONVENTIONS.md`](../../../docs/skills/CONVENTIONS.md)
first. It holds the shared rules: facts from files, UNKNOWN, game rules and
the envelope. This file adds only what the deck pipeline needs.

You are one agent in a pipeline. The orchestrator owns the objective; do
your role and write your output file. You never dispatch other agents.

## Facts come from files

`cards.json` is the only source for a card's cost, power, ability text,
series, and ownership (`owned: true|false`). Stats are current and
post-OTA. If a fact you need is absent and it decides whether a deck
works, stop that deck and report it.

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

## Output

Write the envelope from CONVENTIONS.md §7 to the file the orchestrator
names, using `"agent": "<your role>"`. Your brief defines the `handoff`
shape. Finish with a one-paragraph plain-text summary as your final
message.

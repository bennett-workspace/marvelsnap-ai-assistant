---
name: marvel-snap-deck-builder
description: Build Marvel Snap decks from the user's real collection with a 7-agent pipeline (repository, collection, archetype, synergy, builder, validator, report). Use for "จัดเด็คจากการ์ดที่มี", decks I can play now, what cards to craft or upgrade next.
---

# Marvel Snap Deck Builder — Orchestrator

You are the orchestrator. You run the pipeline, move files between agents,
and own the quality gate. Agents reason about strategy; scripts own the
facts. Every agent reads [`rules.md`](rules.md) plus its own brief in
[`agents/`](agents/).

Principle: build the strongest **coherent strategy** the user can actually
play — never the twelve individually strongest cards.

## Paths

- Repo: `C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant`
- Skill: `<repo>/.claude/skills/marvel-snap-deck-builder/`
- Tools: `<repo>/scripts/deck-tools/`
- Run dir: `<scratchpad>/deckbuild-<YYYY-MM-DD>/` — every hand-off file lives
  here. Scratchpad is wiped between sessions; the run dir is per-run scratch.

## Resuming a paused run

Finished stage outputs are saved outside the scratchpad at
`C:\Users\natta\Desktop\AI\Marvel Snap\deckbuild-runs\<YYYY-MM-DD>\`
(kept out of the repo: the repo is public and these hold the user's
collection). To resume: copy that folder to a fresh run dir, run step 0
again, and compare the new `collection.json` owned count with the saved
one. Same count → skip every stage whose output file exists. Changed count
→ rerun from step 2; step 1 stays valid unless the app HTML changed.
Agent 3 judges cards on merit, so when only ownership changed, re-stamp
the `owned` flags in `03-archetypes.json` from `collection.json` with a
script instead of re-running it.

A drop in owned count or collection score means the game is logged into a
different account (cards are never lost). Ask the user which account to
build for before continuing.

Check plan usage before each stage; warn the user before any window
passes 95% used.

## Steps

### 0. Ground truth

```bash
node scripts/deck-tools/export-inputs.js "<runDir>"
```

Writes `cards.json`, `collection.json`, `meta-decks.json`,
`archetypes.json`, `matchups.json`, `context.json`. Done when it prints the
owned/missing counts. Report the collection file's modified time to the
user if it is older than 3 days — ownership may be stale; the user can
open the game (Steam PC) to refresh it. If it warns about owned ids missing
from app data, the app needs a data patch first (see
`docs/PATCH_UPDATE_PLAYBOOK.md`); continue, those cards count as UNKNOWN.

### 1. Repository Analyst → `01-repository.json`

Dispatch Agent 1 (sonnet). It works from the checked repo map of the
`repository-knowledge` skill, so this stage is cheap. Done when every claim
in `context.json` is marked CONFIRMED or REFUTED with evidence.

### 2 + 3. Collection Analyst ∥ Archetype Analyst

Dispatch both in **one message** (parallel). Agent 2 (opus) →
`02-collection.json`. Agent 3 (opus) → `03-archetypes.json`. Done when both
files exist and parse.

### 4. Synergy & Combo Analyst → `04-synergy.json`

Agent 4 (opus), reads 02 + 03. Done when every combo lists required cards,
energy, turn, reliability, counterplay.

### 5. Deck Builder → `05-decks.json`

Agent 5 (opus). Targets: **4–6 owned decks** of distinct archetypes, and
**3–4 upgrade decks** each needing the fewest missing cards possible
(prefer ≤3). Record the agent id — revisions resume it.

Then run the hard rules:

```bash
node scripts/deck-tools/validate-decks.js "<runDir>" 05-decks.json
```

A deck failing hard rules goes straight back to the builder with the
printed problems — do not spend a validator pass on it.

### 6. Deck Validator → `06-validation.json`

Agent 6 (opus, a fresh agent — never the builder). Reads
`05-decks.checked.json`. Returns PASS / REJECT per deck with problem,
reason, replacement.

**Revision loop.** For each REJECT: resume the builder with the validator's
findings verbatim, re-run `validate-decks.js`, then re-validate only the
revised decks. Max **3 cycles** per deck. After the third failure mark it
**UNRESOLVED** in the final report with the open problem — never present it
as valid.

### 7. UX / Report Generator → `07-report.json`

Agent 7 (sonnet). Reads the PASSing decks from the latest
`05-decks.checked.json` plus 02–04 and 06. Writes Thai user-facing content
in the schema in [`agents/7-report.md`](agents/7-report.md). Deck codes come
from `computed.deckCode` — copied, never regenerated.

```bash
node scripts/deck-tools/render-report.js "<runDir>/07-report.json" "<runDir>/report.html"
```

Publish `report.html` as an Artifact (it is the user's deck guide).

### 8. Quality gate

Check each before replying; any critical miss means the deck is withheld:

- [ ] `context.json` claims confirmed by Agent 1
- [ ] Owned and missing separated from `cards.json`, never from memory
- [ ] Every owned deck: `hardRules: PASS`, `computed.missing` empty
- [ ] Every upgrade deck: missing cards listed with a substitute and a reason
- [ ] Every deck: validator PASS, a stated win condition, every card a role
- [ ] Curve reviewed; primary / alternative / recovery lines present
- [ ] UNRESOLVED decks shown as unresolved
- [ ] Report is in Thai and a normal player can follow it

Reply with the artifact link, a short summary (decks you can play now,
top upgrade), and the collection freshness.

## Failure handling

When an agent fails or returns unusable output, record: agent, failure,
missing information, impact, recovery. Retry only when the retry changes
something (more context, a different model) — max 2. When a failure blocks
a deck, drop that deck and say why; keep the rest of the run.

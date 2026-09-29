# Conventions for every Marvel Snap skill

Every skill under `.claude/skills/` follows these rules and links here. A
skill's own files add only what is specific to that skill; they never
restate a rule from this page. The skill roadmap is in
[`ECOSYSTEM.md`](ECOSYSTEM.md).

## 1. Facts come from files

Scripts own facts, and agents reason about them. Game data comes from the
first source below that has it:

1. `loadCurrent()` in `scripts/patch-tools/current-state.js`: the baseline
   plus every patch. This is the current truth.
2. The baseline blob in the HTML. It is stale; use it only for historical
   questions.
3. Model memory. This is a hypothesis, never a fact: many cards postdate
   training, and stats change every OTA.

Use card and location names exactly as the data spells them. For how the
app itself works, use the `repository-knowledge` skill.

## 2. Status vocabulary

| value | meaning |
|---|---|
| `UNKNOWN` | The information is absent. Say what is missing. If it decides the answer, stop that item and report it. |
| `UNVERIFIED` | The information exists but is uncertain: one weak source, or a stale source. |
| `CONFLICTING_SOURCES` | Sources disagree. Keep every claim, each with its source. Never pick one silently. |

Never invent data to fill a gap.

## 3. Source trust

Every external fact carries one of these levels:

| level | meaning | sources used today |
|---|---|---|
| `OFFICIAL` | from Second Dinner or Nuverse | marvelsnap.com, the official Marvel Snap X account, in-game patch notes |
| `TRUSTED` | an established community database with a good record | marvelsnapzone.com (its card **Status** field lags behind reality, so a release needs a second source), snap.fan |
| `COMMUNITY` | player analysis and articles | guides, tier lists, streamers |
| `DATAMINED` | extracted from game files and not announced | datamine posts |
| `RUMORED` | unsourced or speculative | social posts |
| `UNKNOWN` | the source is not recorded | — |

Rules:

- Never treat `RUMORED` as confirmed.
- Never treat `DATAMINED` as official.
- Release and schedule facts are ruled by server reset at 00:00 UTC.

## 4. Freshness

An external fact records:

- `source`: a URL or name
- `source_date`: when the source published it
- `verified_at`: when a skill last checked it

Flag data as stale:

- meta data (`META`, win rates) older than 14 days
- collection data older than 3 days, measured by the game file's modified
  time
- any `upcoming` entry whose date has passed. Confirm the release with an
  independent source before moving it to released.

Report staleness to the user; do not hide it.

## 5. Game rules you may rely on

- Deck = exactly 12 cards, one copy each.
- 6 turns (some locations change this); energy = turn number unless a card
  or location says otherwise.
- Win 2 of 3 locations by total Power; a tied location goes to neither. If
  locations do not decide it, higher total Power across all locations wins.
- Cards are played face down, then revealed. The player winning more
  locations reveals first (tie → higher total Power; still tied → random).
  "On Reveal" fires when the card is revealed.
- 4 cards per location per side.

Anything beyond these rules and the card text is a mechanic you must mark
UNKNOWN rather than assume.

## 6. Skill contract

Each `SKILL.md` has YAML frontmatter (`name`, `description`) and states:

- **Purpose**
- **Inputs**, as files and their paths
- **Outputs**, as files or answers, with their shape
- **Dependencies**: other skills and scripts
- **Failure conditions**, and what happens for each
- **Validation**: the command or check that proves the output is right

Keep one clear job per skill. When a job needs a large reference, put it in
a file next to `SKILL.md` and link it.

## 7. Output envelope

A skill or agent that hands work to another writes JSON in this shape:

```json
{
  "skill": "<skill name>",
  "status": "complete | partial | failed",
  "confidence": "high | medium | low",
  "inputs": { "dataVersion": "<PATCH.dataVersion>", "collectionModified": "<ISO or null>" },
  "findings": [],
  "recommendations": [],
  "issues": [],
  "handoff": {},
  "sources": [{ "source": "", "trust": "OFFICIAL", "source_date": "", "verified_at": "" }]
}
```

`handoff` carries what the next step needs, and the skill defines its
shape. Show the envelope to the user only when they ask for it.

**Compatibility:** the deck-builder agents write `agent` instead of `skill`,
and may leave out `inputs` and `sources`. Readers accept both forms, so
saved runs stay readable.

## 8. Repository rules

- **Never `git push`.** Commit only; the user pushes with GitHub Desktop.
  Use a feature branch for multi-step work, so that a push in the middle of
  it never ships half-built UI.
- **User data stays out of this public repo.** That covers collection
  exports and run outputs; keep them under
  `C:\Users\natta\Desktop\AI\Marvel Snap\deckbuild-runs\`.
- **Data changes ship as patches.** Follow
  `docs/PATCH_UPDATE_PLAYBOOK.md`. Never hand-edit the SNAPDATA blob.
- **Check plan usage during heavy work.** That means multi-agent runs and
  long builds. Warn the user before any usage window passes 95% used.

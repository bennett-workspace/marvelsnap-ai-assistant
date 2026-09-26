# MARVEL SNAP AI
# MASTER MULTI-SKILL ECOSYSTEM GENERATOR

## ROLE

You are a **Principal AI Systems Architect, Senior Software Engineer, Data Architect, Game Systems Analyst, and Marvel Snap Strategy Expert**.

Your task is to inspect the existing repository and design/implement a complete **Marvel Snap AI Skill Ecosystem** on top of the existing application.

The application already contains a UI and some existing data/features.

You MUST understand the repository before making architectural or implementation decisions.

Do NOT blindly create a new architecture.

Extend the existing architecture whenever possible.

---

# 1. PRIMARY OBJECTIVE

Transform the existing Marvel Snap application into a modular AI-powered platform capable of:

```text
Repository Understanding
        ↓
Game Data Intelligence
        ↓
Card Knowledge
        ↓
Variant Tracking
        ↓
Patch / OTA Tracking
        ↓
Season / Release Tracking
        ↓
Meta Intelligence
        ↓
Synergy Knowledge
        ↓
Collection Intelligence
        ↓
Deck Building
        ↓
Deck Simulation
        ↓
Deck Validation
        ↓
Deck Upgrade Planning
        ↓
User-Friendly UI
```

The final system should behave like a team of specialized Marvel Snap analysts rather than one generic chatbot.

---

# 2. CRITICAL FIRST STEP — REPOSITORY ANALYSIS

Before creating or modifying any Skill, inspect the entire repository.

Understand:

## Application

- Framework
- Architecture
- Entry points
- Routing
- Components
- Services
- State management
- API layer
- Database
- Storage
- Configuration
- Existing AI functionality

## Existing Marvel Snap Features

Identify:

- Card database
- Collection
- Deck builder
- Deck list
- Card detail
- Search
- Filters
- Variants
- Locations
- Seasons
- User profile
- Existing recommendation logic
- Existing APIs
- Existing external data sources

## Existing UI

Understand:

```text
Page
 ↓
Component
 ↓
State
 ↓
Service
 ↓
Data
```

Determine the actual architecture from the repository.

Do NOT assume the architecture described in this prompt exists.

---

# 3. EXISTING DATA IS THE SOURCE OF TRUTH

If the repository already contains:

- Cards
- Abilities
- Cost
- Power
- Collection
- Variants
- Locations
- Decks
- Seasons
- Metadata

reuse it.

Do NOT create duplicate databases unless necessary.

Do NOT overwrite existing data blindly.

Do NOT invent data.

If information is unavailable:

```text
UNKNOWN
```

If information is uncertain:

```text
UNVERIFIED
```

If sources conflict:

```text
CONFLICTING_SOURCES
```

---

# 4. MASTER ARCHITECTURE

Build the system conceptually around:

```text
                         MARVEL SNAP AI
                                │
                         MASTER ORCHESTRATOR
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
        ▼                       ▼                        ▼
   DATA INTELLIGENCE       KNOWLEDGE INTELLIGENCE    USER INTELLIGENCE
        │                       │                        │
        ├─ Game Sync            ├─ Card Knowledge        ├─ Collection
        ├─ Update Intel         ├─ Synergy Graph         ├─ Wishlist
        ├─ Patch Tracker        ├─ Counter Graph         ├─ Progress
        ├─ OTA Tracker          ├─ Meta Knowledge        └─ Upgrade Plan
        ├─ Variant Tracker      └─ Archetype Knowledge
        ├─ Season Tracker
        ├─ Release Tracker
        ├─ Location Tracker
        └─ News Intelligence
                                │
                                ▼
                         ANALYSIS LAYER
                                │
             ┌──────────────────┼─────────────────┐
             │                  │                 │
             ▼                  ▼                 ▼
       Deck Builder        Meta Analyzer     Matchup Analyzer
             │                  │                 │
             └────────────┬─────┴─────────────────┘
                          ▼
                    Deck Simulator
                          │
                          ▼
                    Deck Validator
                          │
                          ▼
                   UX / Report Layer
                          │
                          ▼
                     EXISTING UI
```

---

# 5. SKILL ARCHITECTURE

Create modular Skills.

Do NOT create one giant monolithic Skill.

The following Skills are required.

---

# CORE SKILLS

## SKILL 01 — Repository Knowledge

Name:

```text
repository-knowledge
```

Purpose:

Understand the application's architecture and provide repository context to every other Skill.

Responsibilities:

- Repository scanning
- Architecture analysis
- Data source discovery
- UI discovery
- API discovery
- Existing feature discovery
- Dependency mapping
- Integration point detection

Output:

```text
Repository Architecture
Data Sources
UI Entry Points
API Entry Points
Existing Marvel Snap Features
Integration Points
Potential Conflicts
```

This Skill must be executed before major implementation tasks.

---

# SKILL 02 — Game Data Intelligence

Name:

```text
game-data-intelligence
```

This is the central data intelligence Skill.

Purpose:

Maintain an accurate, normalized, versioned understanding of Marvel Snap game data.

Track:

```text
Cards
Card abilities
Cost
Power
Keywords
Archetypes
Variants
Locations
Albums
Seasons
Bundles
Spotlights
Game modes
Balance changes
OTA
Patches
Release dates
Upcoming content
Events
```

Responsibilities:

```text
Collect
Normalize
Validate
Compare
Version
Store
Expose
```

---

# SKILL 03 — Game Data Sync

Name:

```text
game-data-sync
```

Purpose:

Synchronize external/current information with the application's data model.

Workflow:

```text
Source
 ↓
Fetch
 ↓
Parse
 ↓
Normalize
 ↓
Validate
 ↓
Diff
 ↓
Approve
 ↓
Persist
```

Never silently overwrite existing information.

Create change records.

---

# SKILL 04 — Game Update Intelligence

Name:

```text
game-update-intelligence
```

Purpose:

Detect what changed between previous and current game data.

Detect:

```text
NEW_CARD
CARD_BUFF
CARD_NERF
CARD_REWORK
NEW_VARIANT
NEW_LOCATION
NEW_SEASON
NEW_BUNDLE
NEW_SPOTLIGHT
NEW_EVENT
REMOVED
DELAYED
RESCHEDULED
```

Output human-readable summaries.

Example:

```text
Game Update

🆕 New Card
Card:
Release:
Ability:

⚖ Balance Change
Card:
Before:
After:

🎨 New Variant
Card:
Artist:
Release:
```

---

# SKILL 05 — Card Database Intelligence

Name:

```text
card-database-intelligence
```

Each card should conceptually contain:

```text
Identity
Current State
Historical State
Ability
Cost
Power
Keywords
Archetypes
Synergies
Counters
Combos
Variants
Release Date
Series
Balance History
Sources
```

The Skill must support historical queries.

Example:

```text
What did this card look like before the latest OTA?
```

---

# SKILL 06 — Variant Tracker

Name:

```text
variant-tracker
```

Track:

```text
Current Variants
Upcoming Variants
Newly Announced Variants
Variant Artist
Variant Series
Album
Release Date
Availability
Bundle
Spotlight
Source
```

Every variant must have a status:

```text
CONFIRMED
DATAMINED
RUMORED
SPECULATED
RELEASED
REMOVED
DELAYED
```

Never present datamined or rumored information as confirmed.

---

# SKILL 07 — Season & Release Tracker

Name:

```text
season-release-tracker
```

Track:

```text
Current Season
Upcoming Seasons
Season Themes
Season Pass
New Cards
New Variants
Locations
Bundles
Events
Spotlights
OTA
Patch
Release Schedule
```

Generate timeline data.

Example:

```text
September
 ├─ Season
 ├─ Card
 ├─ Variant
 └─ OTA

October
 ├─ New Season
 ├─ New Card
 └─ Spotlight
```

---

# SKILL 08 — Patch Tracker

Name:

```text
patch-tracker
```

Track official patch notes.

Detect:

```text
Feature changes
Card changes
Location changes
Game-system changes
UI changes
Bug fixes
Economy changes
```

Maintain historical versions.

---

# SKILL 09 — OTA Tracker

Name:

```text
ota-tracker
```

Specialized in Over-The-Air balance changes.

Track:

```text
Card
Before
After
Change Type
Date
Patch / OTA
Source
```

Analyze impact on:

```text
Archetypes
Decks
Synergies
Counters
Meta
```

---

# SKILL 10 — Location Intelligence

Name:

```text
location-intelligence
```

Track:

```text
Locations
Location effects
Location changes
New locations
Removed locations
Location synergies
Location counters
```

Analyze how locations affect decks.

---

# KNOWLEDGE LAYER

# SKILL 11 — Synergy Knowledge Graph

Name:

```text
synergy-knowledge-graph
```

Build relationships:

```text
CARD
 ├─ synergizes_with
 ├─ enables
 ├─ requires
 ├─ counters
 ├─ belongs_to
 ├─ combos_with
 ├─ replaces
 └─ benefits_from
```

Example:

```text
Card A
 ├── enables → Card B
 ├── synergizes_with → Card C
 ├── belongs_to → Destroy
 └── counters → Archetype X
```

This graph is a core dependency of Deck Builder.

---

# SKILL 12 — Archetype Intelligence

Name:

```text
archetype-intelligence
```

Discover archetypes dynamically.

Do NOT rely only on hardcoded archetype names.

For each archetype determine:

```text
Core
Enablers
Payoffs
Support
Tech
Finishers
Weaknesses
Counters
Missing Cards
```

---

# SKILL 13 — Meta Intelligence

Name:

```text
meta-intelligence
```

Analyze current meta information.

Track where available:

```text
Deck Popularity
Archetype Popularity
Win Rate
Pick Rate
Matchups
Card Usage
Trend
```

Always store:

```text
Source
Date
Population
Time Period
```

Never present old meta information as current.

Detect:

```text
RISING
STABLE
FALLING
NEW
DISAPPEARING
```

---

# SKILL 14 — Counter & Matchup Analyzer

Name:

```text
counter-matchup-analyzer
```

Analyze:

```text
Deck A
vs
Deck B
```

Determine:

```text
Strengths
Weaknesses
Important Cards
Important Locations
Counterplay
Retreat Situations
Alternative Lines
```

Never claim guaranteed outcomes.

---

# USER INTELLIGENCE

# SKILL 15 — Collection Intelligence

Name:

```text
collection-intelligence
```

Analyze the user's complete collection.

Separate:

```text
OWNED
MISSING
```

Identify:

```text
Available Archetypes
Incomplete Archetypes
Core Cards
Missing Core Cards
Potential Decks
Collection Gaps
```

---

# SKILL 16 — Collection Progress

Name:

```text
collection-progress
```

Track:

```text
Archetype Completion
Deck Completion
Core Completion
Missing Cards
Collection Growth
```

Provide progress visualization through the existing UI.

---

# SKILL 17 — Deck Upgrade Planner

Name:

```text
deck-upgrade-planner
```

Transform:

```text
Current Deck
 ↓
Missing Card
 ↓
Replacement
 ↓
Improved Deck
```

Prioritize upgrades based on:

```text
Strategic Impact
Number of Missing Cards
Synergy Improvement
Collection Value
```

Do not use arbitrary numerical rankings unless the UI already supports them.

---

# SKILL 18 — Wishlist / Watchlist

Name:

```text
wishlist-watchlist
```

Allow users to watch:

```text
Cards
Variants
Decks
Archetypes
Seasons
Bundles
Spotlights
```

When new information matches a watch item, generate a notification event.

---

# ANALYSIS LAYER

# SKILL 19 — Professional Deck Builder

Name:

```text
professional-deck-builder
```

This Skill uses:

```text
Collection Intelligence
Card Database
Archetype Intelligence
Synergy Graph
Meta Intelligence
Counter Analyzer
Game Data
```

Build:

### Owned Decks

ONLY cards the user owns.

### Missing-Card Decks

May contain cards the user does not own.

Every deck must contain:

```text
12 Cards
Core
Enablers
Support
Interaction
Finisher
Win Condition
Game Plan
Curve
Alternative Lines
```

Every card must have a meaningful purpose.

---

# SKILL 20 — Deck Simulator

Name:

```text
deck-simulator
```

Simulate possible game sequences.

Model:

```text
Deck
Hand
Draw
Energy
Turns
Card Effects
Locations
Combos
```

Test:

```text
Opening Hands
Draw Sequences
Combo Frequency
Dead Draws
Curve
Win Condition Frequency
Alternative Lines
```

Use simulation to support validation.

Do not claim simulation equals actual live-game win rate.

---

# SKILL 21 — Deck Validator

Name:

```text
deck-validator
```

Every generated deck MUST pass:

```text
Deck Rules
Card Validity
Collection Validity
Synergy
Curve
Combo
Win Condition
Consistency
Playability
```

If invalid:

```text
REJECT
```

Send back to Deck Builder.

Maximum revision:

```text
3
```

---

# SKILL 22 — Deck Comparison

Name:

```text
deck-comparison
```

Compare decks based on factual characteristics:

```text
Core Strategy
Curve
Combo Dependency
Interaction
Flexibility
Required Cards
Missing Cards
Matchups
Play Pattern
```

Do NOT reduce everything to one arbitrary score unless explicitly required by the existing UI.

---

# SKILL 23 — News Intelligence

Name:

```text
news-intelligence
```

Collect and normalize:

```text
Official Announcements
Patch Notes
OTA
Season Announcements
Developer Updates
Card Announcements
Variant Announcements
```

Every item must retain:

```text
Source
Publication Date
Status
```

---

# SKILL 24 — Data Integrity

Name:

```text
data-integrity
```

Continuously detect:

```text
Duplicate Cards
Duplicate Variants
Invalid Data
Missing Data
Wrong Cost
Wrong Power
Invalid Ability
Conflicting Sources
Stale Data
Incorrect Release Dates
```

Produce:

```text
Data Health Report
```

Example:

```text
Cards: 2,103
Variants: 4,821
Locations: 102

Valid: 99.4%
Warnings: 7
Conflicts: 4
Missing: 3
```

---

# REPORT / UX LAYER

# SKILL 25 — UX Report Generator

Name:

```text
ux-report-generator
```

Convert technical analysis into simple user-facing information.

Avoid unnecessary developer terminology.

Use the existing UI design system.

Do NOT redesign the application unnecessarily.

---

# 6. MASTER ORCHESTRATOR

Name:

```text
marvel-snap-orchestrator
```

This is the central controller.

Responsibilities:

```text
Receive User Request
        ↓
Understand Context
        ↓
Determine Required Skills
        ↓
Execute Skills
        ↓
Merge Results
        ↓
Validate
        ↓
Generate UI Output
```

---

# 7. ORCHESTRATOR ROUTING

Examples:

## User asks:

> Build me a deck.

Run:

```text
Repository Knowledge
→ Collection Intelligence
→ Card Database
→ Archetype Intelligence
→ Synergy Graph
→ Professional Deck Builder
→ Deck Validator
→ UX Report
```

---

## User asks:

> What's new?

Run:

```text
Game Data Intelligence
→ Game Update Intelligence
→ Patch Tracker
→ OTA Tracker
→ Season Tracker
→ Variant Tracker
→ News Intelligence
→ UX Report
```

---

## User asks:

> What new cards are coming?

Run:

```text
Game Data Intelligence
→ Season Tracker
→ Release Tracker
→ Card Database
→ Game Update Intelligence
→ UX Report
```

---

## User asks:

> What variants are coming?

Run:

```text
Variant Tracker
→ Game Data Intelligence
→ News Intelligence
→ UX Report
```

---

## User asks:

> What should I upgrade?

Run:

```text
Collection Intelligence
→ Deck Upgrade Planner
→ Card Database
→ Meta Intelligence
→ Synergy Graph
→ UX Report
```

---

## User asks:

> Is this deck good?

Run:

```text
Deck Validator
→ Synergy Analyzer
→ Deck Simulator
→ Meta Intelligence
→ Counter Analyzer
→ UX Report
```

---

# 8. PARALLEL EXECUTION

When dependencies allow it, execute independent Skills in parallel.

Example:

```text
Repository Knowledge
        ↓
 ┌──────┼──────────┬──────────┐
 ↓      ↓          ↓          ↓
Card  Collection  Meta     Variants
Data  Intelligence Data     Tracker
 └──────┼──────────┴──────────┘
        ↓
   Orchestrator
        ↓
    Deck Builder
```

Do not execute dependent Skills before their required data is available.

---

# 9. DATA VERSIONING

All important game data must be version-aware.

Conceptually:

```text
Card
│
├── Current State
│
├── Release State
│
├── Balance History
│   ├── Version 1
│   ├── Version 2
│   └── Version 3
│
├── Variants
│
├── Archetypes
│
├── Synergies
│
└── Sources
```

This allows historical queries.

Example:

> Why was this deck different last month?

The system should be able to reconstruct historical state when data exists.

---

# 10. SOURCE TRUST MODEL

Every external fact must have source metadata.

Use:

```text
OFFICIAL
TRUSTED
COMMUNITY
DATAMINED
RUMORED
UNKNOWN
```

Never treat:

```text
RUMORED
```

as:

```text
CONFIRMED
```

Never treat:

```text
DATAMINED
```

as:

```text
OFFICIAL
```

When sources conflict:

```text
CONFLICTING_SOURCES
```

and preserve both claims with attribution.

---

# 11. FRESHNESS MODEL

Important data should contain:

```text
created_at
updated_at
source
source_date
verified_at
status
```

The system should detect stale information.

Example:

```text
Last verified:
2026-09-26

Current:
YES
```

---

# 12. CHANGE DETECTION

Whenever new game data is synchronized:

```text
OLD
 ↓
NEW
 ↓
DIFF
 ↓
CLASSIFY
 ↓
STORE
 ↓
NOTIFY
```

Classify:

```text
NEW
CHANGED
REMOVED
DELAYED
RESCHEDULED
```

---

# 13. NOTIFICATION EVENTS

Create internal events such as:

```text
NEW_CARD
NEW_VARIANT
CARD_BUFF
CARD_NERF
NEW_SEASON
NEW_LOCATION
NEW_SPOTLIGHT
NEW_BUNDLE
DECK_IMPACT
WATCHLIST_MATCH
```

The existing UI can decide how to display these.

---

# 14. DECK IMPACT ANALYSIS

When a card changes:

```text
Card Changed
     ↓
Find Synergies
     ↓
Find Decks
     ↓
Find Archetypes
     ↓
Find Matchups
     ↓
Analyze Impact
```

Example:

```text
Card X Nerfed

Affected:
Destroy
Deck A
Deck B

Potential Result:
Lower synergy with Card Y

Recommended Action:
Re-evaluate affected decks
```

Do not automatically modify the user's deck without validation.

---

# 15. USER COLLECTION + LIVE GAME DATA

The system must combine:

```text
User Collection
+
Current Game Data
+
Current Meta
+
Synergy Knowledge
```

Example:

```text
Current Meta
      +
User Collection
      +
Upcoming Card
      ↓
Future Deck Potential
```

---

# 16. UPCOMING CONTENT ANALYSIS

For upcoming cards:

Analyze:

```text
Card
Release Date
Ability
Potential Archetypes
Potential Synergies
Potential Existing Cards
Potential Collection Impact
```

Clearly distinguish:

```text
CONFIRMED
DATAMINED
RUMORED
```

---

# 17. UPCOMING VARIANT ANALYSIS

For upcoming variants:

```text
Card
Artist
Variant
Series
Album
Release Date
Availability
Bundle
Source
Status
```

Example:

```text
Upcoming Variant

Card:
Spider-Man

Status:
CONFIRMED

Release:
October 2026

Artist:
...

Availability:
Bundle

Source:
Official
```

Only show fields supported by actual data.

---

# 18. META CHANGE ANALYSIS

When a patch/OTA happens:

```text
Patch
 ↓
Card Changes
 ↓
Synergy Changes
 ↓
Deck Changes
 ↓
Archetype Changes
 ↓
Meta Changes
```

The system should identify affected knowledge rather than blindly regenerate everything.

---

# 19. USER-FACING DASHBOARD

Where the existing UI allows it, provide:

```text
┌────────────────────────────────────┐
│ MARVEL SNAP AI                     │
├────────────────────────────────────┤
│                                    │
│ 🆕 New Cards                       │
│ 🎨 Upcoming Variants               │
│ ⚖ Balance Changes                  │
│ 📅 Upcoming Season                 │
│ 🔥 Meta Trends                     │
│ 🃏 My Collection                   │
│ 🏆 My Decks                        │
│ ⬆ Upgrade Suggestions              │
│ 🔔 Watchlist                       │
│                                    │
└────────────────────────────────────┘
```

Reuse existing UI patterns.

---

# 20. USER-FRIENDLY LANGUAGE

Internal terminology can be technical.

Final UI must be understandable.

Instead of:

```text
High interaction density with low dependency variance
```

write:

```text
This deck does not rely on one specific combo, so it can still play normally when you don't draw the perfect cards.
```

---

# 21. ERROR HANDLING

Never silently fail.

Return structured errors:

```text
Skill
Status
Error
Cause
Impact
Recovery
```

Do not fabricate missing data.

---

# 22. SECURITY

When implementing external data synchronization:

- Validate external input
- Sanitize data
- Validate schemas
- Avoid arbitrary code execution
- Avoid trusting external payloads
- Protect API credentials
- Do not store secrets in Skills
- Use environment configuration
- Validate URLs and sources
- Prevent uncontrolled scraping loops

---

# 23. PERFORMANCE

Avoid unnecessary full-system recalculation.

Use:

```text
Caching
Incremental Updates
Change Detection
Selective Re-analysis
Parallel Execution
```

If only one card changed:

Do not rebuild every knowledge object unnecessarily.

---

# 24. TESTING

Create tests for:

## Data

```text
Card Sync
Variant Sync
Patch Sync
OTA Sync
Season Sync
```

## Knowledge

```text
Synergy
Archetype
Counter
Meta
```

## Deck

```text
Deck Size
Card Validity
Collection
Combo
Curve
Win Condition
```

## Integration

```text
Sync → Knowledge
Knowledge → Deck Builder
Deck Builder → Validator
Validator → UI
```

## Edge Cases

```text
Empty Collection
Small Collection
Large Collection
Missing Core Card
Conflicting Sources
Stale Data
Duplicate Data
Upcoming Content
Delayed Content
Removed Content
```

---

# 25. OBSERVABILITY

Each Skill should provide internal execution information:

```text
Skill
Start
End
Status
Dependencies
Data Sources
Records Processed
Warnings
Errors
```

Do not expose unnecessary technical information to normal users.

Provide it only through developer/debug mode.

---

# 26. SKILL CONTRACT

Every Skill should conceptually follow:

```text
INPUT
 ↓
VALIDATE
 ↓
PROCESS
 ↓
ANALYZE
 ↓
OUTPUT
```

Every Skill should define:

```text
Purpose
Inputs
Outputs
Dependencies
Failure Conditions
Validation
```

---

# 27. AGENT / SKILL HANDOFF

Use structured internal contracts.

Example:

```json
{
  "skill": "deck-builder",
  "status": "complete",
  "input": {
    "collection": {},
    "card_data_version": "...",
    "meta_version": "..."
  },
  "output": {
    "decks": []
  },
  "warnings": [],
  "sources": []
}
```

Do not expose internal contracts unless needed by developers.

---

# 28. MASTER VALIDATION

Before considering the system complete, verify:

```text
[ ] Repository analyzed
[ ] Existing architecture understood
[ ] Existing UI reused
[ ] Existing data reused
[ ] Game data sync exists
[ ] Versioned game data exists
[ ] Update detection exists
[ ] Card database exists
[ ] Variant tracker exists
[ ] Season tracker exists
[ ] Patch tracker exists
[ ] OTA tracker exists
[ ] Location intelligence exists
[ ] Synergy graph exists
[ ] Archetype intelligence exists
[ ] Meta intelligence exists
[ ] Counter analyzer exists
[ ] Collection intelligence exists
[ ] Collection progress exists
[ ] Upgrade planner exists
[ ] Wishlist exists
[ ] News intelligence exists
[ ] Deck builder exists
[ ] Deck simulator exists
[ ] Deck validator exists
[ ] Deck comparison exists
[ ] Data integrity exists
[ ] UX report exists
[ ] Source attribution exists
[ ] Freshness tracking exists
[ ] Error handling exists
[ ] Testing exists
```

---

# 29. IMPLEMENTATION ORDER

Do NOT attempt to implement everything randomly.

Use this order:

```text
PHASE 1
Repository Knowledge
        ↓
PHASE 2
Data Model / Game Data Intelligence
        ↓
PHASE 3
Game Data Sync
        ↓
PHASE 4
Card / Variant / Patch / OTA / Season
        ↓
PHASE 5
Data Integrity
        ↓
PHASE 6
Knowledge Graph
        ↓
PHASE 7
Collection Intelligence
        ↓
PHASE 8
Archetype / Meta / Counter
        ↓
PHASE 9
Deck Builder
        ↓
PHASE 10
Deck Simulator
        ↓
PHASE 11
Deck Validator
        ↓
PHASE 12
Upgrade Planner
        ↓
PHASE 13
Watchlist / Notification
        ↓
PHASE 14
UX Integration
        ↓
PHASE 15
Testing / Final Review
```

---

# 30. DO NOT OVERENGINEER

Before creating a new database, service, API, component, or Skill:

Ask:

> Does the repository already provide this capability?

If yes:

Reuse it.

If partially:

Extend it.

If no:

Create the smallest clean implementation necessary.

---

# 31. DO NOT BREAK EXISTING FEATURES

Before modifying code:

Understand:

```text
Current Behavior
Dependencies
Existing UI
Existing API
Existing Data
```

After modification:

Run relevant tests.

Do not replace working functionality unnecessarily.

---

# 32. FINAL PRINCIPLE

This project should ultimately behave like:

```text
              MARVEL SNAP AI
                   │
                   ▼
             "What changed?"
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
       Cards    Variants    OTA
         │         │         │
         └─────────┼─────────┘
                   ▼
                Knowledge
                   │
          ┌────────┼─────────┐
          ▼        ▼         ▼
       Synergy    Meta    Collection
          │        │         │
          └────────┼─────────┘
                   ▼
              Deck Builder
                   │
                   ▼
              Simulator
                   │
                   ▼
              Validator
                   │
                   ▼
              User's UI
```

The system must continuously transform:

```text
RAW GAME DATA
      ↓
TRUSTED KNOWLEDGE
      ↓
ACTIONABLE ANALYSIS
      ↓
PERSONALIZED RECOMMENDATION
```

The ultimate objective is:

> **Know the game.**
>
> **Know the user's collection.**
>
> **Know what changed.**
>
> **Know what is coming.**
>
> **Understand how cards interact.**
>
> **Build decks that can actually be played.**
>
> **Explain why the deck works.**
>
> **Keep the information current.**
>
> **Never confuse rumors with confirmed information.**
>
> **Never hallucinate missing game data.**
>
> **Never break the existing application.**

# FINAL EXECUTION COMMAND

Now inspect the repository.

Do not start coding immediately.

First produce an internal architecture understanding.

Then identify:

1. Existing functionality that can be reused.
2. Existing functionality that should be extended.
3. Missing capabilities.
4. Required Skills.
5. Required agents.
6. Required data models.
7. Required integrations.
8. Required UI changes.
9. Implementation dependencies.

Then implement the ecosystem incrementally according to the phases above.

After each major phase:

```text
Analyze
→ Implement
→ Test
→ Validate
→ Review
→ Continue
```

Never skip validation.

Do not invent unavailable game information.

Do not overwrite existing data without a validated migration/update strategy.

Preserve the existing application's functionality and design language.
# Phase 1 — Repository Knowledge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `repository-knowledge` skill backed by a checked repo map, add shared conventions for all future skills, write the 26-skill ecosystem map, and point deck-builder Agent 1 at the map.

**Architecture:** `repo-map.md` is a hand-written map with a machine-readable `repo-facts` block. `scripts/repo-tools/check-repo-map.js` extracts the same facts from the code and fails when they differ, or when a function or path the map names no longer exists. Docs live in `docs/skills/`, and skills link to them.

**Tech Stack:** Node (no dependencies), `node:test`, Markdown.

**Spec:** [`docs/superpowers/specs/2026-09-30-phase1-repository-knowledge-design.md`](../specs/2026-09-30-phase1-repository-knowledge-design.md)

## Global Constraints

- Repo root: `C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant`. Branch: `skills/phase1-repository-knowledge`.
- **Commit only. Never `git push`.** End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not modify `marvel-snap-deck-builder.html`, `patches/`, `manifest.json` or `extension/`.
- Never read line 331 of the HTML whole (1.38 MB). Use grep plus offset reads.
- No user data in the repo. Saved runs stay in `C:\Users\natta\Desktop\AI\Marvel Snap\deckbuild-runs\`.
- Node only, no npm packages. Follow the CommonJS style of `scripts/patch-tools/current-state.js` and the test style of `scripts/lib/shop-parse.test.js`.
- Map anchors are function or identifier names, never line numbers.

**One deviation from the spec.** `snapdataKeys` is taken from the *current* state (baseline plus patches, via `loadCurrent()`), not from the baseline alone. `SHOP` exists only after patches, and skills see the current state.

## Review Focus

1. **Line endings.** Files checked out with CRLF must parse the same. `parseFactsBlock` and `findAnchors` must accept `\r\n`. Test: a CRLF fixture in Task 1.
2. **Backticked tokens that are not repo paths**, such as `V.<route>`, `patches/*.json`, `<runDir>/cards.json` and `%LocalAppData%…`. These must not be reported as missing paths. Test: `findAnchors ignores placeholders and globs` in Task 2.
3. **An absent or duplicated `repo-facts` block.** It must fail loudly with a clear message, never pass silently. Test in Task 1.
4. **Arrow-function or `var name=function` definitions.** Test that `name=function` and `function name(` both count as defined in Task 2.
5. **Running from a directory other than the repo root.** Paths resolve from `__dirname`, like `current-state.js`. This is covered by running the CLI from the parent folder in Task 3, Step 4.

---

### Task 1: Fact extraction and diff

**Files:**
- Create: `scripts/repo-tools/check-repo-map.js`
- Test: `scripts/repo-tools/check-repo-map.test.js`

**Interfaces:**
- Produces:
  - `extractFacts({ html: string, files: string[], current: object }) -> { routes: string[], snapdataKeys: string[], storageKeys: {[k]: string}, scripts: string[] }`. All arrays are sorted. `files` is the `git ls-files` list. `scripts` = entries matching `^scripts/.*\.js$` plus `verify-manifest.js` if present. `current` is the SNAPDATA object.
  - `parseFactsBlock(md: string) -> object`. It reads the single fenced block opened by a ```` ```json repo-facts ```` line. It throws `Error('repo-facts block not found')` when there is none, and `Error('multiple repo-facts blocks')` when there are several.
  - `diffFacts(expected, actual) -> Array<{ section: string, message: string }>`. An empty array means a match. For arrays the message is `added: a, b; removed: c`. For `storageKeys` it lists added, removed and changed keys as `key: "old" -> "new"`.

- [ ] **Step 1: Write the failing tests.** Use a fixture HTML string containing `V.alpha=function(){}`, `V.beta = function(){}` and `var K={col:'x.v1',decks:'y.v1'};`.
  - `extractFacts reads routes, storage keys, scripts`:
    - `routes` = `['alpha','beta']`
    - `storageKeys` = `{col:'x.v1',decks:'y.v1'}`
    - `scripts` from files `['scripts/a.js','scripts/lib/b.test.js','README.md','verify-manifest.js']` = `['scripts/a.js','scripts/lib/b.test.js','verify-manifest.js']`
    - `snapdataKeys` from `current` `{CARDS:[],PATCH:{}}` = `['CARDS','PATCH']`
  - `parseFactsBlock reads the block`: with LF input and again with the same markdown converted to CRLF.
  - `parseFactsBlock throws when missing` and `throws on two blocks`: use `assert.throws` with the messages above.
  - `diffFacts reports added and removed routes`: expected `['a','b']`, actual `['b','c']` gives one entry with section `routes`, and the message contains `added: c` and `removed: a`.
  - `diffFacts reports a changed storage key`: `{col:'x.v1'}` vs `{col:'x.v2'}` gives a message containing `col: "x.v1" -> "x.v2"`.
  - `diffFacts returns [] for equal facts`.

- [ ] **Step 2: Run the tests and verify they fail.** Run `node --test scripts/repo-tools/`. Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement the three functions and export them.** Match `storageKeys` with regex `var K=\{([^}]*)\}` and parse the pairs with `(\w+)\s*:\s*'([^']*)'`. Match routes with `V\.(\w+)\s*=\s*function`, deduplicated.

- [ ] **Step 4: Run the tests and verify they pass.** Run `node --test scripts/repo-tools/`. Expected: all pass.

- [ ] **Step 5: Commit** with message `repo-tools: extract and diff repository facts`.

### Task 2: Anchor checks and CLI

**Files:**
- Modify: `scripts/repo-tools/check-repo-map.js`
- Test: `scripts/repo-tools/check-repo-map.test.js`

**Interfaces:**
- Consumes: Task 1 functions.
- Produces:
  - `findAnchors(md) -> { functions: string[], paths: string[] }`. Functions are backticked `` `name()` `` tokens with `name` matching `^[A-Za-z_$][\w$.]*$`; keep only the last dotted segment. Paths are backticked tokens that contain `/` or end in `.js|.json|.md|.html`. Skip any token containing `<`, `>`, `*`, `%`, a space or `:`, or starting with `http`.
  - `checkAnchors(anchors, { html, jsSources: {[path]: string}, exists: (p)=>boolean }) -> Array<{ section: 'anchors', message }>`. A function counts as defined when the HTML or any JS source matches `function name\b` or `\bname\s*=\s*function`. A missing function gives `missing function: name()`, and a missing path gives `missing path: p`.
  - A CLI `main(argv)` that runs when `require.main === module`.
    - The repo root is `process.env.REPO_ROOT || path.resolve(__dirname,'..','..')`.
    - It reads `<root>/.claude/skills/repository-knowledge/repo-map.md`.
    - It gets `files` via `git ls-files` (`child_process.execFileSync`, `cwd` = root). If that throws, it falls back to a recursive `fs` walk that skips `.git` and `node_modules` and uses `/` separators.
    - It gets `current` by reading `<root>/marvel-snap-deck-builder.html` and applying `<root>/patches/*.json`. Use `extractBaselineSnapdata` and `applyOps` from `../patch-tools/current-state.js`, because `loadCurrent()` hard-codes its own root.
    - Then:
    - with no flags: prints the info line `cards: N | locations: N | latest patch: <file> | patch files: N`, then `PASS` (exit 0) or one `STALE <section>: <message>` line per problem (exit 1)
    - `--facts`: prints the fresh facts as a ready-to-paste block and exits 0
    - `--json`: prints `{ ok, info, problems }`

- [ ] **Step 1: Write the failing tests.**
  - `findAnchors finds functions and paths`: md with `` `buildDeck()` ``, `` `V.recommend()` `` and `` `scripts/deck-tools/validate-decks.js` `` gives functions `['buildDeck','recommend']` and paths `['scripts/deck-tools/validate-decks.js']`.
  - `findAnchors ignores placeholders and globs`: `` `V.<route>` ``, `` `patches/*.json` ``, `` `<runDir>/cards.json` ``, `` `%LocalAppData%Low/x.json` `` and `` `https://a/b.js` `` give both lists empty.
  - `checkAnchors accepts both definition styles`: html `function foo(){}` plus `bar=function(){}`, with anchors `foo` and `bar`, gives `[]`.
  - `checkAnchors reports a missing function and path`: anchors `{functions:['gone'],paths:['nope.js']}` with `exists` returning `false` gives two problems, whose messages contain `gone()` and `nope.js`.

- [ ] **Step 2: Run the tests and verify they fail.** Run `node --test scripts/repo-tools/`. Expected: FAIL (`findAnchors` is not a function).

- [ ] **Step 3: Implement `findAnchors`, `checkAnchors` and `main`.** Build `jsSources` by reading every file from the `scripts` fact. `exists` = `fs.existsSync(path.join(REPO, p))`. The CLI exits with code 2 and a clear message when `repo-map.md` is missing.

- [ ] **Step 4: Run the tests and verify they pass.** Run `node --test scripts/repo-tools/`. Expected: all pass.

- [ ] **Step 5: Commit** with message `repo-tools: anchor checks and check-repo-map CLI`.

### Task 3: `repository-knowledge` skill and repo map

**Files:**
- Create: `.claude/skills/repository-knowledge/SKILL.md`
- Create: `.claude/skills/repository-knowledge/repo-map.md`

**Interfaces:**
- Consumes: the Task 2 CLI (`--facts`, the default check).
- Produces: `repo-map.md` with the section headings exactly as below. Task 5 and Agent 1 cite these names:
  `## Overview`, `## Routes`, `## Data`, `## Patch system`, `## Collection`, `## Decks`, `## Scripts and tools`, `## Known hazards`, `## Facts`.

- [ ] **Step 1: Write `repo-map.md`** with the nine sections, following the spec's Part 1.
  - Seed it from `C:\Users\natta\Desktop\AI\Marvel Snap\deckbuild-runs\2026-09-29\01-repository.json` (`handoff`).
  - Re-verify every claim by grepping the HTML and scripts. Record identifiers, not line numbers.
  - The Routes table has one row for each of the 16 `V.*` views, with its purpose and the data it reads.
  - Collection names every `K` key and the three sync paths: extension `postMessage` with `source:'marvelsnap-sync-ext'`, manual import via `importNames()`, and collection-view clicks. It also notes that the game file follows whichever account is logged in.
  - Hazards lists: CRLF vs the SHA-256 of the LF blob (v009, `.gitattributes`), CDN lag after a push, account switches, and the 1.38 MB line 331.
  - The `## Facts` section holds the output of `node scripts/repo-tools/check-repo-map.js --facts`.

- [ ] **Step 2: Write `SKILL.md`.**
  - Frontmatter: `name: repository-knowledge`. The description says to use it before reading or changing the Marvel Snap app, patches or scripts, and whenever a skill needs to know how the app works.
  - Body:
    - the Purpose, Inputs, Outputs, Dependencies, Failure and Validation contract, linking `docs/skills/CONVENTIONS.md`
    - step 1: run the check
    - step 2: on PASS, answer from `repo-map.md`
    - step 2: on STALE, re-read only the named area, update the map, paste fresh `--facts` output, and rerun until it passes
    - the rule about reading the HTML
    - an instruction to report any map claim found to be wrong

- [ ] **Step 3: Run the check on the real repo.** Run `node scripts/repo-tools/check-repo-map.js`. Expected: the info line, then `PASS`, exit 0.

- [ ] **Step 4: Run it from another working directory.** From `C:\Users\natta\Desktop\AI\Marvel Snap`, run `node marvelsnap-ai-assistant/scripts/repo-tools/check-repo-map.js`. Expected: `PASS`.

- [ ] **Step 5: Drift test in a scratch copy.**
  - Copy the HTML, `patches/`, `scripts/`, `verify-manifest.js`, `docs/` and `.claude/skills/` into `<scratchpad>/drift/`, keeping the same relative layout.
  - Run the real script with env `REPO_ROOT=<scratchpad>/drift`. The copy has no `.git`, so this also exercises the fs fallback. Expected: PASS.
  - In the copy, rename `V.shop=function` to `V.store=function`, and change `'snapdb.decks.v1'` to `'snapdb.decks.v2'`. Rerun. Expected: exit 1, and STALE lines for `routes` (added `store`, removed `shop`) and for `storageKeys`.
  - Also rename `function buildDeck` to `function buildDeck2`. Expected: `missing function: buildDeck()`.

- [ ] **Step 6: Commit** with message `Add repository-knowledge skill and checked repo map`.

### Task 4: Shared conventions

**Files:**
- Create: `docs/skills/CONVENTIONS.md`
- Modify: `.claude/skills/marvel-snap-deck-builder/rules.md`

- [ ] **Step 1: Write `CONVENTIONS.md`** with the eight numbered sections of the spec's Part 3, in that order.
  - Move the "Game rules you may rely on" list verbatim from `rules.md`.
  - The envelope example is `{skill, status, confidence, inputs:{dataVersion}, findings, recommendations, issues, handoff, sources}`, noting that `skill`, `inputs` and `sources` are optional for the deck-builder agents, which use `agent`.
  - The source table is: official site / official X = OFFICIAL; marvelsnapzone = TRUSTED, noting that its Status field lags and a release needs a second source; datamine posts = DATAMINED; social rumors = RUMORED.
  - The staleness rule: meta data older than 14 days and collection data older than 3 days are flagged as stale.

- [ ] **Step 2: Slim `rules.md`.**
  - Keep the header, "Facts come from files" (only the `cards.json` specifics), Collection, Strategy and the deck-builder envelope.
  - Replace the game-rules list and the generic UNKNOWN wording with one line that links `../../../docs/skills/CONVENTIONS.md`.
  - No rule may appear in both files.

- [ ] **Step 3: Verify no rule was lost.** Check that every game-rule bullet from the old `rules.md` (`git show HEAD:.claude/skills/marvel-snap-deck-builder/rules.md`) appears in `CONVENTIONS.md`: grep each bullet's first five words. Expected: all found.

- [ ] **Step 4: Run the regression check.** Run `node scripts/deck-tools/validate-decks.js "C:\Users\natta\Desktop\AI\Marvel Snap\deckbuild-runs\2026-09-29" 05-decks.json`. Expected: `10/10 decks pass hard rules`. This rewrites `05-decks.checked.json` in that folder with identical content, which is acceptable.

- [ ] **Step 5: Commit** with message `Add shared skill conventions; deck-builder rules link to them`.

### Task 5: Ecosystem map, Agent 1 change, dry run

**Files:**
- Create: `docs/skills/ECOSYSTEM.md`
- Modify: `.claude/skills/marvel-snap-deck-builder/agents/1-repository.md`
- Modify: `.claude/skills/marvel-snap-deck-builder/SKILL.md` (step 1 note only)
- Modify: `docs/briefs/NEXT-SESSION.md`

- [ ] **Step 1: Write `ECOSYSTEM.md`.**
  - The main table has these columns: `skill | brief § | phase | verdict | builds on | depends on | status`. It has 26 rows, one per folder name in `NEXT-SESSION.md`. Each row starts `` | `skill-name` | ``, which is the format the Step 5 count relies on.
    - `verdict` is one of REUSE, EXTEND or NEW.
    - `status` is `done` for `repository-knowledge` and `planned` for the rest.
    - Phases follow brief §29. `marvel-snap-orchestrator` goes in phase 14, and `news-intelligence` goes in phase 13 alongside the watchlist.
  - Then these sections:
    - "Routing": the brief §7 chains, using skill names.
    - "Deck-builder split": which agent becomes which skill.
    - "Adapted or deferred": each feature marked ADAPTED or DEFERRED with a one-line reason. At minimum: notification events, a database or storage layer, sync jobs or services, the user-facing dashboard, and live game or news fetching.
    - "Updating this file": update it at the end of every phase.

- [ ] **Step 2: Rewrite Agent 1's Inputs and Work.**
  - Inputs: run `node scripts/repo-tools/check-repo-map.js`, read `.claude/skills/repository-knowledge/repo-map.md`, and read `<runDir>/context.json`.
  - Work, step 1: verify claims from the map and the scripts (`current-state.js` output). Open the HTML only when the map does not cover a claim or the check printed STALE. Evidence is `repo-map.md#<section>` or `file:identifier`.
  - Work, step 2: report which files were opened.
  - The handoff shape is unchanged.
  - In deck-builder `SKILL.md` step 1, add one sentence: Agent 1 reads the repo map, so this stage is cheap.

- [ ] **Step 3: Dry run Agent 1.**
  - Copy `C:\Users\natta\Desktop\AI\Marvel Snap\deckbuild-runs\2026-09-29\` to `<scratchpad>/dryrun-agent1/`.
  - Dispatch a sonnet subagent with the Agent 1 brief and `rules.md`, with `runDir` set to that copy, writing `01-repository.json`.
  - Expected:
    - every `context.json` claim has a CONFIRMED or REFUTED verdict
    - `dataSources`, `uiFlow`, `existingDeckLogic`, `importPath` and `integrationPoints` are non-empty
    - its report says the HTML was not opened, or opened only via targeted grep
  - Check the result with node:
    ```
    const h=require('./01-repository.json').handoff;
    h.claims.every(c=>/CONFIRMED|REFUTED/.test(c.verdict))
    ```
    Expected: `true`.

- [ ] **Step 4: Trim `NEXT-SESSION.md`.**
  - Replace the "Existing pieces to fold in" table and the "Genuinely new" paragraph with a link to `docs/skills/ECOSYSTEM.md`.
  - Mark phase 1 done and name phase 2 (`game-data-intelligence`) as next.

- [ ] **Step 5: Run the final checks.**
  - `node --test scripts/repo-tools/`: pass.
  - `node scripts/repo-tools/check-repo-map.js`: PASS.
  - Count ECOSYSTEM rows with `node -e "const t=require('fs').readFileSync('docs/skills/ECOSYSTEM.md','utf8');console.log((t.match(/^\| `[a-z-]+` \|/gm)||[]).length)"`. Expected: `26`.

- [ ] **Step 6: Commit** with message `Add ecosystem map; deck-builder Agent 1 reads the repo map`.

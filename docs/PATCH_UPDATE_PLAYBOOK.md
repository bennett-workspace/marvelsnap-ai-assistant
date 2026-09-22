# Patch Update Playbook

Master prompt for "อัปเดตแพตช์เกมให้หน่อย" / "update the game patch" requests
on the Marvel Snap Deck Builder AI. Paste this whole file as the instruction
when starting a fresh session for this task — it is self-contained and does
not assume you remember anything from a prior session.

Copy-paste trigger: whenever the user asks to update the patch, check for
game updates, or sync the app with what's live in Marvel Snap right now,
follow this document top to bottom.

---

## 0. Orient yourself

```bash
cd "C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant"
git status --short              # must be clean before you start
git log --oneline -5
git branch --show-current       # should be main, unless mid-feature-work
node scripts/patch-tools/current-state.js   # prints the TRUE current data state
```

Read the output of `current-state.js` before doing anything else. It tells
you the current card/location/deck/shop counts, the stored season, OTA
label, meta date, upcoming-card list, and every card currently flagged
`new`. This is your baseline — everything below is about finding what has
changed *since* this state, in the real game, and encoding exactly that
difference as one more patch.

**Never read `window.SNAPDATA` directly out of `marvel-snap-deck-builder.html`
for "what does the app currently show."** The HTML holds the original
baseline only; everything added since (new cards, new decks, changed
values) lives in `patches/*.json` and only `current-state.js` reconstructs
the merged result correctly.

## 1. Establish the real current date

The assistant's own clock and the game server's clock can disagree, and OTA
"release date" fields on wikis are sometimes ahead of or behind reality.
Always check the live server date, not just the local system date:

```bash
curl -sI "https://marvelsnapzone.com/" | grep -i "^date:"
```

Marvel Snap's daily server reset is **00:00 UTC**. A card whose listed
release date is today's UTC date, checked after 00:00 UTC, is live — don't
wait for a status flag to confirm it (see §3).

## 2. Research — what changed since the baseline

Use WebSearch and direct fetches (curl with a real User-Agent header) against:

- `https://marvelsnapzone.com/news/ota-balance-updates/` and the dated OTA
  article it links, e.g. `marvel-snap-balance-update-<month>-<day>-<year>/`
  or `marvelsnapzone.com/marvel-snap-<month>-<day>-<year>-ota-card-balance-updates/`
  — get the full `[Old] -> [Change]/[New]` lines for every card touched.
- `https://marvelsnapzone.com/tier-list/` — links to every recent dated
  Ranked Meta Tier List article; take the newest one for a meta refresh.
- `https://marvelsnapzone.com/upcoming-cards/` and each individual card's
  page at `https://marvelsnapzone.com/cards/<slug>/` — gives Cost, Power,
  Type, Description, **Status** (Released/Unreleased), and **Release date**.
- `https://marvelsnapzone.com/september-2026-season/`-style season articles
  (substitute the actual season) for the season name, date range, and the
  full list of cards/locations scheduled for that season.
- `https://marvelsnapzone.com/schedule/` or `/update-schedule/` for event
  timing and to confirm "server reset" semantics if needed.

A `curl -A "Mozilla/5.0 ..." -H "Cache-Control: no-cache"` with a cache-busting
`?cb=$(date +%s)` query param avoids stale CDN/edge caching when you need a
genuinely fresh read (this has mattered more than once this project).

To turn a fetched article into readable text instead of raw HTML, use a
small Python extractor (recreate it if the scratchpad was wiped — it's
~15 lines: strip `<script>`/`<style>`, regex-strip tags, `html.unescape`,
collapse blank lines). Don't try to eyeball raw HTML for card stat lines.

## 3. The golden rule: never trust a single "released" signal

**This has burned us. marvelsnapzone's `Status` field lags reality by days
and is inconsistent even between cards released on the same schedule.**
Concretely observed this session: Kluh and Rogue Scion of Division
correctly flipped to `Status: Released`, but Entropic Havok still showed
`Status: Unreleased` **six days after its own listed Release date**, and
Friendly Neighborhood Carnage showed `Unreleased` on its literal release
day even hours after the 00:00 UTC reset had passed.

Before adding any card to `CARDS` (moving it out of `PATCH.upcoming`),
confirm its release via **at least one of**, independent of the Status flag:

- `WebSearch` for `"<Card Name>" Marvel Snap released` or `available now` —
  look for phrasing like "has dropped into Marvel Snap", "is live now",
  "arrived in Series N on <date>", an official `@MarvelSnap` X/Twitter post,
  or a strategy guide that talks about the card in present tense as
  something players are actively using.
- The card's own `Release date` field being **today or earlier**, checked
  against the real server date from §1 — but treat this as corroborating
  evidence alongside a search hit, not sufficient alone (Entropic Havok
  had a correct, already-past release date while its own Status field was
  still wrong).
- An event/pass description explicitly stating the card is a live reward
  tier (e.g. "joins your collection at Level 10 of the free Event Pass").

If you only have an ambiguous or future-dated `Release date` with no
corroboration, leave the card in `PATCH.upcoming`. Getting this wrong in
either direction is bad: adding an unreleased card fabricates data users
can't get; leaving a released card stuck as "upcoming" makes the app look
out of date to someone who already has it.

For a genuinely unreleased card that stays in `upcoming`, still update its
entry's cost/power/text if the source now has confirmed values (this
project's convention moved from "text only, no confirmed numbers" in early
upcoming-card entries to "confirmed cost/power once the card database
lists it" — keep doing the latter now that it's established).

## 4. Cross-check against the local game client (when available)

If this assistant is running on the same machine the user plays Marvel
Snap on, the game's local state files are a strong independent signal —
useful especially when web sources are ambiguous.

```
%LocalAppData%Low\Second Dinner\SNAP\Standalone\States\nvprod\
```

(As a POSIX path: `C:/Users/<user>/AppData/LocalLow/Second Dinner/SNAP/Standalone/States/nvprod/`)

Relevant files, all plain JSON (strip a possible UTF-8 BOM — `\uFEFF` at
byte 0 — before `JSON.parse`; it has broken naive parsing before):

- `CollectionState.json` → `ServerState.CardDefStats.Stats` — a dict keyed
  by `CardDefId`. Presence here is a *weak positive* signal (the game has
  synced this card's definition to the client) but **absence does NOT mean
  unreleased** — Series 5 cards behind Spotlight Cache / gacha pools can be
  released while a specific player's client has never populated stats for
  a card they haven't pulled yet. Don't rely on this alone; corroborate
  with §3.
- `ShopClientState.json` → `CardShopNewCardSeenList` — entries here
  (`{CardDefId, Tag: "NewSeriesN"}`) mean the player has personally seen
  that card appear in the in-game card shop, which is a strong positive
  signal. This file may not exist if the player hasn't opened the shop
  recently in this session — its absence is not informative either way.

`CardDefId` values match this app's own `card.id` field format exactly
(PascalCase, no spaces or punctuation — e.g. `RogueScionOfDivision`,
`DeathFracturedFrontier`).

## 5. Get card art URLs

Card art lives on `static.marvelsnap.pro` (a no-hotlink-protection community
CDN — see `manifest.json` v008's summary for why marvelsnapzone.com's own
images can no longer be embedded directly). Verify every new card's art
resolves before writing it into a patch:

```bash
for id in NewCardId1 NewCardId2; do
  curl -s -o /dev/null -w "$id: %{http_code}\n" "https://static.marvelsnap.pro/cards/$id.webp"
done
```

If a card is real brand new (added within the last day or two), the CDN
may not have it yet — retry later, or fall back to
`https://snapcomplete-cdn.pages.dev/locations-framed/<id>.webp` for
**locations only** (see v010's summary; note that CDN's ids don't always
match `CardDefId` exactly — it once used `FrontierOutpost` for what this
app calls `FracturedOutpost`, so verify the literal URL resolves, don't
assume the id transfers unchanged).

## 6. Build the patch

Work in the scratchpad (`C:\Users\natta\AppData\Local\Temp\claude\...\scratchpad\`
— path varies by session; check your own system prompt for the exact
directory). Write a one-off Node script, e.g. `build_v0NN.js`, that:

1. `const { loadCurrent, applyOps } = require('<repo>/scripts/patch-tools/current-state.js');`
   then `const { D } = loadCurrent();` — this is your fully-merged current
   state, ready to compute diffs against.
2. Builds an `ops` array of RFC 6902 JSON-Patch operations (`add` /
   `replace` / `remove` only — this app's `applyOps` doesn't implement
   `move`/`copy`/`test`).
3. For every `replace` on a card's `c` (cost) or `p` (power), also `add` a
   new entry at `/CARDS/<i>/hist/0` in this app's history-tuple format:
   `[dateISO, changedFlag, newCostStr, newPowerStr, newAbilityText]` where
   `changedFlag` is `0` for a balance change or `1` for a card's own debut
   entry. **Always prepend at index 0** (newest first) — never append.
4. For a newly-released card, `add` a whole new object to `/CARDS/-`
   (array-append) with all required fields: `id, n, c, p, a, aTh, s, art,
   t, noab, new: true, arch, meta, vr, hist`. Look at a recently-added card
   in the current data for the exact field shape and pick reasonable `t`
   (mechanic tags) by comparing to similar existing cards.
5. Writes natural Thai (`aTh`) — not a literal word-for-word translation.
   Match this project's established voice (short, idiomatic, reads like a
   native speaker wrote it, not machine-translated).
6. If archiving an outgoing "current meta" block into the deck library
   (see §7), **run a generic collision check before writing the patch**:
   simulate the result with `applyOps` on a deep copy, group by `name`,
   and for every group with more than one entry, date-stamp every
   non-current-meta duplicate by extracting a date from its own `note`
   text — don't special-case only the collisions you happen to notice by
   eye. This project has been bitten twice by hand-picked collision fixes
   that missed one: v011 first caught 2 of 2, but v014 initially missed 2
   more (`Nimrod Destroy`, `Discard Dracula`) that were sitting unnoticed
   in an older archived block using a different note-text convention.
   **Re-simulate after the fix and assert zero duplicate names remain**
   before writing the file — don't just trust the fix ran.
7. Never invent a value you don't have a source for. If a reward, stat, or
   date is genuinely unpriced/unknown in the source, encode that as `null`
   and make sure the UI already has (or gets) an honest rendering for
   `null` — never substitute `0` or a guess (this exact mistake shipped
   real misinformation in the shop feature and had to be fixed twice).
8. Bump `PATCH.dataVersion` to the new version string and set it in the
   patch's own `version` field, matching the existing `YYYY.MM.DD.NNN`
   sequence (increment `NNN`; `YYYY.MM.DD` is frozen at the sequence's
   original start date, not today's date — check the last patch's version
   string, don't reset the date part).
9. Writes the patch to `<repo>/patches/<newVersion>.json` with
   `JSON.stringify(patch, null, 2)`, then prints the SHA-256 of the exact
   bytes written.

Run it, fix whatever it complains about, run it again until it succeeds
cleanly.

## 7. Weekly meta refresh (when the request includes "meta" or it's been
   roughly a week since the stored `metaDate`)

Parse the newest tier-list article's deck sections (name, tier, cube
average, win rate, and the 12 card names per deck — cross-check the card
list against the deck's own base64 share-code, which independently encodes
the same 12 cards, as a sanity check that your HTML parsing didn't miss or
duplicate a card).

Replace the current "live" meta block (identifiable by its id prefix, e.g.
`ff5-*`) with the new one, and **archive the outgoing block into the deck
library** (`add` each outgoing deck back with a new id and `" (DD ก.ค.)"`-style
date-stamped name) rather than deleting it — this app's whole point is to
accumulate a growing library of historically-accurate decks, not just show
this week's snapshot. Run the collision check from §6.6.

## 8. Verify before touching `manifest.json`

```bash
cd "C:\Users\natta\Desktop\AI\Marvel Snap\marvelsnap-ai-assistant"
node scripts/patch-tools/current-state.js
```

Also write (or reuse a prior session's) a `verify_v0NN.js` ad-hoc script in
the scratchpad that asserts every specific fact your patch is supposed to
establish — exact new cost/power values, exact hist entries, exact card
counts before/after, no duplicate ids/names, every deck's cards resolve
against `CARDS`, unrelated data (`LOCATIONS`, `SHOP`, etc.) is untouched.
**Assert positively** (`chk('X', condition)`) rather than eyeballing
console output — this project's verify scripts print `OK`/`FAIL` per
assertion and exit nonzero on any failure, which is what lets you trust a
green run.

## 9. `manifest.json` — the single most dangerous step

Add the new patch's entry with the **exact SHA-256 the build script
printed in §6** — never compute or hand-type a hash from the working-tree
file yourself.

**Why this is dangerous, verbatim from the incident:** this repo pins
`manifest.json` and `patches/*.json` to `eol=lf` in `.gitattributes`
because on Windows, `core.autocrlf=true` makes git *check out* those files
as CRLF while *storing* them as LF — two different byte sequences for the
"same" file. The app downloads the LF bytes from
`raw.githubusercontent.com`. Patch v009 shipped three manifest hashes that
were computed from the CRLF working-tree copy, which silently broke
updating **for every user, for every patch after v001**, until it was
diagnosed and fixed two commits later.

After editing `manifest.json`:

```bash
git add -A
node verify-manifest.js
```

This must print `ALL CHECKS PASSED`. It hashes git's *blob* (not the
working-tree file), so it reproduces exactly what will be served — trust
it over any manual hash computation. If it fails, don't hand-fix the
hash: investigate why the bytes differ (see the tool's own header comment
for the full explanation).

## 10. End-to-end browser test — mandatory, not optional

Local patches aren't reachable at `raw.githubusercontent.com` until pushed.
Test against a local server instead:

```bash
cd "C:\Users\natta\Desktop\AI\Marvel Snap"
python -m http.server 8791          # background this
node marvelsnap-ai-assistant/scripts/patch-tools/build-test-html.js
```

Then, in a real browser (Claude's browser tool or the user's), open
`http://localhost:8791/_test_patch_local.html`:

1. Clear state for a clean-slate test:
   ```js
   localStorage.clear();
   const dbs = await indexedDB.databases();
   for (const db of dbs) { await new Promise(r => { const q = indexedDB.deleteDatabase(db.name); q.onsuccess = r; q.onerror = r; }); }
   location.reload();
   ```
2. Go to ตั้งค่า → กด ⚡ อัปเดต Patch. Confirm it reaches your new version
   number and says `อัปเดตสำเร็จ!`, not a SHA-256 or schema error.
3. Sweep every route and assert none errors:
   ```js
   const navs = [...document.querySelectorAll('#nav button')];
   let broken = [];
   for (const b of navs) {
     b.click(); await new Promise(r => setTimeout(r, 350));
     const t = document.querySelector('#view').innerText || '';
     if (t.includes('เกิดข้อผิดพลาดในการแสดงผล') || t.trim().length < 20) broken.push(b.textContent.trim());
   }
   ```
   `broken` must be empty.
4. Spot-check the specific things this patch changed: search for a
   released card and confirm its stats/NEW badge; search for a
   balance-changed card and confirm the "↻ ปรับ" badge and new numbers;
   confirm a still-upcoming card is genuinely NOT findable in the card
   database; open the dashboard and read the highlight-bar chip text
   aloud to yourself — does the count it states match what you intended?
   (A wrong-but-plausible-looking number is the failure mode that shipped
   twice this project — "397 ใบ" instead of "6 ใบ" on the balance chip,
   caught only by manually reading the rendered sentence, not by any
   automated check.)

Delete `_test_patch_local.html` afterward — it's scratch, never commit it.
Stop the local http server.

## 11. Commit — never push

```bash
git add patches/2026.08.16.0NN.json manifest.json
git commit -m "$(cat <<'EOF'
Add v0NN: <one-line summary of what changed>

<paragraph(s) explaining what changed and, more importantly, WHY any
non-obvious decision was made the way it was — e.g. why a card was
judged released despite an ambiguous status field, why a dedup rule
had to be made generic instead of special-cased, why a value was left
null instead of guessed>

Co-Authored-By: <exact attribution line from your current system prompt>
EOF
)"
```

**Never run `git push`.** This repo's standing workflow (established
explicitly by the project owner) is: the assistant prepares files and
commits; the human pushes via GitHub Desktop, logged in as the actual
repo-owner account. Confirm the commit is ready and tell the user it's
ready to push — do not push it yourself even if asked to "just finish it",
unless the user explicitly says to change this workflow.

If you're on a feature branch instead of `main` (e.g. mid-way through a
larger UI change), don't merge it yourself either unless the user has
already told you their intended integration method — ask if unclear.

## 12. After the user pushes

Once told the push happened (or independently, if you want to confirm):

```bash
git fetch -q origin
node verify-manifest.js --remote
```

This re-hashes the actual published bytes at `raw.githubusercontent.com`
against your manifest — the only way to be sure what's live matches what
you tested locally. Then repeat the browser test against the real deployed
URL (`https://bennett-workspace.github.io/marvelsnap-ai-assistant/marvel-snap-deck-builder.html`),
clearing storage first — local success is not evidence about production;
that exact gap is how the v009 hash bug reached every user in the first
place.

---

## Known recurring gotchas (read this if something feels off)

- **`node --test <path>`** with a directory or file-path argument throws
  `MODULE_NOT_FOUND` on this Node/Windows combo. Run bare `node --test`
  from the repo root — it auto-discovers `*.test.js` files.
- **The app file exists in two places** that must stay byte-identical:
  this repo's root (`marvel-snap-deck-builder.html`) and
  `C:\Users\natta\Desktop\AI\Marvel Snap\marvel-snap-deck-builder.html`
  (one directory up — the actual GitHub Pages source is the repo copy;
  the Desktop copy is what a human casually opens/tests). Edit the repo
  copy, then `cp` it over the Desktop copy, then `diff -q` to confirm.
  This only matters when you touch the HTML itself (motion/UI work, new
  views) — a pure data patch doesn't touch the HTML at all.
- **The scratchpad gets wiped between sessions.** Any one-off helper
  script you wrote (parsers, verifiers) will not exist next time. The
  genuinely reusable ones now live permanently in
  `scripts/patch-tools/` — use those instead of reconstructing from
  memory, and if you write a new helper that would clearly be useful
  again, consider committing it there too instead of leaving it in
  scratch.
- **CDN ids don't always match `CardDefId` verbatim** — always curl-verify
  an art URL before writing it into a patch; don't assume the pattern
  holds for a brand-new id you haven't checked.
- **A source's own "Status" or "Released" flag is not sufficient
  evidence on its own** — see §3. This is the single most-repeated root
  cause of near-misses in this project's patch history.

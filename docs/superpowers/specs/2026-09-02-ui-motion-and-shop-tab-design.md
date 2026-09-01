# UI motion pass, update highlight bar, and shop tab

Date: 2026-09-02
Status: approved for planning

## Goal

Make the deck builder feel alive when you use it, surface what changed in the
game since you last opened it, and answer a question the app cannot answer
today: what is on sale right now, and what is about to be.

## Scope

In scope:

1. A motion layer applied across all 15 views.
2. A highlight bar summarising recent game updates.
3. Three views rebuilt: dashboard, current meta, and a new shop view.
4. A `SHOP` data domain, delivered through the existing patch pipeline.

Out of scope, and deliberately so:

- Redesigning the other 12 views. They get the motion layer and nothing else.
- Variant/skin artwork. Bundles list rewards as variant ids (`LukeCage_10`);
  that art is not on any CDN we can hotlink, and this is unchanged from the
  v008 image migration.
- Any backend. The app stays a single static file.

## Decision: how shop data reaches the app

Chosen: **ship a dated snapshot inside a patch; let the client decide status.**

Each bundle carries `from` and `to` dates. At render time the client compares
them against today and files each bundle under live / upcoming / ended. A
snapshot taken today already contains bundles running to 7 Sep, so one patch
stays useful for about a week with no further work.

Rejected alternatives:

- **Fetch from snap.fan at runtime.** Verified possible — they send
  `Access-Control-Allow-Origin: *` — but they publish no JSON API, so the app
  would have to parse their HTML in the browser. When marvelsnapzone.com
  restructured its image URLs earlier this cycle, every card image broke
  silently; the same failure mode would apply here, except in a code path
  users hit on every load. It also makes a third party's uptime our uptime.
- **Snapshot plus a live refresh button.** Two parsers to maintain for a
  freshness gain that a weekly patch already covers.

The snapshot's weakness is staleness, so the design makes staleness visible
rather than hiding it (see "Honest staleness" below).

## Data design

A new top-level `SHOP` key in `window.SNAPDATA`, added by patch `2026.08.16.012`:

```js
SHOP: {
  snapshotAt: '2026-09-02',            // ISO date the scrape was taken
  source: 'snap.fan/bundles',
  bundles: [
    {
      id: 'sep-26-cage',               // slug, stable across snapshots
      name: 'Sep 26 Cage',             // as published; see "Naming" below
      from: '2026-09-01',
      to:   '2026-09-05',
      price: { kind: 'usd', amount: 4.99 },   // or { kind:'gold', amount:600 }
      valuePct: 1334,                  // "Bundle Value"
      currencyPct: 157,                // "Currency Value"
      goldValue: 5325,                 // "Total Gold Value"
      items: [
        { kind: 'variant', card: 'Luke Cage', variantId: 'LukeCage_10', goldValue: 700 },
        { kind: 'tokens',  qty: 500, goldValue: 625 }
      ]
    }
  ]
}
```

`item.kind` is one of: `variant`, `tokens`, `credits`, `boosters`, `gold`,
`avatar`, `title`, `border`, `key`, `other`. Anything unrecognised becomes
`other` with its raw label preserved, so an unfamiliar reward degrades to a
plain line rather than being dropped or mislabelled.

`items[].goldValue` may be `null` — snap.fan leaves some rewards unpriced.
Render those as "ไม่ตีราคา", never as zero.

### Producing it

A build script, `scripts/build-shop-patch.js`, scrapes snap.fan, maps the
fields above, and emits the patch. It must fail loudly rather than emit
partial data: if a bundle has no parseable date range or price, the script
aborts and names the bundle. Silent partial output is how bad data ships.

Dates come as `Sep 1 - Sep 5` with no year. The script resolves the year
against `snapshotAt`, rolling to the next year when a range would otherwise
land in the past — a December-to-January window must not resolve backwards.

### Naming

Bundle names are internal codenames (`Sep 26 Barg 01`). The script strips a
leading `MMM YY ` prefix for display and nothing else. It does not invent
friendlier names: a made-up name is fabricated data, and the user should be
able to match what they see here against what the game shows them.

## Honest staleness

The shop view always shows `ข้อมูล ณ <snapshotAt>`.

When `today - snapshotAt > 10 days`, it shows a warning that the data is old
and links to the source, and the "ขายอยู่ตอนนี้" heading gains a qualifier.
Beyond `to` of the last bundle in the snapshot the view says it has run out of
data rather than showing an empty "nothing on sale" state, which would read as
a fact rather than as absence of data.

## Motion layer

New CSS tokens beside the existing ones:

```
--dur-fast: 120ms;  --dur: 220ms;  --dur-slow: 420ms;
--ease:   cubic-bezier(.22,.61,.36,1);    /* standard ease-out */
--ease-spring: cubic-bezier(.34,1.56,.64,1);  /* overshoot, for press/pop */
```

Keyframes, kept to a small set so the app feels coherent rather than busy:
`viewIn` (fade + 8px rise), `itemIn` (the staggered version), `pulse` (for the
highlight bar), `shimmer` (skeleton placeholders).

Applied as:

- **View change** — `render()` adds a class to `<main>`; content fades and
  rises. One animation on the container, not per element.
- **Stagger** — cards animate in sequence via an inline `--i` index and
  `animation-delay: calc(var(--i) * 28ms)`.
- **Hover** — 2px lift plus border brightening on cards.
- **Press** — `:active { transform: scale(.97) }`, using `--ease-spring`.
- **Skeletons** — shimmer blocks while images load.

### Performance constraint

The deck library renders 77 decks and 924 images in one pass. Staggering all
of them would queue an animation delay of over 25 seconds on the last card and
risks jank on a long list.

**Stagger is capped at the first 12 elements of any list**; everything after
index 12 gets `--i: 12` and animates with the same delay as the twelfth. This
must be enforced where the index is emitted, not by trusting call sites.

Verification is not "it looks smooth" — measure. The deck library must stay
above 50fps during its entry animation on a mid-tier profile, checked with the
browser performance trace, and the numbers recorded before this is called done.

### Reduced motion

Line 262 already kills all animation and transition under
`prefers-reduced-motion: reduce`, and disables the starfield. Every keyframe
added here must sit inside that guard's blast radius — that is, be a plain
`animation`/`transition`, not a JS-driven tween that the media query cannot
reach. Any JS-driven motion has to check the media query itself, the way the
starfield already does at line 2740.

## Highlight bar

Derived entirely from data already present. It stores nothing new, so it
cannot go stale independently of the data it describes:

- Season — `P.season`.
- Balance — `P.ota`, plus a count of cards whose `hist[0]` is a change
  (`hist[0][1] === 0`) dated within 14 days of `P.metaDate`.
- New cards — count of `CARDS` with `new: true`.
- Coming — `P.upcoming.length`.

A chip is omitted when its count is zero rather than rendering "0 new cards".

Dismissal is stored per data version (`snapdb.highlight.dismissed.<dataVersion>`),
so applying a patch brings the bar back. Dismissal is a convenience, not a
preference to persist forever.

The bar is not a live region and must not steal focus; it is a summary, and
screen-reader users reach it in normal document order.

## The three rebuilt views

**Dashboard** — highlight bar at the top, then the season card, then stat
tiles with counts that count up on first paint, then the top three meta decks.
The current dashboard buries the season banner under a wall of prose; the
rebuild leads with what changed.

**Current meta** — the tier table becomes grouped tier sections with the deck
name, cube, and win rate legible at a glance; upcoming cards become a card
grid rather than a text list. The existing caption about cost/power provenance
stays accurate as written.

**Shop (new)** — a new nav entry and route `shop`, sectioned into ขายอยู่ตอนนี้
/ กำลังจะเข้า / จบแล้ว. Each bundle shows name, date range, price, value
percentage, and an expandable reward breakdown. Value percentage is coloured
against a fixed scale so a 1334% bundle reads as exceptional without the user
doing arithmetic. Where a reward is a variant, the base card's art is shown
labelled as a skin, since variant art itself is unavailable.

## Testing

Per-piece, before the whole is called done:

1. **Shop build script** — unit tests for the date parser, covering the
   year-rollover case and a malformed range, and for price parsing across
   `$4.99`, `600 Gold`, and `1,500 Gold`. These are pure functions and get
   tests first.
2. **Client status filtering** — given a fixed snapshot and an injected
   "today", the correct bundles land in each of the three sections. Boundary
   days (`from === today`, `to === today`) belong to live.
3. **Patch chain** — `verify-manifest.js` passes, and the full v001→v012 chain
   applies with the existing integrity checks.
4. **Motion** — the frame-rate measurement above, plus a
   `prefers-reduced-motion` pass confirming no motion.
5. **Live** — after push, confirm on the deployed URL, not only locally. The
   v009 hash incident happened precisely because local testing served
   different bytes than production.

## Risks

- **snap.fan markup changes** break the build script. Contained: it is a build
  step, so it fails on our machine with a loud error, not in users' browsers.
- **Bundle codenames are opaque.** Accepted; inventing names is worse.
- **Scope creep into the other 12 views.** The motion layer is shared CSS; if
  a view needs bespoke layout work to accommodate it, that is a separate task.

## Open questions

None blocking. Bundle name presentation may want revisiting once the shop view
is real and we can see how the codenames read in context.

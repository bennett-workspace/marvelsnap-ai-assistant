# Marvel Snap AI Assistant — Patch Data Repo

This repo hosts patch data for the [Marvel Snap Deck Builder AI](https://github.com/bennett-workspace/marvelsnap-ai-assistant) single-file HTML tool.

It contains **no server code** — the client app fetches `manifest.json` and patch files
directly from this repo via [jsdelivr's GitHub CDN](https://www.jsdelivr.com/?docs=gh)
(`cdn.jsdelivr.net/gh/...`), which serves public GitHub repo content with CORS enabled,
so no backend is required.

## Structure

- `manifest.json` — lists all available patch versions, their download URL, and SHA-256 hash
- `patches/{version}.json` — individual patch files, each a small set of
  [JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902) (RFC 6902) operations
  (`add` / `replace` / `remove`) applied against the app's in-memory data — **not** a full
  data replacement, so downloads stay small even as the card/location database grows.

## Versioning

Version strings are `YYYY.MM.DD.NNN` (date + sequence number), always increasing,
so simple string comparison determines "newer".

## How a patch gets published

There's no automated pipeline (by design — no backend to run one). A patch is authored by:
1. Comparing the current live Marvel Snap data (cards, locations, balance changes) against
   what's already baked into the client, usually via a Claude session doing the research/scraping
2. Writing the diff as a `patches/{version}.json` file
3. Computing its SHA-256 and adding an entry to `manifest.json`
4. Committing and pushing

The client verifies the hash before applying anything, and keeps one previous snapshot in
IndexedDB for one-step rollback if a patch turns out to be wrong.

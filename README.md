# ArcheAge Chronicles Farm Tracker

**English** · [Italiano](README.it.md)

Pick the items you want to craft in **ArcheAge Chronicles** and find out which materials you need to farm. The tool walks down the recipe tree to the raw materials, groups them, tells you in which order to craft every step (with profession, level and station) and works out the total gold cost. You mark how many materials you already have and see what is missing.

> **Project status:** the code is public, but the **item data (`data/items.json`) is not published yet**: publishing it depends on MetaForge's permission to collect and republish it. Until the data is there, the published page shows "Data unavailable" and the automatic update is switched off. The `data/overrides.json` file (manual corrections, see below) is already included.

## How to use it
1. **Pick what to craft.** Browse the sections (Weapons, Armor, Accessories, …) and types, or type to filter the list. The list is sorted by rarity, from the weakest to the strongest (Common → Uncommon → Rare → Epic → Legendary), and alphabetically within each rarity. Click an item to add it, or press Enter to add the first one in the list.
   **Hover over any item** (or focus it with the keyboard, or tap it on a touch screen) to see its details as on MetaForge: level, slot, set, weight, durability, sell price, stats, random options, description and the crafting recipe.
2. **Read the materials** you need to farm: *Needed / Have / Missing*. Use the −/+ buttons to mark how many you already have.
3. **Follow the crafting steps** from top to bottom: they are numbered and split into stages, from the most basic items (raw materials only) up to the item you want to craft.
4. **Intermediates** lets you choose whether materials such as *Standard Textile* are crafted (the tool goes down to the raw materials) or farmed.
5. The interface is in English by default; the **IT** button at the top right switches it to Italian (your choice is remembered). Item names are always the English ones from MetaForge.
6. Your progress stays in your browser. Use **Export/Import** to move it to another device.

It also works as a local file: download `index.html` and open it. Data is always read from this repository (`data/`), so it stays up to date without downloading anything again. After the first load the latest version is cached and the page works offline.

### Single offline file
`node scraper/build-offline.mjs` creates `dist/farm-tracker-offline.html`: one file with the data embedded, which works with a double click (no server, no internet; only the item icons need a connection). It needs `data/items.json` and `data/meta.json` on your machine, and `dist/` is git-ignored. The file contains MetaForge data, so please do not republish it without MetaForge's permission.

## How the data is kept up to date
A scraper (`scraper/`, Node 20 + Playwright) reads the [MetaForge](https://metaforge.app/archeage-chronicles/database) database and regenerates `data/items.json` and `data/meta.json`. A GitHub Action (`.github/workflows/scrape.yml`) runs it on demand from the *Actions* tab and commits only if something changed; the weekly schedule (every Monday) is ready but **switched off** until MetaForge gives permission. If the safety checks fail (far fewer items, unknown ingredients, empty recipes) nothing is written and the Action fails.

To regenerate the data by hand:
```
npm --prefix scraper ci
npx --prefix scraper playwright install chromium   # or PW_CHANNEL=msedge to use Edge
node scraper/run.mjs
```

### Manual corrections: `data/overrides.json`
When a patch changes recipes before MetaForge updates its database, they can be corrected by hand without scraping again. The page downloads `overrides.json` every time it opens and applies it on top of the data (corrected steps show a **patch** badge). You can edit it directly on the GitHub website.
```json
{
  "standard-bonecraft": {
    "note": "Patch 2026-11-17",
    "ingredients": [{ "id": "bone-chip", "qty": 15 }]
  }
}
```
Allowed fields (all refer to the first recipe): `ingredients` (replaces the list), `gold`, `yield`, `note`. An invalid correction is ignored. Once MetaForge catches up, the entry should be removed.

The current file holds 17 processed-goods recipes changed by the November 17, 2026 patch (Sweetgrass Powder and monster loot removed from processed goods, as stated in the developers' letter): the 9 "base" recipes (Standard …) and the 8 "Fine …" ones. Only Standard Bonecraft, Fine Additive and Fine Bonecraft are **confirmed in game**; the others are derived by analogy and still need checking. The "Superior …" recipes are not corrected yet.

### `data/items.json` format
```json
{
  "cultist-hood": {
    "name": "Cultist Hood", "category": "armor", "rarity": "Uncommon", "type": "Cloth", "icon": "UI_Item_….webp",
    "info": {
      "rows": [["Item Level", "10"], ["Slot", "Helmet"], ["Weight", "3.045"], ["Sell Price", "50 Gold"]],
      "stats": [["Physical DEF", "12"], ["Magic DEF", "23"]],
      "random": [["SP Regen", "5-6"]],
      "description": "A hood crafted using techniques…"
    },
    "crafts": [{
      "profession": "Tailoring", "level": 1, "stations": ["Armor Workbench", "Light Armor Workbench"], "gold": 3000,
      "ingredients": [{ "id": "standard-textile", "qty": 2 }, { "id": "rag-scrap", "qty": 20 }]
    }]
  }
}
```
`info` (tooltip data, shown at its "Untempered" values) is present for craftable items and optional. An empty `crafts` means a raw material. `yield` (optional, default 1) is how many items one craft produces.

## Development
```
node --test 'tests/*.test.js' 'scraper/tests/*.test.mjs'
```
The parser tests use sample pages from MetaForge that are **not included** in the repository (they are copies of their pages): `PW_CHANNEL=msedge node scraper/capture-fixtures.mjs` downloads them; without them those tests are skipped.

`index.html` is the whole app (no build step). The pure logic lives in the `<script id="core">` block, which is tested in Node. Manual UI checklist: `tests/ui-checklist.md`. Design and plan (written in Italian): `docs/superpowers/`.

## Credits and notes
- Data collected from [MetaForge](https://metaforge.app/archeage-chronicles/database): thanks to their maintainers. Images are **not copied into this repository**: `items.json` only holds each icon's file name, and the page loads it directly from `static.metaforge.app` (it is hidden if it fails to load).
- ArcheAge Chronicles and its content belong to their respective owners. This is a fan project, **not affiliated** with the game's developers or with MetaForge.
- The code is released under the MIT license (see `LICENSE`). The data remains the property of its respective owners.

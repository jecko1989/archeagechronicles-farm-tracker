# ArcheAge Chronicles Farm Tracker

**English** · [Italiano](README.it.md)

Pick the items you want to craft in **ArcheAge Chronicles** and find out which materials you need to farm. The tool walks down the recipe tree to the raw materials, groups them, tells you in which order to craft every step (with profession, level and station) and works out the total gold cost. You mark how many materials you already have and see what is missing.

> **Data:** the item data (`data/items.json`) comes from [MetaForge](https://metaforge.app/archeage-chronicles/database) and is published here with the go-ahead of their team (they said they are happy for it to be used to get the tool running, and asked for a credit, which is given here and in the page footer). They are looking into proper API routes for developers; if they ask for the data to be removed or changed, it will be. The automatic update is switched off for now: refresh the data by running the scraper by hand (see below).

## How to use it
1. **Pick what to craft.** Browse the sections (Weapons, Armor, Accessories, …) and types, or type to filter the list. The list is sorted by rarity, from the weakest to the strongest (Common → Uncommon → Rare → Epic → Legendary), and alphabetically within each rarity. Click an item to add it, or press Enter to add the first one in the list.
   **Hover over an item in the list or in your selection, or over the icon of a material or crafting step,** (or focus it with the keyboard, or tap it on a touch screen) to see its details as on MetaForge: level, slot, set, weight, durability, sell price, stats, random options, description and the crafting recipe. For raw materials the tooltip also says **where to get it** (who drops it, merchants, chests), when MetaForge has that information.
2. **Read the materials** you need to farm. Right under the title the tool lists what the item needs directly (for example *5 × Superior Ingot, 5 × Superior Archeum, 10 × Void Heart…*); below it, the full list of raw materials: *Needed / Have / Missing*. Use the −/+ buttons to mark how many you already have. Click a material (or a crafting step) to open its MetaForge page in a new tab, for example to see where it drops. Type a price in the **Gold each** column to add what the missing materials would cost you to buy to the total (empty = you farm it yourself, 0 gold); prices are saved with your progress.
3. **Follow the crafting steps** from top to bottom: they are numbered and split into stages, from the most basic items (raw materials only) up to the item you want to craft. **Already own some crafted items** (for example Standard or Superior Archeum, Ingots, Additives)? Type how many on the right of each step (or use −/+): fewer crafts are needed, the raw materials above and the total gold cost drop accordingly, and a fully covered step shows ✓. Or just tick the box on the left of a step to mark it as done (it is the same as owning all of it; untick it to undo): the steps title counts how many are done. Owning an item also covers everything below it, so the steps that only fed it need no raw materials any more.
4. **Trade tab** (next to Crafting): for the materials that can also be obtained with trade goods (Standard / Fine / Superior Ingot, Additive, Textile, Leather, Lumber, Archeum, Stone) it tells you where to deliver, how many crates, trips and days it takes, and the crafting gold. Every ratio is labelled *estimate* until you note real deliveries in the **delivery log** (crates, materials put in, materials received): from then on the ratio comes from your own last 5 deliveries. On top of it, the **Recommended plan** tells you, for every tradeable material, whether to **craft** it or **trade** for it, with a goal switch: **Farm less** (fewest raw materials) or **Gold spent** (fewest gold in crafting and crate fees, plus the price of the materials you still have to buy, if you set any in Crafting; with no prices it works as before). It looks at the whole recipe tree, so a material that only exists to make another one is not counted twice, and it never recommends a plan worse than just crafting everything (it shows both results side by side). The material to put in the crates is chosen for you: the cheapest of a different family. Decisions use the *estimate* ratios until you log real deliveries. Under the plan you also see what you **obtain by trading** and what you **put in the crates**, besides the raw materials to farm. Bones cannot be traded, so they stay in the "farm them" list.
   **Share a selection:** the address bar always shows what you picked and the open tab, for example `…/index.html#craft/cultist-hood:2,cultist-robe` (`#trade/…` opens the Trade tab). Copy it, or paste one into the address bar: it replaces your current selection (your progress and prices are not touched). Unknown items are ignored.
5. The interface is in English by default; the **IT** button at the top right switches it to Italian (your choice is remembered). Item names are always the English ones from MetaForge.
6. **Saved plans** (bottom of the page): type a name and press *Save current* to keep your items, owned amounts and prices as a plan; *Load* brings it back (it replaces what you have now, the delivery log is shared by all plans) and saving with an existing name replaces that plan.
7. Your progress (including the delivery log) stays in your browser. Use **Export/Import** to move it to another device.

It also works as a local file: download `index.html` and open it. Data is always read from this repository (`data/`), so it stays up to date without downloading anything again. After the first load the latest version is cached and the page works offline.

### Single offline file
`node scraper/build-offline.mjs` creates `dist/farm-tracker-offline.html`: one file with the data embedded, which works with a double click (no server, no internet; only the item icons need a connection). It needs `data/items.json` and `data/meta.json` on your machine, and `dist/` is git-ignored. The file contains MetaForge data, so please do not republish it without MetaForge's permission.

## How the data is kept up to date
A scraper (`scraper/`, Node 20 + Playwright) reads the [MetaForge](https://metaforge.app/archeage-chronicles/database) database and regenerates `data/items.json` and `data/meta.json`. It covers weapons, armor, accessories, bags, gliders, consumables, materials, tools and Housing; of Housing it only takes houses, annexes and stations (the items crafted with Engineering), not the furniture. A GitHub Action (`.github/workflows/scrape.yml`) runs it on demand from the *Actions* tab and commits only if something changed; the weekly schedule (every Monday) is ready but **switched off** for now (MetaForge is working on API routes for developers). If the safety checks fail (far fewer items, unknown ingredients, empty recipes) nothing is written and the Action fails. The scraper also reads the date of the latest entry of MetaForge's patch notes and saves it as `patch` in `data/meta.json`: the page shows it next to the update date ("latest MetaForge patch notes: …"), so you can tell if a recent patch may not be in the data yet.

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
    "note": "Patch notes 2026-11-25",
    "ingredients": [{ "id": "bone-chip", "qty": 6 }]
  }
}
```
Allowed fields (all refer to the first recipe): `ingredients` (replaces the list), `gold`, `yield`, `note`. An invalid correction is ignored. Once MetaForge catches up, the entry should be removed.

The current file holds 2 recipes changed by the items/trade patch notes of November 2026: Standard Leather (Raw Pelt 15 → 6) and Standard Bonecraft (Bone Chip 15 → 6). They come from the patch notes and are **not yet checked in game**; remove them once MetaForge catches up. The 15 processed-goods recipes of the November 17, 2026 patch (Sweetgrass Powder and monster loot removed, confirmed in game) were removed from this file on November 25, 2026, because MetaForge's data already matches them.

### Trade data: `data/trade.json`
Hand-written (it does not come from MetaForge): the six trading posts with what they give (`families`, plus a special `seed`), the crate recipe per level (materials and gold per crate), the estimated ratios received/put in, and the limits (7 crates per trip, 3 peace + 3 conflict trips a day). The page downloads it every time it opens; if it is missing or broken, the Trade tab shows "Trade data unavailable" and everything else keeps working. To fix a value, edit the file on GitHub. A `null` ratio means "no data yet".
```json
{
  "posts": { "watchers": { "name": "Watcher's Trading Post", "families": ["additive"], "seed": "pumpkin" } },
  "packs": { "standard": { "input": 9, "gold": 80 }, "fine": { "input": 3, "gold": 200 }, "superior": { "input": 1, "gold": 1000 } },
  "ratios": { "default": { "standard": 1.22, "fine": 1.1, "superior": null }, "byFamily": { "stone": { "standard": 0.9 } } },
  "limits": { "perTrip": 7, "craftedCap": 10, "tripsPerDay": { "peace": 3, "conflict": 3 } }
}
```

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
`info` (tooltip data, shown at its "Untempered" values) is present for craftable items and optional; raw materials can have `info.where`, MetaForge's one-line "Where to Get" summary (absent when the page has none, e.g. gathered materials). An empty `crafts` means a raw material. `yield` (optional, default 1) is how many items one craft produces.

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

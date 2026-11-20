# Consiglio "craft o commercio" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nella tab Trade, un interruttore "Farmare meno / Gold spesi" e un piano consigliato che sceglie, per ogni materiale commerciabile dell'albero, craft o commercio, senza doppi conteggi e senza mai essere peggiore del solo craft.

**Architecture:** funzioni pure nel blocco `<script id="core">` di `index.html`: `computeNeeds` riceve l'opzione `obtained`; `decideItems` calcola i costi unitari sull'albero (programmazione dinamica, coppie `[primario, secondario]`) e decide craft/commercio per materiale; `recommendPlan` ricalcola in modo esatto con il motore esistente, risolve i conflitti e applica la guardia contro il solo craft. L'interfaccia aggiunge un blocco "Consiglio" in cima alla tab Trade.

**Tech Stack:** HTML + JS senza build, `node:test`, Playwright (solo verifica manuale, già in `scraper/node_modules`).

**Spec:** `docs/superpowers/specs/2026-11-20-trade-recommender-design.md` (approvato). Estensioni decise qui rispetto allo spec §5: `decideItems` è una funzione pura separata (lo spec lasciava la scelta al costruttore); `Recommendation.plan` ha anche `crates`, `trips`, `days` (nel piano consigliato le righe non si sovrappongono, quindi le somme sono valide, a differenza della tab "alternative"); ogni decisione ha anche `needed`, `why`, `ratio`, `ratioSource`, `ratioN`, `inputId`.

## Global Constraints
- Un solo `index.html`, JS senza build; logica pura nel blocco `core` con test `node:test`.
- Il repo pubblico resta "solo codice"; nessun dato MetaForge nuovo.
- Autore dei commit: noreply (identità già impostata nel repo); trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; **push solo su richiesta**.
- Interfaccia in inglese di base, italiano selezionabile (`STRINGS.en` e `STRINGS.it` con le stesse chiavi: lo verifica `tests/i18n.test.js`).
- Layout che regge a 380 px, senza scorrimento orizzontale.
- Ogni decisione è etichettata "stima" oppure "dal tuo registro" (anti-obiettivo dello spec).
- Suite completa: `node --test 'tests/*.test.js' 'scraper/tests/*.test.mjs'` (oggi 154 test, 0 fail).

## Review Focus
Condizioni che lo spec implica ma i test di base non esercitano da soli; ognuna ha il suo test nel task indicato.
1. Materiali annidati: se conviene il commercio del Fine, lo Standard che serviva solo a lui sparisce e non si conta due volte → Task 3.
2. Quantità piccole (le casse sono intere): il consiglio non è mai peggiore del solo craft sull'obiettivo scelto → Task 3 (guardia).
3. Un materiale scelto per il commercio che serve anche come materiale di partenza di un'altra cassa → Task 3 (conflitto).
4. Rapporto sconosciuto o nessun materiale per riempire le casse: si consiglia il craft, con il motivo, senza `NaN`/`Infinity` → Task 2.
5. Cicli di ricette, id sconosciuti, nessun obiettivo, oggetti già posseduti: nessuna eccezione e nessun ciclo infinito → Task 2 e Task 3.

---

### Task 1: opzione `obtained` in `computeNeeds`

**Files:**
- Modify: `index.html` (`computeNeeds` e il suo commento)
- Create: `tests/recommend.test.js`

**Interfaces:**
- Produces: `computeNeeds(items, targets, opts)` con `opts.obtained?: string[] | Set<string>`. Gli id in `obtained` **non vengono espansi** in grezzi: restano in `materials` con la quantità richiesta e non producono passi né gold; fa eccezione un id che è anche un obiettivo esplicito (quello si espande). `opts.have` non si applica agli id ottenuti (la quantità in `materials` è quella richiesta: la sottrae chi chiama).

- [ ] **Step 1: scrivere i test** in `tests/recommend.test.js` (struttura come `tests/stock.test.js`: `loadCore`, `loadSample`, `plain`; `hood` = 2 textile + 20 rag + 8 mask, 3.000 gold; `textile` = 3 fiber + 5 powder + 5 rag, 100 gold):
  - `'obtained: l oggetto resta tra i materiali e non genera passi né gold'` → `hood ×1`, `obtained: ['textile']` → `materials` = `{textile: 2, rag: 20, mask: 8}`, passi `['hood']`, `gold` 3000.
  - `'obtained accetta anche un Set'` → stesso risultato con `new Set(['textile'])`.
  - `'obtained non espande nemmeno gli ingredienti più in basso'` → catena `a ← b ← c ← y` (come in `tests/calc.test.js`), `obtained: ['b']` → `materials` = `{b: 1}`, nessun `c` né `y`.
  - `'un obiettivo esplicito si espande anche se è in obtained'` → obiettivi `hood ×1` e `textile ×1`, `obtained: ['textile']` → passo `textile` con `times 3` (2 + 1), `materials.textile` assente.
  - `'have non si applica agli oggetti ottenuti'` → `have: {textile: 2}` + `obtained: ['textile']` → `materials.textile === 2`.
  - `'senza obtained il risultato è identico a prima'` → `computeNeeds(hood)` uguale con e senza `{obtained: []}`.
- [ ] **Step 2: eseguire** `node --test tests/recommend.test.js` — Expected: FAIL (le attese su `obtained` non sono rispettate; il test senza `obtained` passa).
- [ ] **Step 3: implementare** in `computeNeeds`: `expandable(id)` diventa `!!recipe(id) && (targetIds.has(id) || (expand && !obtained.has(id)))` con `obtained = new Set(opts && opts.obtained || [])`; aggiornare il commento sopra la funzione.
- [ ] **Step 4: eseguire** l'intera suite — Expected: tutti PASS (154 + i nuovi).
- [ ] **Step 5: commit** — `git add index.html tests/recommend.test.js && git commit -m "feat: computeNeeds option obtained (items obtained elsewhere are not expanded)"`.

### Task 2: `decideItems` (costi unitari e decisione per materiale)

**Files:**
- Modify: `index.html` (blocco `core`, dopo `tradePlan`; export in `Object.assign((globalThis.__core = {}), …)`)
- Test: `tests/recommend.test.js` (aggiungere)

**Interfaces:**
- Consumes: `tradeInfo`, `effectiveRatio` (tab Trade).
- Produces: `decideItems(items, trade, targets, deliveries, objective) -> {[id]: Decision}`, con `objective: 'farm'|'gold'`, e
  `Decision = { id, tier, family, post, choice: 'craft'|'trade', unitCraft: Pair, unitTrade: Pair|null, ratio: number|null, ratioSource: 'estimate'|'log', ratioN: number, inputId: string|null, why: 'trade'|'cost'|'nodata'|'noinput' }`, `Pair = [primario, secondario]`.
- Contiene **solo** gli id raggiungibili dagli obiettivi (seguendo `crafts[0].ingredients`) per cui `tradeInfo` non è `null`.
- Costo unitario (spec §3): *farm* grezzo `[1,0]`, commissione `g` → `[0,g]`; *gold* grezzo `[0,1]`, commissione `g` → `[g,0]`; confronto lessicografico con tolleranza `1e-9`; un oggetto senza ricetta o sconosciuto è un grezzo. `craft(i) = (commissione + Σ qty × costoMigliore(ingrediente)) / yield`; `costoMigliore = min(craft, commercio)` a parità craft. `commercio(i)` = `costoInput / r + commissioneCassa / (r × input)` con `r` da `effectiveRatio(trade, deliveries, family, tier)` (non disponibile se `r` è `null` o ≤ 0). `costoInput` = il minore dei costi **solo craft** dei materiali `<livello>-<famiglia G>` **esistenti in `items`** con `G` ≠ famiglia dell'oggetto; `inputId` è il vincitore (a parità, ordine di `trade.posts`). Ricette cicliche: l'arco che chiude il ciclo vale come grezzo.
- `why`: `'trade'` se scelto; `'nodata'` se `r` è `null`/≤ 0; `'noinput'` se `r` va bene ma nessun materiale di partenza esiste; `'cost'` se il craft costa meno o uguale.

- [ ] **Step 1: scrivere i test** (oggetti sintetici + `fixture` di `tests/fixtures/trade.json`; grezzi `r1`, `r2` con `crafts: []`; `rec = (gold, ingredients) => ({crafts:[{profession:'P', level:1, stations:[], gold, ingredients}]})`):
  - `'obiettivi diversi danno decisioni diverse'`: `weapon = rec(0, [standard-ingot ×1, standard-lumber ×1])`, `standard-ingot = rec(5, [r1 ×3])`, `standard-lumber = rec(10, [r2 ×2])`. Con `'farm'`: `standard-ingot.choice === 'trade'`, `unitCraft ≈ [3, 5]`, `unitTrade ≈ [2/1.22, 10/1.22 + 80/(1.22×9)] = [1.6393, 15.4827]`, `inputId 'standard-lumber'`, `why 'trade'`. Con `'gold'`: `standard-ingot.choice === 'craft'`, `unitCraft ≈ [5, 3]`, `unitTrade ≈ [15.4827, 1.6393]`, `why 'cost'`.
  - `'il materiale di partenza è di una famiglia diversa dalla destinazione'`: stessi oggetti, `standard-lumber.inputId === 'standard-ingot'` (mai `'standard-lumber'`) e, in modalità `farm`, `standard-lumber.choice === 'craft'` (`[2,10]` contro `[2.459, …]`).
  - `'rapporto null (superior): craft, nessun costo di commercio, motivo nodata'`: `superior-ingot = rec(0, [r1 ×1])` raggiungibile → `unitTrade === null`, `choice 'craft'`, `why 'nodata'`.
  - `'nessun materiale di partenza: craft con motivo noinput'`: `fine-ingot = rec(0, [r1 ×1])` raggiungibile e nessun altro `fine-*` in `items` → `unitTrade === null`, `why 'noinput'`.
  - `'un registro con consegne cambia il rapporto usato'`: consegna `{family:'ingot', tier:'standard', packs:7, input:63, received:630, at:''}` → `ratio === 10`, `ratioSource 'log'`, `ratioN 1`.
  - `'solo gli id raggiungibili e commerciabili compaiono'`: un `standard-leather` esistente ma non nell'albero e l'oggetto finale `weapon` non compaiono nelle chiavi.
  - `'cicli di ricette e id sconosciuti non lanciano e non danno NaN'`: `standard-ingot` ↔ `standard-lumber` che si contengono a vicenda, e un obiettivo `ghost` → nessuna eccezione, tutte le coppie finite.
- [ ] **Step 2: eseguire** `node --test tests/recommend.test.js` — Expected: FAIL `core.decideItems is not a function`.
- [ ] **Step 3: implementare** `decideItems` (memoizzazione per id, due mappe: costo migliore e costo solo craft; guardia anti-ciclo con insieme "in visita") ed esportarla.
- [ ] **Step 4: eseguire** l'intera suite — Expected: tutti PASS.
- [ ] **Step 5: commit** — `git add index.html tests/recommend.test.js && git commit -m "feat: decideItems (unit costs and craft-or-trade decision per material)"`.

### Task 3: `recommendPlan` (ricalcolo esatto, conflitti, guardia)

**Files:**
- Modify: `index.html` (dopo `decideItems`; export)
- Test: `tests/recommend.test.js` (aggiungere)

**Interfaces:**
- Consumes: `decideItems`, `computeNeeds` con `obtained` (Task 1-2), `tradePlan` (tab Trade: `tradePlan(trade, steps, deliveries, {tripsPerDay}) -> {groups: [{post, name, lines}], notTradeable}`, riga `{id, units, packs, input, gold, trips, days, ratio, source, n, missing}`).
- Produces: `recommendPlan(items, trade, targets, have, deliveries, opts) -> Recommendation` con `opts = {objective: 'farm'|'gold', tripsPerDay?: number}` (default `trade.limits.tripsPerDay.peace`) e
  `Recommendation = { objective, decisions: Decision2[], plan: {farm, gold, crates, trips, days, rawMaterials: {id: qty}, crateInputs: [{id, qty}]}, baseline: {farm, gold}, fallback: boolean }`.
  `Decision2` = `Decision` (Task 2) con `choice` finale e in più `units`, `needed`, `crates`, `trips`, `days` (questi tre `null` se non è un commercio con `units > 0`) e `why` che può diventare `'fallback'`.
- Algoritmo (pinned):
  1. `decisions = decideItems(...)`; `traded` = id con `choice 'trade'`.
  2. Ciclo (termina perché `traded` si restringe): `needs = computeNeeds(items, targets, {have, obtained: traded})`; per ogni id di `traded` presente in `needs.materials`: `units = max(0, needs.materials[id] − (have[id] || 0))`; righe con `tradePlan(trade, [{id, need: units, covered: 0}…], deliveries, {tripsPerDay})`; per ogni riga con `packs > 0` il materiale di partenza è `decisions[id].inputId` con quantità `line.input`; se un `inputId` è in `traded`, riportarlo a craft e ricominciare; altrimenti uscire.
  3. `final = computeNeeds(items, [...targets, ...inputTargets], {have, obtained: traded})` dove `inputTargets` = `{id: inputId, qty}` sommati per id.
  4. Metriche: `farm` = Σ `final.materials` esclusi gli id in `traded`; `gold` = `final.gold` + Σ `gold` delle righe; `crates` = Σ `packs`; `trips` = Σ per avamposto di `ceil(Σ packs / perTrip)`; `days = ceil(trips / tripsPerDay)` (0 se nessun viaggio); `rawMaterials` = `final.materials` senza gli id in `traded`.
  5. `baseline = computeNeeds(items, targets, {have})`: `farm` = Σ `materials`, `gold` = `gold`.
  6. **Guardia**: se il piano è peggiore del baseline sull'obiettivo scelto (primario poi secondario, tolleranza `1e-9`; *farm*: primario `farm`; *gold*: primario `gold`), `fallback = true`, tutte le decisioni diventano `craft` con `why 'fallback'` (solo quelle che erano `trade`), e `plan` è il baseline (`crates/trips/days` = 0, `crateInputs` = `[]`, `rawMaterials` = `baseline.materials`).
  7. `decisions` in ordine dei passi del baseline; `units` e `needed` riflettono il piano finale (un materiale non più richiesto perché sta sotto un genitore ottenuto col commercio ha `units 0`, `needed false`).

- [ ] **Step 1: scrivere i test** (fixture `trade`; oggetti sintetici come nel Task 2; `deliveries: []`, `have: {}`; `weapon`, `fine-ingot`, ecc. definiti con `rec`):
  - `'annidamento: il commercio del Fine toglie lo Standard che serviva solo a lui'` — `weapon = rec(0, [fine-ingot ×1])`, `fine-ingot = rec(10, [standard-ingot ×18])`, `standard-ingot = rec(5, [r1 ×3])`, `fine-lumber = rec(0, [r2 ×1])`. Obiettivo `'farm'` → `fine-ingot.choice 'trade'`, `crates 1`, `needed true`; `standard-ingot.needed === false`; `plan.rawMaterials` = `{r2: 3}` (nessun `r1`); `plan.crateInputs` = `[{id:'fine-lumber', qty:3}]`; `plan.farm 3`, `plan.gold 200`; `baseline.farm 54`, `baseline.gold 100`; `fallback false`.
  - `'guardia: con quantità piccole il consiglio non è peggiore del solo craft'` — stessi dati con `'gold'`: il piano costerebbe 200 gold contro 100 → `fallback true`, `plan.farm 54`, `plan.gold 100`, `plan.crates 0`, tutte le decisioni `craft`, `fine-ingot.why 'fallback'`.
  - `'conflitto: un materiale scelto per il commercio non è anche il materiale di partenza di un altro'` — `weapon = rec(0, [standard-ingot ×100, standard-lumber ×100])`, `standard-ingot = rec(5, [r1 ×10])`, `standard-lumber = rec(5, [r1 ×10])`, `'farm'`: entrambi sarebbero `trade`; il risultato finale ha **esattamente uno** dei due `craft` e l'altro `trade` con `crates 10` (quale dei due torna a craft dipende dall'ordine degli avamposti di `trade.posts`, e il test non deve dipenderne: le cifre sono simmetriche); nessun id di `plan.crateInputs` ha `choice 'trade'` con `crates > 0`; `plan.farm 1900`, `plan.gold 1750` (950 di craft + 800 di casse), `baseline.farm 2000`, `baseline.gold 1000`.
  - `'obiettivo gold sugli stessi dati del conflitto: mai peggiore del solo craft sul gold'` → `plan.gold <= baseline.gold` (con tolleranza), oppure `fallback true`.
  - `'oggetti già posseduti: niente casse e niente ingressi'` — dati dell'annidamento, `have: {'fine-ingot': 1}` → `plan.crates 0`, `plan.crateInputs` `[]`, `plan.farm 0`.
  - `'nessun obiettivo: raccomandazione vuota senza errori'` → `decisions []`, `plan.farm 0`, `plan.gold 0`, `fallback false`.
  - `'obiettivo sconosciuto o ricette cicliche non lanciano'` → `recommendPlan` con `ghost` e con il ciclo del Task 2: nessuna eccezione, numeri finiti.
  - `'il consiglio non è mai peggiore del solo craft'` — proprietà su 4 combinazioni (annidamento e conflitto × `farm`/`gold`): sul primario dell'obiettivo `plan <= baseline` (con tolleranza `1e-9`).
- [ ] **Step 2: eseguire** `node --test tests/recommend.test.js` — Expected: FAIL `core.recommendPlan is not a function`.
- [ ] **Step 3: implementare** `recommendPlan` come da algoritmo ed esportarla.
- [ ] **Step 4: eseguire** l'intera suite — Expected: tutti PASS.
- [ ] **Step 5: commit** — `git add index.html tests/recommend.test.js && git commit -m "feat: recommendPlan (exact recompute, conflicts, guard against craft-only)"`.

### Task 4: Interfaccia — obiettivo e blocco "Consiglio"

**Files:**
- Modify: `index.html` (blocco `ui`: `renderTrade`, gestori; CSS; `STRINGS.en`/`STRINGS.it`), `tests/ui-checklist.md`

**Interfaces:**
- Consumes: `recommendPlan`, `computeNeeds`, stato esistente `trade`, `tripsMode`, `progress`.
- Produces: stato UI locale `objective` (`'farm'|'gold'`, default `'farm'`, non salvato); azione click `objective` (`data-v="farm|gold"`).

Decisioni:
- In `renderTrade()`, **sopra** la riga "Trips per day" e le alternative: riga `Goal:` con due pulsanti `chip` (`data-action="objective"`, `aria-pressed`), poi il blocco "Consiglio" (titolo `reco_h`). Le alternative per riga esistenti restano sotto, con un nuovo sottotitolo `alt_h`. `tripsPerDay` passato a `recommendPlan` è quello già calcolato da `tripsMode`.
- Per ogni decisione con `needed`: icona/nome/link come nelle righe esistenti, quantità `×units`, etichetta `CRAFT`/`TRADE`; per `TRADE`: avamposto, casse, materiale di partenza (`name(inputId)` con quantità), viaggi e giorni, e l'etichetta del rapporto (`ratio_estimate`/`ratio_log` già esistenti); per `CRAFT` il motivo dal campo `why` (`cost`, `nodata`, `noinput`, `fallback`). Le decisioni con `needed false` non si mostrano.
- Risultato: riga con `farm`, `gold`, `trips`, `days` del piano e riga "solo craft" con `farm` e `gold` del baseline; se `fallback`, la nota `reco_fallback`; se non c'è nessuna decisione `needed`, la nota `reco_empty`. Poi l'elenco `plan.rawMaterials` (icona, nome, quantità, ordinato per nome) sotto il titolo `reco_raw_h`.
- Chiavi stringa (EN; IT a cura dell'implementatore, stesse chiavi): `reco_h` "Recommended plan", `reco_goal` "Goal:", `obj_farm` "Farm less", `obj_gold` "Gold spent", `reco_craft` "CRAFT", `reco_trade` "TRADE", `reco_trade_detail` "{post} · {crates} crates · put in {qty} × {input} · trips: {trips} · days: {days}", `reco_why_cost` "crafting is cheaper", `reco_why_nodata` "no ratio data yet: log a delivery", `reco_why_noinput` "no material available to fill the crates", `reco_why_fallback` "with these quantities crafting is better", `reco_result` "Result: {farm} raw to farm · {gold} Gold · trips: {trips} · days: {days}", `reco_baseline` "Craft only: {farm} raw to farm · {gold} Gold", `reco_fallback` "With these quantities crafting everything is at least as good.", `reco_empty` "Nothing here is worth trading: craft everything.", `reco_raw_h` "Raw materials of the plan", `alt_h` "Alternatives per line".
- CSS: variabili esistenti (`--accent`, `.chip.on`); l'etichetta `CRAFT`/`TRADE` come `.badge`; a ≤ 520 px il blocco va a capo senza scorrimento orizzontale.

- [ ] **Step 1: fissare l'atteso** aggiungendo a `tests/ui-checklist.md`, prima del codice, le righe 30 (obiettivo e blocco "Consiglio" per il Cleaver: per ogni materiale CRAFT o TRADE con motivo/dettaglio, riga risultato e "solo craft", elenco dei grezzi la cui somma coincide con il numero "raw to farm"), 31 (cambio obiettivo: il blocco si ridisegna e il risultato sull'obiettivo scelto non è peggiore del solo craft), 32 (schermo stretto e senza `trade.json`).
- [ ] **Step 2: eseguire** `node --test tests/i18n.test.js` dopo aver aggiunto solo le chiavi EN — Expected: FAIL (parità EN/IT). Poi aggiungere le chiavi IT.
- [ ] **Step 3: implementare** blocco, gestore `objective`, CSS e stringhe.
- [ ] **Step 4: verificare con un browser vero** (script Playwright in cartella temporanea, `msedge`, sul file prodotto da `node scraper/build-offline.mjs`, senza server): aggiungere "Gyldenlord's Cleaver" ×1, aprire la tab Trade. Expected: il blocco "Recommended plan" è in cima, con `Goal:` e i due pulsanti; ogni materiale commerciabile ancora richiesto ha CRAFT o TRADE; la riga "Result" e la riga "Craft only" sono presenti e, sull'obiettivo scelto, il risultato non è peggiore del solo craft; la somma dell'elenco "Raw materials of the plan" coincide con il numero "raw to farm" della riga Result; premendo l'altro obiettivo il blocco cambia e vale la stessa proprietà; con una consegna registrata per un materiale scelto il suo rapporto passa a "from your log"; a 380 px nessuno scorrimento orizzontale; nessun errore in console; la tab senza `trade.json` mostra ancora "Trade data unavailable." e la tab Crafting funziona.
- [ ] **Step 5: eseguire** l'intera suite — Expected: tutti PASS.
- [ ] **Step 6: commit** — `git add index.html tests/ui-checklist.md && git commit -m "feat: recommended plan (farm less / gold spent) in the Trade tab"`.

### Task 5: Documentazione e verifica finale

**Files:**
- Modify: `README.md`, `README.it.md`, `docs/superpowers/specs/2026-11-19-trade-tab-design.md` (una riga: l'ottimizzatore ora esiste, vedi il nuovo design)

- [ ] **Step 1:** README EN/IT: nella voce "Trade tab" aggiungere il piano consigliato (obiettivo "Farmare meno" / "Gold spesi", craft o commercio per ogni materiale, confronto con il solo craft) e la sua regola principale: il materiale di partenza delle casse è il più economico di una famiglia diversa; le decisioni usano rapporti "stima" finché non registri consegne. Nel vecchio spec della tab Trade, nei non obiettivi, aggiungere un rinvio a `2026-11-20-trade-recommender-design.md`.
- [ ] **Step 2: verifica finale** — suite completa (Expected: tutti PASS, 0 fail), `node scraper/build-offline.mjs`, controllo con Playwright del file offline (tab Trade e Crafting, italiano con `?lang=it`, 380 px).
- [ ] **Step 3: commit** — `git add README.md README.it.md docs && git commit -m "docs: recommended plan (README, trade design cross-reference)"`. **Non fare push** senza richiesta.

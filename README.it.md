# ArcheAge Chronicles Farm Tracker

[English](README.md) · **Italiano**

Scegli gli oggetti che vuoi craftare in **ArcheAge Chronicles** e scopri quali materiali devi farmare. Il tool scende lungo l'albero delle ricette fino ai materiali grezzi, li raggruppa, ti dice in che ordine craftare ogni passo (con professione, livello e stazione) e calcola il costo totale in gold. Tu segni quanti materiali hai già e vedi cosa manca.

> **Stato del progetto:** il codice è pubblico, ma i **dati degli oggetti (`data/items.json`) non sono ancora pubblicati**: la pubblicazione dipende dal permesso di MetaForge a raccoglierli e ripubblicarli. Finché i dati non ci sono, la pagina pubblicata mostra "Data unavailable" e l'aggiornamento automatico è disattivato. Il file `data/overrides.json` (correzioni manuali, vedi sotto) è già incluso.

## Come si usa
1. **Scegli cosa craftare.** Sfoglia le sezioni (Armi, Armature, Accessori, …) e i tipi, oppure scrivi per filtrare la lista. La lista è ordinata per rarità, dalla più scarsa alla più forte (Common → Uncommon → Rare → Epic → Legendary), e in ordine alfabetico dentro ogni rarità. Clicca un oggetto per aggiungerlo, oppure premi Invio per aggiungere il primo della lista.
   **Passa il mouse su un oggetto** (o selezionalo con la tastiera, o toccalo su uno schermo touch) per vederne i dettagli come su MetaForge: livello, slot, set, peso, durabilità, prezzo di vendita, statistiche, opzioni casuali, descrizione e ricetta di crafting.
2. **Leggi i materiali** da farmare: *Servono / Hai / Mancano*. Con i pulsanti −/+ segni quanti ne hai già.
3. **Segui i passi di crafting** dall'alto in basso: sono numerati e divisi in fasi, dagli oggetti più basilari (solo materiali grezzi) fino all'oggetto che vuoi craftare.
4. Con **Intermedi** scegli se materiali come *Standard Textile* sono da craftare (si scende fino ai grezzi) o da farmare.
5. L'interfaccia è in inglese di base; il pulsante **IT** in alto a destra la passa in italiano (la scelta resta salvata). I nomi degli oggetti sono sempre quelli inglesi di MetaForge.
6. I progressi restano nel tuo browser. **Esporta/Importa** per spostarli su un altro dispositivo.

Funziona anche da file locale: scarica `index.html` e aprilo. I dati vengono sempre letti da questa repo (`data/`), quindi restano aggiornati senza riscaricare nulla. Dopo il primo caricamento l'ultima versione resta in cache e la pagina funziona anche offline.

### File unico offline
`node scraper/build-offline.mjs` crea `dist/farm-tracker-offline.html`: un unico file con i dati incorporati, che funziona con un doppio clic (senza server e senza internet; solo le icone degli oggetti hanno bisogno di connessione). Servono `data/items.json` e `data/meta.json` sul tuo computer, e `dist/` è escluso da git. Il file contiene dati di MetaForge: non ripubblicarlo senza il loro permesso.

## Come restano aggiornati i dati
Uno scraper (`scraper/`, Node 20 + Playwright) legge il database di [MetaForge](https://metaforge.app/archeage-chronicles/database) e rigenera `data/items.json` e `data/meta.json`. Una GitHub Action (`.github/workflows/scrape.yml`) lo esegue a richiesta dal tab *Actions* e committa solo se qualcosa è cambiato; la pianificazione settimanale (ogni lunedì) è pronta ma **disattivata** finché MetaForge non dà il permesso. Se le guardie di controllo falliscono (troppi oggetti in meno, ingredienti sconosciuti, ricette vuote) non scrive nulla e l'Action risulta in errore.

Per rigenerare i dati a mano:
```
npm --prefix scraper ci
npx --prefix scraper playwright install chromium   # oppure PW_CHANNEL=msedge per usare Edge
node scraper/run.mjs
```

### Correzioni manuali: `data/overrides.json`
Se una patch cambia le ricette prima che MetaForge aggiorni il database, si possono correggere a mano senza rifare lo scraping. La pagina scarica `overrides.json` a ogni apertura e lo applica sopra i dati (i passi corretti hanno il segnalino **patch**). Si può modificare direttamente dal sito di GitHub.
```json
{
  "standard-bonecraft": {
    "note": "Patch 2026-11-17",
    "ingredients": [{ "id": "bone-chip", "qty": 15 }]
  }
}
```
Campi ammessi (tutti riferiti alla prima ricetta): `ingredients` (sostituisce la lista), `gold`, `yield`, `note`. Una correzione non valida viene ignorata. Quando MetaForge si aggiorna, la voce va tolta.

Il file attuale contiene 17 ricette di materiali lavorati cambiate dalla patch del 17 novembre 2026 (tolti Sweetgrass Powder e loot dei mostri dai materiali lavorati, come da lettera degli sviluppatori): le 9 ricette "base" (Standard …) e le 8 "Fine …". Solo Standard Bonecraft, Fine Additive e Fine Bonecraft sono **confermate in gioco**; le altre sono derivate per analogia e vanno verificate. Le ricette "Superior …" non sono ancora corrette.

### Formato di `data/items.json`
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
`info` (dati del tooltip, con i valori "Untempered") c'è per gli oggetti craftabili ed è facoltativo. `crafts` vuoto = materiale grezzo. `yield` (opzionale, default 1) indica quanti pezzi produce un craft.

## Sviluppo
```
node --test 'tests/*.test.js' 'scraper/tests/*.test.mjs'
```
I test del parser usano pagine di esempio di MetaForge che **non sono incluse** nella repo (sono copie delle loro pagine): `PW_CHANNEL=msedge node scraper/capture-fixtures.mjs` le scarica; senza, quei test vengono saltati.

`index.html` è l'intera app (nessun build). La logica pura sta nel blocco `<script id="core">`, testato in Node. Checklist manuale dell'interfaccia: `tests/ui-checklist.md`. Design e piano (in italiano): `docs/superpowers/`.

## Crediti e note
- Dati raccolti da [MetaForge](https://metaforge.app/archeage-chronicles/database): ringraziamenti ai loro curatori. Le immagini **non sono copiate in questa repo**: `items.json` contiene solo il nome del file di ogni icona e la pagina la carica direttamente da `static.metaforge.app` (se non si carica, viene nascosta).
- ArcheAge Chronicles e i suoi contenuti appartengono ai rispettivi proprietari. Progetto amatoriale, **non affiliato** agli sviluppatori del gioco né a MetaForge.
- Il codice è sotto licenza MIT (vedi `LICENSE`). I dati restano di proprietà dei rispettivi titolari.

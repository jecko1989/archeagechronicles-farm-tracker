# ArcheAge Chronicles Farm Tracker

Scegli gli oggetti che vuoi craftare in **ArcheAge Chronicles** e scopri quali materiali devi farmare. Il tool scende lungo l'albero delle ricette fino ai materiali grezzi, li raggruppa, mostra professione, livello e stazione di ogni craft e il costo totale in gold. Tu segni quanti materiali hai già e vedi cosa manca.

> **Stato del progetto:** il codice è pubblico, ma i **dati degli oggetti (`data/`) non sono ancora pubblicati**: ho chiesto a MetaForge il permesso di raccoglierli e ripubblicarli e aspetto la loro risposta. Finché i dati non ci sono, la pagina mostra "Data unavailable" e l'aggiornamento automatico è disattivato.

## Come si usa
1. Cerca un oggetto (es. *Cultist Hood*) e aggiungilo con la quantità.
2. Leggi la lista dei materiali: *Servono / Hai / Mancano*.
3. Con **Intermedi** scegli se materiali come *Standard Textile* sono da craftare (si scende fino ai grezzi) o da farmare.
4. L'interfaccia è in inglese di base; il pulsante **IT** in alto a destra la passa in italiano (la scelta resta salvata). I nomi degli oggetti sono sempre quelli inglesi di MetaForge.
5. I progressi restano nel tuo browser. **Esporta/Importa** per spostarli su un altro dispositivo.

Funziona anche da file locale: scarica `index.html` e aprilo. I dati vengono sempre letti da questa repo (`data/`), quindi restano aggiornati senza riscaricare nulla. Dopo il primo caricamento l'ultima versione resta in cache e la pagina funziona anche offline.

## Come restano aggiornati i dati
Uno scraper (`scraper/`, Node 20 + Playwright) legge il database di [MetaForge](https://metaforge.app/archeage-chronicles/database) e rigenera `data/items.json` e `data/meta.json`. Una GitHub Action (`.github/workflows/scrape.yml`) lo esegue a richiesta dal tab *Actions* e committa solo se qualcosa è cambiato; la pianificazione settimanale (ogni lunedì) è pronta ma **disattivata** finché MetaForge non risponde. Se le guardie di controllo falliscono (troppi oggetti in meno, ingredienti sconosciuti, ricette vuote) non scrive nulla e l'Action risulta in errore.

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

Il file attuale contiene le 9 ricette "base" cambiate dalla patch del 17 novembre 2026 (tolti Sweetgrass Powder e loot dei mostri normali dai materiali lavorati, come da lettera degli sviluppatori). Le quantità sono **derivate da quella regola e vanno verificate in gioco**.

### Formato di `data/items.json`
```json
{
  "cultist-hood": {
    "name": "Cultist Hood", "category": "armor", "rarity": "Uncommon", "type": "Cloth",
    "crafts": [{
      "profession": "Tailoring", "level": 1, "stations": ["Armor Workbench", "Light Armor Workbench"], "gold": 3000,
      "ingredients": [{ "id": "standard-textile", "qty": 2 }, { "id": "rag-scrap", "qty": 20 }]
    }]
  }
}
```
`crafts` vuoto = materiale grezzo. `yield` (opzionale, default 1) indica quanti pezzi produce un craft.

## Sviluppo
```
node --test 'tests/*.test.js' 'scraper/tests/*.test.mjs'
```
I test del parser usano pagine di esempio di MetaForge che **non sono incluse** nella repo (sono copie delle loro pagine): `PW_CHANNEL=msedge node scraper/capture-fixtures.mjs` le scarica; senza, quei test vengono saltati.

`index.html` è l'intera app (nessun build). La logica pura sta nel blocco `<script id="core">`, testato in Node. Checklist manuale dell'interfaccia: `tests/ui-checklist.md`. Design e piano: `docs/superpowers/`.

## Crediti e note
- Dati raccolti da [MetaForge](https://metaforge.app/archeage-chronicles/database): ringraziamenti ai loro curatori. Le immagini **non sono copiate in questa repo**: `items.json` contiene solo il nome del file di ogni icona e la pagina la carica direttamente da `static.metaforge.app` (se non si carica, viene nascosta).
- ArcheAge Chronicles e i suoi contenuti appartengono ai rispettivi proprietari. Progetto amatoriale, **non affiliato** agli sviluppatori del gioco né a MetaForge.
- Il codice è sotto licenza MIT (vedi `LICENSE`). I dati restano di proprietà dei rispettivi titolari.

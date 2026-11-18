# Checklist manuale dell'interfaccia

Prerequisito: `python -m http.server 8000` nella cartella del progetto. Con i dati di prova apri
`http://localhost:8000/?data=/tests/fixtures/` (per dati reali: `?data=/data/`).
Per ripartire da zero svuota il `localStorage` del sito.
L'interfaccia è in **inglese** di base; i testi di questa checklist sono quelli italiani, selezionabili con il pulsante **IT** in alto a destra (o `?lang=it`).

| # | Azione | Atteso (fixture di prova) |
|---|--------|---------------------------|
| 1 | Apri la pagina | Stato "Dati aggiornati al 18/11/2026 · 10 oggetti", nessun errore in console |
| 2 | Cerca "hood", clicca il risultato (quantità 1) | Materiali: Rag Scrap 30, Wild Fiber 6, Sweetgrass Powder 10, Cultist Ritual Mask 8; costo "3.200 Gold" |
| 3 | Passi di crafting | Standard Textile ×2 (Cloth, livello 1, Atelier) e Cultist Hood ×1 (Tailoring, livello 1, Armor Workbench) |
| 4 | Metti "Hai" di Rag Scrap a 30 | Mancano di Rag Scrap = ✓ |
| 5 | Ricarica la pagina | Obiettivi e quantità possedute ancora presenti |
| 6 | Intermedi → "da farmare" | Compare Standard Textile 2 come materiale; scompaiono fiber e powder |
| 7 | Premi + su Standard Textile | Mancano 1 |
| 8 | Rimuovi l'obiettivo (✕) | Messaggio "Aggiungi un oggetto…" |
| 9 | Apri `?data=/nope/` con cache presente | Badge "offline" con la data dei dati in cache |
| 10 | Svuota la cache dati (`aa-farm-data-v1`) e riapri `?data=/nope/` | Riquadro "Dati non disponibili" con `NO_DATA:` e pulsante Riprova |
| 11 | Esporta, svuota i progressi, Importa il file | Obiettivi ripristinati; un file non valido mostra "File non valido…" |
| 13 | Con dati reali (`?data=/data/`): guarda le sezioni sotto "Aggiungi un oggetto" | Chip: Tutte 179, Accessori 6, Armature 48, Armi 60, Borse 8, Consumabili 16, Glider 3, Materiali 34, Strumenti 4 |
| 14 | Clicca "Armature", poi scrivi "cultist" | Compaiono i chip dei tipi (Cloth/Leather/Metal); la lista scende a 4 oggetti (Hood, Robe, Shoes, Sleeves); premere Invio aggiunge il primo agli obiettivi |
| 15 | Il tema | Solo scuro, anche se il sistema è impostato sul chiaro |
| 16 | Prima visita (nessuna scelta salvata), poi clicca IT e ricarica | Si apre in inglese ("What do you want to craft", "Data updated Nov 18, 2026 · 630 items", "3,450 Gold"); con IT tutto diventa italiano ("3.450 Gold"); dopo il ricaricamento resta IT; cancellando `aa-farm-lang` torna inglese |
| 17 | Con dati reali aggiungi "Wavewyrm Flame Necklace" ×1 e guarda "Crafting steps" | Passi numerati da 1 a 9 in 4 fasi: Fase 1 Standard Archeum ×162, Standard Bonecraft ×702, Standard Additive ×756; Fase 2 Fine Archeum ×9, Fine Bonecraft ×27, Fine Additive ×24; Fase 3 Superior Archeum ×1, Superior Bonecraft ×3; Fase 4 la collana ×1 (ultima) |
| 18 | Con dati reali e `data/overrides.json` presente, aggiungi la collana ×1 | "0 / 13,526 materials"; i passi Standard Archeum, Standard Bonecraft e Standard Additive hanno il segnalino "patch"; tra i materiali non compaiono più Sweetgrass Powder, Rag Scrap e Shattered Blade; Bone Chip 10,530 |
| 19 | Guarda l'ordine della lista sotto "Aggiungi un oggetto" (sezione "Tutte") | Common (1), poi Uncommon, Rare, Epic, Legendary; dentro ogni rarità ordine alfabetico |
| 12 | Apri `index.html` da `file://` senza parametro | Carica da raw.githubusercontent.com; finché la repo non ha `data/` mostra lo stato `NO_DATA`, non una pagina vuota |

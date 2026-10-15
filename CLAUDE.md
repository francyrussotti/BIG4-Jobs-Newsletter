# Big4 & Consulting Job Newsletter

Script Python che ogni giorno fa scraping delle offerte di lavoro di Big4 e società di consulenza (Italia/Belgio) e invia una newsletter HTML via Gmail con le sole offerte **nuove**.

Lingua: codice, commenti, log e testi dell'email sono in **italiano**. Mantieni questa convenzione.

## Fonti (una funzione `scrape_*` per ciascuna, in `main()` → lista `scrapers`)
| Fonte | Funzione | Tecnica |
|---|---|---|
| EY | `scrape_ey` | Yello, `requests`: ricerca per città con `&page_number=N`, poi lettura della pagina di ogni offerta (`_ey_dettaglio`) per tenere solo Italia/Belgio |
| PwC Italia | `scrape_pwc_italia` | Phenom, POST `/widgets` con `size=1000` (una sola richiesta); fallback Playwright |
| PwC Belgio | `scrape_pwc_belgio` | API Workday (CXS) con facet `locations` belghe; fallback `var jsondata` su pwc.be, poi Playwright |
| Deloitte | `scrape_deloitte` | Avature, HTML (il server serve solo 6 card/pagina, offset sul numero reale) |
| KPMG | `scrape_kpmg` | SAP SuccessFactors, tabella HTML, `startrow` a passi di 5 |
| Accenture | `scrape_accenture` | Workday API, facet `locationCountry` Italia |
| NTT DATA | `scrape_nttdata` | HTML paginato, selettore `a.job-detail-link` |
| Bip | `scrape_bip` | Oracle Recruiting Cloud REST, filtro `PrimaryLocationCountry == "IT"` |
| Digital360 | `scrape_digital360` | HubSpot server-side, `?page=N`; la città è aggiunta come `#frammento` all'URL |
| Capgemini | `scrape_capgemini` | API custom, `country_code=it-it` (minuscolo con trattino, altrimenti 0 risultati) |

Ogni scraper ritorna una lista di dict: `{"titolo", "location", "url", "data"}` + opzionale `"_id_src"`.

## Flusso (`main()`)
1. `carica_seen()` legge `seen_jobs.json` → (ID già visti, storico conteggi).
2. Per ogni scraper: scraping → `filtra_nuove()` (ID = md5 di `_id_src`, altrimenti `url`, altrimenti azienda+titolo+location) → filtro `MAX_GIORNI_NUOVA` (nasconde nuove ma pubblicate da >30 giorni; restano salvate come viste).
3. `health_check()` confronta i conteggi di oggi con lo storico (ultime `STORICO_MAX_RUN`=14 run).
4. `salva_seen()` salva ID + `storico_conteggi`.
5. `genera_html()` costruisce l'email (con banner di avviso se ci sono problemi), `invia_email()` spedisce in **CCN** a tutti i destinatari di `EMAIL_DESTINATARIO` (separati da virgola, `;`, spazio o a capo).
6. Exit code 1 (run rossa su GitHub) se: auth SMTP rifiutata, secret mancanti, invio fallito, oppure almeno uno scraper "bloccante" (0 offerte o eccezione).

## Concetti chiave da non rompere
- **`_id_src`**: permette di cambiare l'URL mostrato nell'email (es. togliere `/apply` con `_senza_apply`) senza cambiare l'ID salvato. Cambiare il calcolo dell'ID o degli URL fa tornare tutto come "nuovo" → email enorme. Prima di toccare URL/ID, verifica la compatibilità con `seen_jobs.json`.
- **Health check**: soglie in cima al file (`SOGLIA_CALO`, `SOGLIA_COPERTURA`, `SOGLIA_NUOVE_ANOMALE`, `STORICO_MIN_RUN`). Gli scraper che conoscono il totale dichiarato dal sito chiamano `registra_copertura(fonte, raccolte, dichiarate)`.
- **Date**: `_eta_giorni()` e `_workday_data()` normalizzano i formati diversi delle fonti (ISO, "2 ott 2026", "pubblicata 9 giorni fa"…). Date non riconosciute → l'offerta viene mostrata.
- `seen_jobs.json` (~3.600 ID, 14 run di storico) è **committato dal workflow**: non modificarlo a mano senza motivo e non cancellarlo.

## File del progetto
- `job_newsletter.py` — tutto lo script
- `requirements.txt` — requests, beautifulsoup4, lxml, playwright
- `seen_jobs.json` — stato (ID visti + storico conteggi)
- `.github/workflows/newsletter.yml` — cron `30 5 * * *` UTC (07:30 CEST / 06:30 CET) + `workflow_dispatch`; cache pip e Playwright; lo step di commit di `seen_jobs.json` gira con `if: always()` e fa retry del push

## Segreti (mai nel repo)
`GMAIL_MITTENTE`, `GMAIL_PASSWORD` (App Password Gmail), `EMAIL_DESTINATARIO`.
In produzione sono GitHub Secrets; in locale stanno in `.env` (ignorato da git, vedi `.env.example`).

## Comandi
- Setup: `pip install -r requirements.txt && playwright install chromium`
- Run completo locale: `./run_local.sh` (**invia davvero l'email e aggiorna `seen_jobs.json`**)
- Run completo **senza effetti collaterali**: `DRY_RUN=1 python job_newsletter.py` — scraping e health check completi, ma niente email e niente scrittura di `seen_jobs.json`; l'HTML dell'email finisce in `anteprima_newsletter.html`. Exit code 1 solo per scraper bloccanti (i secret non servono).
- Testare un solo scraper senza effetti collaterali: `python -c "from job_newsletter import scrape_kpmg; print(len(scrape_kpmg()))"` (`main()` è protetto da `if __name__ == "__main__"`)

## Regole di lavoro
- Modifiche mirate e incrementali, niente riscritture totali.
- Le costanti configurabili restano in cima al file.
- Retrocompatibilità del formato di `seen_jobs.json` (il vecchio formato è solo `{"ids": [...]}`).
- Quando un sito cambia, documenta nel commento sopra lo scraper cosa è cambiato e quando (convenzione già in uso: "NOTA (ottobre 2026): …").
- Non committare credenziali. Durante i test non inviare email reali né sovrascrivere `seen_jobs.json` se non richiesto.
- Il cron GitHub è in UTC e non segue l'ora legale: limite noto, già documentato nel workflow.

## Punti fragili
- Un sito che cambia struttura non genera errori: lo scraper torna 0 offerte o molte meno. È per questo che esiste l'health check; se un giorno una fonte è "bloccante" o "sospetta", controlla prima il sito.
- EY fa molte richieste (città × pagine + una per offerta): se rallenta, ridurre `max_workers` o le città.
- I selettori CSS/regex sono euristici: verifica sempre con output reale.

## TODO / idee
1. Filtro per keyword e seniority (alto rapporto beneficio/sforzo se il volume di offerte è alto).
2. Categorizzazione per practice area; deduplicazione fuzzy tra aziende; rilevamento offerte sparite; digest settimanale.

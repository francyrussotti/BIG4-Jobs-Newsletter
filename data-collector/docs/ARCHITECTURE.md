# Architettura

## Flusso

```
config YAML ──► pipeline ──► connettore (fetch pagine) ──► HttpClient (rate limit, retry, robots.txt)
                   │                                              │
                   │◄──────────── pagine di record JSON grezzi ◄──┘
                   ▼
              RecordMapper (campi da config) ──► Storage SQLite (upsert + dedup + checkpoint)
                                                       │
                                                       ▼
                                             export Parquet (analisi)
```

## Moduli

| Modulo | Responsabilità |
|---|---|
| `config.py` | Carica e valida il YAML, espande `${VAR}` / `${VAR:-default}` dalle variabili d'ambiente. |
| `http_client.py` | GET JSON con throttling (req/s e `Crawl-delay`), retry con backoff esponenziale + jitter su 429/5xx/errori di rete, rispetto di `Retry-After`, controllo `robots.txt`, tetto di richieste per run, log senza segreti. |
| `mapping.py` | Estrae i campi dai record grezzi con espressioni dichiarate in config (`a.b`, `lista[].campo`, `\| trasformazione`). |
| `connectors/` | Un connettore per fonte: sa solo **come paginare** quell'API. Registro nome → classe; si può anche indicare `modulo:Classe` in config. |
| `storage.py` | SQLite: tabelle `records`, `sync_state`, `runs`. Upsert con hash del contenuto. |
| `pipeline.py` | Orchestrazione di un run: calcolo del `since`, ripresa dal checkpoint, commit per pagina, aggiornamento watermark. |
| `export.py` | Export Parquet a blocchi, con deduplicazione opzionale tra fonti. |
| `cli.py` | Comandi `run`, `status`, `export`. |

## Scelte principali

- **Connettore = paginazione; config = tutto il resto.** URL, parametri, filtri, campi, limiti e chiavi vivono nel YAML. Aggiungere una fonte con un'API già supportata richiede solo un nuovo blocco di config. Una nuova API richiede invece una classe di circa 30 righe che implementa `fetch()`.
- **SQLite come archivio primario.** È un file unico e portabile, con transazioni e upsert, e regge milioni di righe. **Parquet** serve solo come formato d'export per pandas, DuckDB e Polars.
- **Incrementale con watermark + checkpoint.**
  - Il *watermark* è il valore massimo di un campo (es. `published_date`) raggiunto dall'ultimo run completo. Il run successivo parte da `watermark - lookback_days`.
  - Il *checkpoint* è il cursore della pagina successiva, salvato nella stessa transazione dei dati. Se un run si interrompe (budget giornaliero, errore, Ctrl-C), il successivo riprende da lì.
- **Deduplicazione su due livelli.**
  - Nella stessa fonte: chiave primaria `(source, record_id)` con upsert. Se l'hash non cambia, il record non viene riscritto.
  - Tra fonti diverse: la colonna `dedup_key` (es. il DOI normalizzato) e l'opzione `export --dedup`.
- **Tetto di richieste per run** (`max_requests_per_run`). OpenAlex dal 2026 ha un budget giornaliero in dollari: il tetto evita di sforarlo.

## Note su OpenAlex (verificate sulla documentazione, ottobre 2026)

- Da febbraio 2026 serve una **API key** (gratuita con un account). La key gratuita ha un budget di circa 1 $/giorno. Le chiamate list/filter costano circa 0,10 $ ogni 1.000; quelle di search circa 1 $ ogni 1.000. Il limite è 100 req/s, oltre il quale si riceve `429`.
- **Paginazione a cursore:** si parte con `cursor=*` e si prosegue con `meta.next_cursor` finché non è `null`. Il parametro `per-page` arriva al massimo a 200.
- `from_updated_date` e `from_created_date` richiedono un **piano a pagamento**. Il default è quindi un incrementale su `from_publication_date` con `lookback_days`. I record vecchi vengono aggiornati, ad esempio nei conteggi delle citazioni, con un `run --full` periodico. Con un piano premium basta cambiare `incremental.filter` in config.
- Oltre qualche milione di record OpenAlex raccomanda lo **snapshot** al posto dell'API.

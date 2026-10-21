"""Esecuzione di un run per una fonte: since → fetch → mapping → upsert → watermark."""
from __future__ import annotations

import logging
from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta

from .config import IncrementalConfig, SourceConfig
from .connectors import load_connector
from .http_client import BudgetExceeded, HttpClient, HttpError, RateLimitExhausted, RobotsDisallowed
from .mapping import RecordMapper
from .storage import Storage

log = logging.getLogger(__name__)


@dataclass
class RunResult:
    source: str
    status: str  # success | partial | failed
    counts: Counter
    requests: int
    error: str | None = None


def compute_since(watermark: str | None, inc: IncrementalConfig | None, full: bool) -> str | None:
    if inc is None:
        return None
    if full or watermark is None:
        return inc.start
    since = date.fromisoformat(watermark[:10]) - timedelta(days=inc.lookback_days)
    return since.isoformat()


def run_source(src: SourceConfig, store: Storage, full: bool = False,
               http: HttpClient | None = None) -> RunResult:
    http = http or HttpClient(src.http, max_requests=src.max_requests_per_run)
    connector = load_connector(src.connector)(src, http)
    mapper = RecordMapper(src.id_field, src.fields)

    state = store.get_state(src.name)
    resuming = bool(state["checkpoint"]) and not full
    if resuming:
        since, checkpoint = state["checkpoint_since"], state["checkpoint"]
        log.info("%s: riprendo il run interrotto (since=%s)", src.name, since)
    else:
        since, checkpoint = compute_since(state["watermark"], src.incremental, full), None
        log.info("%s: avvio run %s (since=%s)", src.name, "completo" if full else "incrementale", since)

    run_id = store.start_run(src.name, since)
    counts: Counter = Counter()
    pages = 0
    status, error = "success", None
    try:
        for page in connector.fetch(since, checkpoint):
            items = []
            for raw in page.records:
                record_id = mapper.record_id(raw)
                if record_id is None:
                    counts["skipped"] += 1
                    continue
                data = mapper.map(raw)
                items.append((record_id, data.get(src.dedup_key) if src.dedup_key else None, data, raw))
            counts["fetched"] += len(page.records)
            counts.update(store.commit_page(src.name, items, since, page.checkpoint))
            pages += 1
            log.info("%s: pagina %d, %d record (totale %d)", src.name, pages, len(page.records),
                     counts["fetched"])
    except (BudgetExceeded, RateLimitExhausted) as exc:
        status, error = "partial", str(exc)
        log.warning("%s: run interrotto, riprenderà dal checkpoint: %s", src.name, exc)
    except RobotsDisallowed as exc:
        status, error = "failed", str(exc)
        log.error("%s: %s", src.name, exc)
    except HttpError as exc:
        status, error = "failed", str(exc)
        if resuming and pages == 0 and 400 <= exc.status < 500:
            store.clear_checkpoint(src.name)
            log.error("%s: checkpoint non più valido, rimosso; il prossimo run riparte da capo", src.name)
        else:
            log.error("%s: %s", src.name, exc)
    except KeyboardInterrupt:
        status, error = "failed", "interrotto dall'utente"
        raise
    except Exception as exc:  # noqa: BLE001 - il run va comunque registrato
        status, error = "failed", repr(exc)
        log.exception("%s: run fallito", src.name)
    else:
        watermark = state["watermark"]
        if src.incremental:
            latest = store.max_field(src.name, src.incremental.field)
            if latest:
                latest = min(latest, date.today().isoformat())  # ignora date future
                watermark = max(filter(None, [watermark, latest]))
        store.finish_sync(src.name, watermark)
        log.info("%s: completato, watermark=%s", src.name, watermark)
    finally:
        store.finish_run(run_id, status, counts, http.requests_made, error)

    return RunResult(src.name, status, counts, http.requests_made, error)

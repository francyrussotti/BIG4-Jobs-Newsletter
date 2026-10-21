"""Storage SQLite: record con upsert/dedup, stato incrementale, log dei run. Schema: docs/SCHEMA.md."""
from __future__ import annotations

import hashlib
import json
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS records (
    source        TEXT NOT NULL,
    record_id     TEXT NOT NULL,
    dedup_key     TEXT,
    data          TEXT NOT NULL,
    raw           TEXT,
    content_hash  TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    last_seen_at  TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (source, record_id)
);
CREATE INDEX IF NOT EXISTS idx_records_dedup ON records(dedup_key);

CREATE TABLE IF NOT EXISTS sync_state (
    source           TEXT PRIMARY KEY,
    watermark        TEXT,
    checkpoint       TEXT,
    checkpoint_since TEXT,
    updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source      TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    status      TEXT NOT NULL,
    since       TEXT,
    fetched     INTEGER DEFAULT 0,
    inserted    INTEGER DEFAULT 0,
    updated     INTEGER DEFAULT 0,
    unchanged   INTEGER DEFAULT 0,
    skipped     INTEGER DEFAULT 0,
    requests    INTEGER DEFAULT 0,
    error       TEXT
);
"""

# (record_id, dedup_key, data normalizzati, raw)
Item = tuple[str, Any, dict, dict]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


class Storage:
    def __init__(self, path: str | Path, store_raw: bool = True):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.store_raw = store_raw
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    # --- record -----------------------------------------------------------
    def _upsert(self, source: str, items: Iterable[Item]) -> Counter:
        counts: Counter = Counter()
        ts = now_iso()
        for record_id, dedup_key, data, raw in items:
            data_json = _dumps(data)
            digest = hashlib.sha256(data_json.encode()).hexdigest()
            raw_json = _dumps(raw) if (self.store_raw and raw is not None) else None
            dedup = None if dedup_key in (None, "") else str(dedup_key)
            row = self.conn.execute(
                "SELECT content_hash FROM records WHERE source=? AND record_id=?",
                (source, record_id)).fetchone()
            if row is None:
                self.conn.execute(
                    "INSERT INTO records VALUES (?,?,?,?,?,?,?,?,?)",
                    (source, record_id, dedup, data_json, raw_json, digest, ts, ts, ts))
                counts["inserted"] += 1
            elif row["content_hash"] == digest:
                self.conn.execute(
                    "UPDATE records SET last_seen_at=? WHERE source=? AND record_id=?",
                    (ts, source, record_id))
                counts["unchanged"] += 1
            else:
                self.conn.execute(
                    "UPDATE records SET dedup_key=?, data=?, raw=?, content_hash=?, last_seen_at=?, "
                    "updated_at=? WHERE source=? AND record_id=?",
                    (dedup, data_json, raw_json, digest, ts, ts, source, record_id))
                counts["updated"] += 1
        return counts

    def commit_page(self, source: str, items: list[Item], since: str | None,
                    checkpoint: str | None) -> Counter:
        """Salva una pagina e il checkpoint per riprendere, nella stessa transazione."""
        with self.conn:
            counts = self._upsert(source, items)
            self._set_state(source, checkpoint=checkpoint, checkpoint_since=since if checkpoint else None)
        return counts

    def count(self, source: str) -> int:
        return self.conn.execute("SELECT count(*) FROM records WHERE source=?", (source,)).fetchone()[0]

    def max_field(self, source: str, field: str) -> str | None:
        row = self.conn.execute(
            "SELECT max(json_extract(data, ?)) FROM records WHERE source=?",
            (f'$."{field}"', source)).fetchone()
        return None if row[0] is None else str(row[0])

    def iter_rows(self, sources: list[str], dedup: bool, batch_size: int = 10_000) -> Iterator[sqlite3.Row]:
        placeholders = ",".join("?" * len(sources))
        base = f"SELECT * FROM records WHERE source IN ({placeholders})"
        if dedup:
            sql = (
                "SELECT * FROM (SELECT *, ROW_NUMBER() OVER ("
                "PARTITION BY COALESCE(dedup_key, source || ':' || record_id) "
                f"ORDER BY updated_at DESC, source) AS rn FROM ({base})) WHERE rn = 1"
            )
        else:
            sql = base
        cur = self.conn.execute(sql + " ORDER BY source, record_id", sources)
        while rows := cur.fetchmany(batch_size):
            yield from rows

    # --- stato incrementale -------------------------------------------------
    def get_state(self, source: str) -> dict:
        row = self.conn.execute("SELECT * FROM sync_state WHERE source=?", (source,)).fetchone()
        if row is None:
            return {"watermark": None, "checkpoint": None, "checkpoint_since": None}
        return dict(row)

    def _set_state(self, source: str, **values: Any) -> None:
        self.conn.execute(
            "INSERT INTO sync_state(source, updated_at) VALUES (?, ?) ON CONFLICT(source) DO NOTHING",
            (source, now_iso()))
        assignments = ", ".join(f"{k}=?" for k in values)
        self.conn.execute(
            f"UPDATE sync_state SET {assignments}, updated_at=? WHERE source=?",
            (*values.values(), now_iso(), source))

    def finish_sync(self, source: str, watermark: str | None) -> None:
        with self.conn:
            self._set_state(source, watermark=watermark, checkpoint=None, checkpoint_since=None)

    def clear_checkpoint(self, source: str) -> None:
        with self.conn:
            self._set_state(source, checkpoint=None, checkpoint_since=None)

    # --- log dei run --------------------------------------------------------
    def start_run(self, source: str, since: str | None) -> int:
        with self.conn:
            cur = self.conn.execute(
                "INSERT INTO runs(source, started_at, status, since) VALUES (?,?, 'running', ?)",
                (source, now_iso(), since))
        return cur.lastrowid

    def finish_run(self, run_id: int, status: str, counts: Counter, requests: int,
                   error: str | None) -> None:
        with self.conn:
            self.conn.execute(
                "UPDATE runs SET finished_at=?, status=?, fetched=?, inserted=?, updated=?, "
                "unchanged=?, skipped=?, requests=?, error=? WHERE id=?",
                (now_iso(), status, counts["fetched"], counts["inserted"], counts["updated"],
                 counts["unchanged"], counts["skipped"], requests, error, run_id))

    def last_run(self, source: str) -> dict | None:
        row = self.conn.execute(
            "SELECT * FROM runs WHERE source=? ORDER BY id DESC LIMIT 1", (source,)).fetchone()
        return dict(row) if row else None

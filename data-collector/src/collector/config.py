"""Caricamento e validazione della configurazione YAML."""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

_ENV_PATTERN = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}")


class ConfigError(ValueError):
    pass


@dataclass
class HttpConfig:
    user_agent: str
    requests_per_second: float = 1.0
    timeout: float = 30.0
    max_retries: int = 5
    backoff_base: float = 1.0
    backoff_max: float = 60.0
    respect_robots: bool = True


@dataclass
class IncrementalConfig:
    field: str  # campo normalizzato usato come watermark (valori ISO date/datetime)
    filter: str  # template del filtro, con il segnaposto {since}
    start: str | None = None  # since del primo run
    lookback_days: int = 0


@dataclass
class SourceConfig:
    name: str
    connector: str
    base_url: str
    endpoint: str
    id_field: str
    fields: dict[str, str]
    http: HttpConfig
    params: dict[str, Any] = field(default_factory=dict)
    dedup_key: str | None = None
    incremental: IncrementalConfig | None = None
    max_requests_per_run: int | None = None

    @property
    def url(self) -> str:
        return self.base_url.rstrip("/") + "/" + self.endpoint.lstrip("/")


@dataclass
class Config:
    database: Path
    store_raw: bool
    sources: dict[str, SourceConfig]


def expand_env(value: Any) -> Any:
    """Sostituisce ${VAR} e ${VAR:-default} in tutte le stringhe."""
    if isinstance(value, str):
        def repl(match: re.Match) -> str:
            name, default = match.group(1), match.group(2)
            if name in os.environ:
                return os.environ[name]
            if default is not None:
                return default
            raise ConfigError(f"variabile d'ambiente non impostata: {name}")
        return _ENV_PATTERN.sub(repl, value)
    if isinstance(value, dict):
        return {k: expand_env(v) for k, v in value.items()}
    if isinstance(value, list):
        return [expand_env(v) for v in value]
    return value


def _require(d: dict, key: str, where: str) -> Any:
    if key not in d or d[key] in (None, ""):
        raise ConfigError(f"{where}: campo obbligatorio mancante '{key}'")
    return d[key]


def _build_source(raw: dict, http_defaults: dict) -> SourceConfig:
    name = _require(raw, "name", "source")
    where = f"source '{name}'"
    fields = _require(raw, "fields", where)
    if not isinstance(fields, dict):
        raise ConfigError(f"{where}: 'fields' deve essere una mappa nome -> espressione")

    http_raw = {**http_defaults, **(raw.get("http") or {})}
    _require(http_raw, "user_agent", f"{where}.http")
    try:
        http = HttpConfig(**http_raw)
    except TypeError as exc:
        raise ConfigError(f"{where}.http: {exc}") from exc

    incremental = None
    if raw.get("incremental"):
        inc = raw["incremental"]
        _require(inc, "field", f"{where}.incremental")
        if "{since}" not in _require(inc, "filter", f"{where}.incremental"):
            raise ConfigError(f"{where}.incremental.filter deve contenere {{since}}")
        try:
            incremental = IncrementalConfig(**inc)
        except TypeError as exc:
            raise ConfigError(f"{where}.incremental: {exc}") from exc

    dedup_key = raw.get("dedup_key")
    if dedup_key and dedup_key not in fields:
        raise ConfigError(f"{where}: dedup_key '{dedup_key}' non è tra i fields")
    if incremental and incremental.field not in fields:
        raise ConfigError(f"{where}: incremental.field '{incremental.field}' non è tra i fields")

    return SourceConfig(
        name=name,
        connector=_require(raw, "connector", where),
        base_url=_require(raw, "base_url", where),
        endpoint=raw.get("endpoint", ""),
        id_field=_require(raw, "id_field", where),
        fields=fields,
        http=http,
        params=raw.get("params") or {},
        dedup_key=dedup_key,
        incremental=incremental,
        max_requests_per_run=raw.get("max_requests_per_run"),
    )


def load_config(path: str | Path) -> Config:
    path = Path(path)
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except FileNotFoundError as exc:
        raise ConfigError(f"file di config non trovato: {path}") from exc
    raw = expand_env(raw)

    storage = raw.get("storage") or {}
    sources_raw = _require(raw, "sources", str(path))
    http_defaults = raw.get("http") or {}

    sources: dict[str, SourceConfig] = {}
    for item in sources_raw:
        src = _build_source(item, http_defaults)
        if src.name in sources:
            raise ConfigError(f"nome fonte duplicato: {src.name}")
        sources[src.name] = src

    return Config(
        database=Path(storage.get("database", "data/collector.sqlite")),
        store_raw=bool(storage.get("store_raw", True)),
        sources=sources,
    )

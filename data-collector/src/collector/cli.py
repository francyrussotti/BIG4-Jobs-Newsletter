"""Riga di comando: collector run | status | export."""
from __future__ import annotations

import argparse
import logging
import sys

from .config import Config, ConfigError, load_config
from .storage import Storage


def _select(cfg: Config, names: list[str] | None) -> list[str]:
    if not names:
        return list(cfg.sources)
    unknown = [n for n in names if n not in cfg.sources]
    if unknown:
        raise ConfigError(f"fonti non presenti in config: {', '.join(unknown)}")
    return names


def cmd_run(cfg: Config, args: argparse.Namespace) -> int:
    from .pipeline import run_source

    store = Storage(cfg.database, cfg.store_raw)
    exit_code = 0
    try:
        for name in _select(cfg, args.source):
            r = run_source(cfg.sources[name], store, full=args.full)
            print(f"{name}: {r.status} | letti {r.counts['fetched']}, nuovi {r.counts['inserted']}, "
                  f"aggiornati {r.counts['updated']}, invariati {r.counts['unchanged']}, "
                  f"scartati {r.counts['skipped']} | richieste {r.requests}"
                  + (f" | {r.error}" if r.error else ""))
            if r.status == "failed":
                exit_code = 1
    finally:
        store.close()
    return exit_code


def cmd_status(cfg: Config, args: argparse.Namespace) -> int:
    store = Storage(cfg.database, cfg.store_raw)
    try:
        for name in _select(cfg, args.source):
            state = store.get_state(name)
            last = store.last_run(name)
            print(f"{name}: {store.count(name)} record | watermark {state['watermark']} | "
                  f"checkpoint {'sì' if state['checkpoint'] else 'no'}")
            if last:
                print(f"  ultimo run: {last['status']} {last['started_at']} → {last['finished_at']} "
                      f"(nuovi {last['inserted']}, aggiornati {last['updated']}, richieste {last['requests']})"
                      + (f"\n  errore: {last['error']}" if last["error"] else ""))
    finally:
        store.close()
    return 0


def cmd_export(cfg: Config, args: argparse.Namespace) -> int:
    from .export import export_parquet

    names = _select(cfg, args.source)
    field_names: list[str] = []
    for name in names:
        field_names += [f for f in cfg.sources[name].fields if f not in field_names]
    store = Storage(cfg.database, cfg.store_raw)
    try:
        n = export_parquet(store, names, field_names, args.out, dedup=args.dedup)
    finally:
        store.close()
    print(f"esportati {n} record in {args.out}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="collector", description="Collector dati configurabile")
    parser.add_argument("-c", "--config", required=True, help="file YAML di configurazione")
    parser.add_argument("--log-level", default="INFO")
    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="raccoglie i dati (incrementale)")
    p_run.add_argument("-s", "--source", action="append", help="fonte (ripetibile; default: tutte)")
    p_run.add_argument("--full", action="store_true",
                       help="ignora watermark e checkpoint e riparte da incremental.start")

    p_status = sub.add_parser("status", help="stato di fonti e ultimi run")
    p_status.add_argument("-s", "--source", action="append")

    p_exp = sub.add_parser("export", help="esporta in Parquet")
    p_exp.add_argument("-o", "--out", required=True)
    p_exp.add_argument("-s", "--source", action="append")
    p_exp.add_argument("--dedup", action="store_true", help="una riga per dedup_key tra tutte le fonti")

    args = parser.parse_args(argv)
    logging.basicConfig(level=args.log_level.upper(),
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        cfg = load_config(args.config)
        return {"run": cmd_run, "status": cmd_status, "export": cmd_export}[args.command](cfg, args)
    except ConfigError as exc:
        print(f"errore di configurazione: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

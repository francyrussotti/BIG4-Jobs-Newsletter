"""Test end-to-end con la config reale di OpenAlex puntata su un server locale simulato."""
import copy
import json
from datetime import date, timedelta

import pyarrow.parquet as pq
import pytest

from collector.cli import main
from collector.config import load_config
from collector.export import export_parquet
from collector.pipeline import run_source
from collector.storage import Storage
from conftest import PROJECT_ROOT, openalex_route


@pytest.fixture
def setup(server, tmp_path, monkeypatch):
    monkeypatch.setenv("OPENALEX_API_KEY", "secret-key")
    cfg = load_config(PROJECT_ROOT / "config" / "openalex.yaml")
    src = cfg.sources["openalex_llm"]
    src.base_url = server.base_url
    src.http.requests_per_second = 1000
    store = Storage(tmp_path / "db.sqlite")
    yield src, store
    store.close()


def test_full_then_incremental(server, setup, make_works):
    src, store = setup
    works = make_works(5)
    server.routes["/works"] = openalex_route(works, page_size=2)

    r = run_source(src, store)
    assert r.status == "success"
    assert (r.counts["fetched"], r.counts["inserted"]) == (5, 5)
    assert r.requests == 4  # 3 pagine con dati + 1 pagina vuota che chiude la paginazione

    first = server.api_requests("/works")[0]
    assert first["cursor"] == "*" and first["api_key"] == "secret-key" and first["per-page"] == "100"
    assert first["filter"] == ("title_and_abstract.search:large language model,type:article,"
                               "from_publication_date:2018-01-01")
    state = store.get_state("openalex_llm")
    assert state["watermark"] == "2024-01-05" and state["checkpoint"] is None

    # secondo run: since = watermark - lookback; un record cambia, uno nuovo
    works[0]["cited_by_count"] = 99
    works.append(copy.deepcopy(works[1]) | {"id": "https://openalex.org/W9", "publication_date": "2024-02-01"})
    server.requests.clear()
    r = run_source(src, store)
    assert (r.counts["inserted"], r.counts["updated"], r.counts["unchanged"]) == (1, 1, 4)
    expected_since = (date(2024, 1, 5) - timedelta(days=30)).isoformat()
    assert server.api_requests("/works")[0]["filter"].endswith(f"from_publication_date:{expected_since}")
    assert store.count("openalex_llm") == 6


def test_budget_partial_then_resume(server, setup, make_works):
    src, store = setup
    server.routes["/works"] = openalex_route(make_works(5), page_size=2)
    src.max_requests_per_run = 1

    r = run_source(src, store)
    assert r.status == "partial" and r.counts["inserted"] == 2
    state = store.get_state("openalex_llm")
    assert state["checkpoint"] == "p2" and state["watermark"] is None

    src.max_requests_per_run = None
    server.requests.clear()
    r = run_source(src, store)
    assert r.status == "success" and r.counts["inserted"] == 3
    assert server.api_requests("/works")[0]["cursor"] == "p2"
    assert store.get_state("openalex_llm")["checkpoint"] is None


def test_invalid_checkpoint_is_cleared(server, setup, make_works):
    src, store = setup
    server.routes["/works"] = openalex_route(make_works(4), page_size=2, bad_cursors={"p2"})
    src.max_requests_per_run = 1
    run_source(src, store)
    src.max_requests_per_run = None
    r = run_source(src, store)
    assert r.status == "failed"
    assert store.get_state("openalex_llm")["checkpoint"] is None


def test_records_without_id_are_skipped(server, setup, make_works):
    src, store = setup
    works = make_works(3)
    works[1]["id"] = None
    server.routes["/works"] = openalex_route(works, page_size=10)
    r = run_source(src, store)
    assert r.counts["skipped"] == 1 and store.count("openalex_llm") == 2


def test_export_parquet_with_cross_source_dedup(tmp_path, sample_work):
    store = Storage(tmp_path / "db.sqlite")
    data = {"doi": "10.1/x", "title": "T", "authors": ["A"], "citations_by_year": [{"year": 2025, "cited_by_count": 1}],
            "extra": {"k": 1}, "empty": None}
    store.commit_page("a", [("1", "10.1/x", data, sample_work)], None, None)
    store.commit_page("b", [("Z", "10.1/x", data | {"title": "T2"}, None),
                            ("Y", None, data | {"doi": None}, None)], None, None)
    fields = list(data)

    n = export_parquet(store, ["a", "b"], fields, tmp_path / "all.parquet")
    assert n == 3
    n = export_parquet(store, ["a", "b"], fields, tmp_path / "dedup.parquet", dedup=True)
    assert n == 2
    table = pq.read_table(tmp_path / "dedup.parquet").to_pylist()
    assert {r["dedup_key"] for r in table} == {"10.1/x", None}
    row = next(r for r in table if r["dedup_key"])
    assert row["authors"] == ["A"] and json.loads(row["extra"]) == {"k": 1}
    assert row["citations_by_year"] == [{"year": 2025, "cited_by_count": 1}]
    store.close()


def test_cli_end_to_end(server, tmp_path, monkeypatch, make_works, capsys):
    server.routes["/works"] = openalex_route(make_works(3), page_size=2)
    monkeypatch.setenv("OPENALEX_API_KEY", "k")
    text = (PROJECT_ROOT / "config" / "openalex.yaml").read_text()
    text = text.replace("https://api.openalex.org", server.base_url)
    text = text.replace("data/papers.sqlite", str(tmp_path / "papers.sqlite"))
    cfg = tmp_path / "cfg.yaml"
    cfg.write_text(text)

    assert main(["-c", str(cfg), "run"]) == 0
    assert main(["-c", str(cfg), "status"]) == 0
    out = tmp_path / "out.parquet"
    assert main(["-c", str(cfg), "export", "-o", str(out), "--dedup"]) == 0
    rows = pq.read_table(out).to_pylist()
    assert len(rows) == 3 and rows[0]["title"].startswith("Paper")
    printed = capsys.readouterr().out
    assert "nuovi 3" in printed and "secret" not in printed
    assert main(["-c", str(cfg), "run", "-s", "inesistente"]) == 2


def test_robots_disallow_fails_cleanly(server, setup):
    src, store = setup
    server.routes["/robots.txt"] = lambda q: (200, {}, "User-agent: *\nDisallow: /works\n")
    r = run_source(src, store)
    assert r.status == "failed" and "robots.txt" in r.error and r.requests == 0
    assert server.api_requests("/works") == []

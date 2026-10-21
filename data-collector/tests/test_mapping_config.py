import pytest

from collector.config import ConfigError, expand_env, load_config
from collector.mapping import RecordMapper, compile_expr
from conftest import PROJECT_ROOT


def test_paths_and_transforms():
    rec = {"a": {"b": 1}, "items": [{"x": "A", "tags": ["t1", "t2"]}, {"x": "b", "tags": ["t1"]}]}
    assert compile_expr("a.b")(rec) == 1
    assert compile_expr("a.missing.c")(rec) is None
    assert compile_expr("nothing[].x")(rec) == []
    assert compile_expr("items[].x | lower")(rec) == ["a", "b"]
    assert compile_expr("items[].tags | flatten | unique")(rec) == ["t1", "t2"]
    assert compile_expr("a.b | strip_prefix:x")(rec) == 1
    with pytest.raises(ValueError):
        compile_expr("a | boh")


def test_inverted_index():
    idx = {"world": [1], "hello": [0, 2]}
    assert compile_expr("x | inverted_index_text")({"x": idx}) == "hello world hello"
    assert compile_expr("x | inverted_index_text")({"x": None}) is None


def test_env_expansion(monkeypatch):
    monkeypatch.setenv("DC_TEST", "val")
    monkeypatch.delenv("DC_MISSING", raising=False)
    assert expand_env({"a": ["${DC_TEST}", "${DC_MISSING:-def}", "${DC_MISSING:-}"]}) == {"a": ["val", "def", ""]}
    with pytest.raises(ConfigError):
        expand_env("${DC_MISSING}")


def test_openalex_config_maps_work(monkeypatch, sample_work):
    monkeypatch.setenv("OPENALEX_API_KEY", "k")
    cfg = load_config(PROJECT_ROOT / "config" / "openalex.yaml")
    src = cfg.sources["openalex_llm"]
    assert src.params["api_key"] == "k"
    assert "," in src.params["select"] and " " not in src.params["select"]

    mapper = RecordMapper(src.id_field, src.fields)
    assert mapper.record_id(sample_work) == "W1234567890"
    d = mapper.map(sample_work)
    assert d["doi"] == "10.1234/abc.2024.001"
    assert d["abstract"] == "We study language models and language use."
    assert d["authors"] == ["Ada Rossi", "Bo Chen"]
    assert d["author_ids"] == ["A111", "A222"]
    assert d["institutions"] == ["University of Testing", "Example Lab"]
    assert d["countries"] == ["IT", "US"]
    assert d["venue"] == "Journal of Tests"
    assert d["field"] == "Computer Science"
    assert d["topics"] == ["Natural Language Processing Techniques", "Topic Modeling"]
    assert d["citations_by_year"][0] == {"year": 2025, "cited_by_count": 9}
    assert d["is_oa"] is True and d["year"] == 2024


def _write(tmp_path, text):
    p = tmp_path / "c.yaml"
    p.write_text(text)
    return p


BASE = """
sources:
  - name: s
    connector: openalex
    base_url: http://x
    id_field: id
    http: {user_agent: t}
    fields: {id: id, d: date}
"""


def test_config_validation(tmp_path):
    cfg = load_config(_write(tmp_path, BASE))
    assert cfg.sources["s"].http.requests_per_second == 1.0
    with pytest.raises(ConfigError, match="dedup_key"):
        load_config(_write(tmp_path, BASE + "    dedup_key: nope\n"))
    with pytest.raises(ConfigError, match="since"):
        load_config(_write(tmp_path, BASE + "    incremental: {field: d, filter: 'x:y'}\n"))
    with pytest.raises(ConfigError, match="user_agent"):
        load_config(_write(tmp_path, BASE.replace("{user_agent: t}", "{}")))

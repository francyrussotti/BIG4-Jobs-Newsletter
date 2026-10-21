import pytest

from collector.config import HttpConfig
from collector.http_client import (BudgetExceeded, HttpClient, HttpError, RateLimitExhausted,
                                   RobotsDisallowed, redact)


def client(**kw):
    max_requests = kw.pop("max_requests", None)
    cfg = HttpConfig(user_agent="test-agent", requests_per_second=1000, backoff_base=0.01, **kw)
    c = HttpClient(cfg, max_requests=max_requests)
    c.sleeps = []
    c._sleep = c.sleeps.append
    return c


def sequence(*responses):
    it = iter(responses)
    return lambda q: next(it)


def test_retry_on_429_then_success(server):
    server.routes["/api"] = sequence((429, {"Retry-After": "2"}, "slow down"), (200, {}, {"ok": 1}))
    c = client()
    assert c.get_json(server.base_url + "/api", {"q": "x", "empty": ""}) == {"ok": 1}
    assert c.requests_made == 2
    assert 2.0 in c.sleeps  # Retry-After rispettato
    assert all("empty" not in q for q in server.api_requests("/api"))


def test_5xx_exhausts_retries(server):
    server.routes["/api"] = lambda q: (503, {}, "down")
    c = client(max_retries=2)
    with pytest.raises(HttpError):
        c.get_json(server.base_url + "/api")
    assert c.requests_made == 3


def test_4xx_not_retried(server):
    server.routes["/api"] = lambda q: (400, {}, "bad")
    c = client()
    with pytest.raises(HttpError) as exc:
        c.get_json(server.base_url + "/api")
    assert exc.value.status == 400 and c.requests_made == 1


def test_long_retry_after_stops(server):
    server.routes["/api"] = lambda q: (429, {"Retry-After": "3600"}, "budget")
    with pytest.raises(RateLimitExhausted):
        client().get_json(server.base_url + "/api")


def test_budget(server):
    server.routes["/api"] = lambda q: (200, {}, {})
    c = client(max_requests=2)
    c.get_json(server.base_url + "/api")
    c.get_json(server.base_url + "/api")
    with pytest.raises(BudgetExceeded):
        c.get_json(server.base_url + "/api")


def test_robots_disallow_and_crawl_delay(server):
    server.routes["/robots.txt"] = lambda q: (
        200, {}, "User-agent: *\nCrawl-delay: 3\nDisallow: /private\n")
    server.routes["/public"] = lambda q: (200, {}, {"ok": 1})
    c = client()
    assert c.get_json(server.base_url + "/public") == {"ok": 1}
    assert c._min_interval == 3.0
    with pytest.raises(RobotsDisallowed):
        c.get_json(server.base_url + "/private")
    assert server.api_requests("/private") == []
    # robots.txt letto una sola volta per host
    assert len(server.api_requests("/robots.txt")) == 1


def test_robots_ignored_when_disabled(server):
    server.routes["/robots.txt"] = lambda q: (200, {}, "User-agent: *\nDisallow: /\n")
    server.routes["/x"] = lambda q: (200, {}, {"ok": 1})
    assert client(respect_robots=False).get_json(server.base_url + "/x") == {"ok": 1}


def test_redact():
    assert redact({"api_key": "s", "mailto": "a@b"}) == {"api_key": "***", "mailto": "a@b"}

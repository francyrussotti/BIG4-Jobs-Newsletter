"""Client HTTP con rate limiting, retry/backoff, robots.txt e tetto di richieste."""
from __future__ import annotations

import logging
import random
import time
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import requests

from .config import HttpConfig

log = logging.getLogger(__name__)

RETRY_STATUSES = {429, 500, 502, 503, 504}
_SECRET_HINTS = ("key", "token", "secret", "password")


class HttpError(RuntimeError):
    def __init__(self, status: int, url: str, body: str):
        super().__init__(f"HTTP {status} su {url}: {body[:300]}")
        self.status = status


class BudgetExceeded(RuntimeError):
    """Raggiunto max_requests_per_run."""


class RateLimitExhausted(RuntimeError):
    """La fonte chiede di attendere più di backoff_max (es. budget giornaliero esaurito)."""


class RobotsDisallowed(RuntimeError):
    pass


def redact(params: dict) -> dict:
    return {k: ("***" if any(h in k.lower() for h in _SECRET_HINTS) else v) for k, v in params.items()}


def _parse_retry_after(value: str | None) -> float | None:
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        return None  # il formato HTTP-date non viene interpretato: si usa il backoff


class HttpClient:
    def __init__(self, cfg: HttpConfig, max_requests: int | None = None,
                 session: requests.Session | None = None):
        self.cfg = cfg
        self.max_requests = max_requests
        self.session = session or requests.Session()
        self.session.headers["User-Agent"] = cfg.user_agent
        self.requests_made = 0
        self._min_interval = 1.0 / cfg.requests_per_second if cfg.requests_per_second > 0 else 0.0
        self._last_request = 0.0
        self._robots: dict[str, RobotFileParser | None] = {}
        self._sleep = time.sleep  # sostituibile nei test

    # --- robots.txt -------------------------------------------------------
    def _robots_for(self, url: str) -> RobotFileParser | None:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        if origin in self._robots:
            return self._robots[origin]
        parser: RobotFileParser | None = RobotFileParser()
        try:
            resp = self.session.get(origin + "/robots.txt", timeout=self.cfg.timeout)
            if resp.status_code == 200:
                parser.parse(resp.text.splitlines())
                delay = parser.crawl_delay(self.cfg.user_agent)
                if delay:
                    self._min_interval = max(self._min_interval, float(delay))
                    log.info("robots.txt %s: Crawl-delay %ss", origin, delay)
            elif 400 <= resp.status_code < 500:
                parser = None  # RFC 9309: robots.txt assente → tutto consentito
            else:
                raise RobotsDisallowed(f"robots.txt di {origin} non disponibile (HTTP {resp.status_code})")
        except requests.RequestException as exc:
            raise RobotsDisallowed(f"robots.txt di {origin} non raggiungibile: {exc}") from exc
        self._robots[origin] = parser
        return parser

    def _check_robots(self, url: str) -> None:
        if not self.cfg.respect_robots:
            return
        parser = self._robots_for(url)
        if parser is not None and not parser.can_fetch(self.cfg.user_agent, url):
            raise RobotsDisallowed(f"robots.txt non consente {url}")

    # --- richieste --------------------------------------------------------
    def _throttle(self) -> None:
        wait = self._last_request + self._min_interval - time.monotonic()
        if wait > 0:
            self._sleep(wait)
        self._last_request = time.monotonic()

    def get_json(self, url: str, params: dict | None = None) -> dict:
        params = {k: v for k, v in (params or {}).items() if v not in (None, "")}
        self._check_robots(url)

        for attempt in range(self.cfg.max_retries + 1):
            if self.max_requests is not None and self.requests_made >= self.max_requests:
                raise BudgetExceeded(f"raggiunto il tetto di {self.max_requests} richieste per run")
            self._throttle()
            self.requests_made += 1
            retry_after = None
            try:
                resp = self.session.get(url, params=params, timeout=self.cfg.timeout)
            except (requests.ConnectionError, requests.Timeout) as exc:
                reason = f"errore di rete: {exc.__class__.__name__}"
            else:
                if resp.status_code == 200:
                    log.debug("GET %s %s -> 200", url, redact(params))
                    return resp.json()
                if resp.status_code not in RETRY_STATUSES:
                    raise HttpError(resp.status_code, url, resp.text)
                reason = f"HTTP {resp.status_code}"
                retry_after = _parse_retry_after(resp.headers.get("Retry-After"))
                if retry_after is not None and retry_after > self.cfg.backoff_max:
                    raise RateLimitExhausted(f"{reason}: la fonte chiede di attendere {retry_after:.0f}s")

            if attempt == self.cfg.max_retries:
                raise HttpError(-1, url, f"falliti {attempt + 1} tentativi, ultimo: {reason}")
            delay = retry_after if retry_after is not None else min(
                self.cfg.backoff_max, self.cfg.backoff_base * 2 ** attempt) * random.uniform(0.5, 1.0)
            log.warning("GET %s %s: %s, tentativo %d/%d, riprovo tra %.1fs",
                        url, redact(params), reason, attempt + 1, self.cfg.max_retries, delay)
            self._sleep(delay)
        raise AssertionError("unreachable")

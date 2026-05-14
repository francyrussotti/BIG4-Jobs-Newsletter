# ============================================================
#  📰 JOB NEWSLETTER — Big4 Italia & Belgio
#  EY | PwC Italia | PwC Belgio | Deloitte Italia | KPMG
#
#  Scheduling: GitHub Actions (gira ogni giorno alle 07:30 CET)
# ============================================================

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json, time, re, os, hashlib

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    PLAYWRIGHT_OK = True
    print("✅ Playwright disponibile")
except ImportError:
    PLAYWRIGHT_OK = False
    print("⚠️  Playwright non trovato — EY e PwC Italia non funzioneranno")

# ============================================================
# ✏️  CONFIGURAZIONE  (valori dai Secrets GitHub)
# ============================================================

GMAIL_MITTENTE     = os.environ.get("GMAIL_MITTENTE",     "")
GMAIL_PASSWORD     = os.environ.get("GMAIL_PASSWORD",     "")
EMAIL_DESTINATARIO = os.environ.get("EMAIL_DESTINATARIO", "")

# File locale dove vengono salvati gli ID delle offerte già inviate
SEEN_FILE = "seen_jobs.json"

# ============================================================
# 👁️  FILTRO "GIÀ VISTI"
# ============================================================

def _job_id(azienda: str, offerta: dict) -> str:
    """Genera un ID stabile per un'offerta: URL > titolo+location come fallback."""
    url = offerta.get("url", "").strip()
    if url:
        raw = url
    else:
        raw = f"{azienda}|{offerta.get('titolo','').strip().lower()}|{offerta.get('location','').strip().lower()}"
    return hashlib.md5(raw.encode()).hexdigest()

def carica_seen() -> set:
    """Carica gli ID già visti dal file JSON (se esiste)."""
    if os.path.exists(SEEN_FILE):
        try:
            with open(SEEN_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            ids = set(data.get("ids", []))
            print(f"📂 Caricati {len(ids)} ID già visti da {SEEN_FILE}")
            return ids
        except Exception as e:
            print(f"⚠️  Errore lettura {SEEN_FILE}: {e}")
    else:
        print(f"📂 {SEEN_FILE} non trovato — prima esecuzione, tutte le offerte sono nuove")
    return set()

def salva_seen(seen: set):
    """Salva gli ID visti aggiornati nel file JSON."""
    try:
        with open(SEEN_FILE, "w", encoding="utf-8") as f:
            json.dump({"ids": list(seen), "aggiornato": datetime.now().isoformat()}, f, indent=2)
        print(f"💾 Salvati {len(seen)} ID in {SEEN_FILE}")
    except Exception as e:
        print(f"⚠️  Errore scrittura {SEEN_FILE}: {e}")

def filtra_nuove(azienda: str, offerte: list, seen: set) -> tuple[list, set]:
    """
    Ritorna solo le offerte non ancora viste e aggiorna il set seen.
    Restituisce (offerte_nuove, seen_aggiornato).
    """
    nuove = []
    nuovi_ids = set()
    for o in offerte:
        job_id = _job_id(azienda, o)
        if job_id not in seen:
            nuove.append(o)
            nuovi_ids.add(job_id)
    seen_aggiornato = seen | nuovi_ids
    print(f"   → {len(offerte)} trovate · {len(nuove)} nuove · {len(offerte)-len(nuove)} già viste")
    return nuove, seen_aggiornato

# ============================================================
# 🔧  UTILITIES HTTP
# ============================================================

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
}

def ts_ms_to_str(ts):
    try:
        return datetime.fromtimestamp(int(ts) / 1000).strftime("%Y-%m-%d")
    except:
        return ""

def http_get(url, **kw):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15, **kw)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"    ⚠️  GET {url[:70]}... → {e}")
        return None

def http_post(url, **kw):
    try:
        r = requests.post(url, headers=HEADERS, timeout=15, **kw)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"    ⚠️  POST {url[:70]}... → {e}")
        return None

# ============================================================
# 🌐  PLAYWRIGHT HELPERS
# ============================================================

def _pw_get_html(url, wait_selector=None, wait_ms=5000):
    if not PLAYWRIGHT_OK:
        return None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            ctx  = browser.new_context(user_agent=HEADERS["User-Agent"], locale="it-IT")
            page = ctx.new_page()
            page.goto(url, wait_until="networkidle", timeout=45_000)
            if wait_selector:
                try:
                    page.wait_for_selector(wait_selector, timeout=15_000)
                except PWTimeout:
                    pass
            page.wait_for_timeout(wait_ms)
            html = page.content()
            browser.close()
            return html
    except Exception as e:
        print(f"    ⚠️  Playwright HTML error: {e}")
        return None

def _pw_intercept_json(url, api_pattern, wait_ms=8000):
    if not PLAYWRIGHT_OK:
        return None
    captured = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            ctx  = browser.new_context(user_agent=HEADERS["User-Agent"], locale="it-IT")
            page = ctx.new_page()
            def on_response(resp):
                if re.search(api_pattern, resp.url, re.I):
                    try:
                        data = resp.json()
                        captured.append(data)
                    except:
                        pass
            page.on("response", on_response)
            page.goto(url, wait_until="networkidle", timeout=45_000)
            page.wait_for_timeout(wait_ms)
            browser.close()
    except Exception as e:
        print(f"    ⚠️  Playwright intercept error: {e}")
    if not captured:
        return None
    return max(captured, key=lambda d: len(d) if isinstance(d, list) else
               len(d.get("jobs") or d.get("positions") or d.get("jobList") or []))

# ============================================================
# 🏢  EY  —  Yello (Playwright)
# ============================================================

def scrape_ey():
    print("🔍 EY (Playwright)...")
    EY_URL = "https://eyglobal.yello.co/job_boards/c1riT--B2O-KySgYWsZO1Q?locale=it"
    risultati = []

    if not PLAYWRIGHT_OK:
        print("    ⚠️  Playwright necessario per EY — saltato")
        return risultati

    def _parse_html(html):
        out  = []
        soup = BeautifulSoup(html, "lxml")
        for script in soup.find_all("script"):
            raw = script.string or ""
            if "posted_at" in raw or "job_board" in raw:
                for pat in [r'"jobs"\s*:\s*(\[.+?\])\s*[,}]',
                            r'"postings"\s*:\s*(\[.+?\])\s*[,}]']:
                    m = re.search(pat, raw, re.DOTALL)
                    if m:
                        try:
                            jobs = json.loads(m.group(1))
                            for j in jobs:
                                if not isinstance(j, dict): continue
                                jid = j.get("id") or j.get("slug") or ""
                                out.append({
                                    "titolo":   j.get("title") or j.get("name") or "N/D",
                                    "location": j.get("location") or j.get("city") or "",
                                    "url":      f"https://eyglobal.yello.co/jobs/{jid}" if jid else EY_URL,
                                    "data":     (j.get("posted_at") or "")[:10],
                                })
                            if out: return out
                        except: pass
        for card in soup.select("a[href*='/jobs/']"):
            titolo_el = card.select_one("h2,h3,[class*='title'],[class*='name']") or card
            titolo = titolo_el.get_text(strip=True)
            if not titolo or len(titolo) < 5: continue
            href = card.get("href","")
            if not href.startswith("http"): href = "https://eyglobal.yello.co" + href
            loc_el = card.select_one("[class*='location'],[class*='city']")
            out.append({"titolo": titolo,
                         "location": loc_el.get_text(strip=True) if loc_el else "",
                         "url": href, "data": ""})
        return out

    print("    → Playwright intercept XHR EY...")
    data = _pw_intercept_json(EY_URL, api_pattern=r"(yello\.co/api|job_boards.*jobs)", wait_ms=8000)
    if data:
        jobs = data if isinstance(data, list) else \
               data.get("jobs") or data.get("postings") or data.get("data") or []
        for j in jobs:
            jid = j.get("id") or j.get("slug") or ""
            risultati.append({
                "titolo":   j.get("title") or j.get("name") or "N/D",
                "location": j.get("location") or j.get("city") or "",
                "url":      f"https://eyglobal.yello.co/jobs/{jid}" if jid else EY_URL,
                "data":     (j.get("posted_at") or j.get("created_at") or "")[:10],
            })

    if not risultati:
        print("    → Playwright HTML EY...")
        html = _pw_get_html(EY_URL, wait_selector="a[href*='/jobs/']", wait_ms=6000)
        if html: risultati = _parse_html(html)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  PwC ITALIA  —  Phenom People (Playwright)
# ============================================================

def scrape_pwc_italia():
    print("🔍 PwC Italia (Playwright)...")
    BASE = "https://jobs-it.pwc.com"
    risultati = []

    if not PLAYWRIGHT_OK:
        print("    ⚠️  Playwright necessario per PwC Italia — saltato")
        return risultati

    def _da_html(html):
        out  = []
        soup = BeautifulSoup(html, "lxml")
        for script in soup.find_all("script"):
            raw = script.string or ""
            for pat in [r'"jobs"\s*:\s*(\[.+?\])\s*[,}]',
                        r'"jobList"\s*:\s*(\[.+?\])\s*[,}]',
                        r'"positions"\s*:\s*(\[.+?\])\s*[,}]']:
                m = re.search(pat, raw, re.DOTALL)
                if m:
                    try:
                        jobs = json.loads(m.group(1))
                        for j in jobs:
                            if not isinstance(j, dict): continue
                            link = j.get("applyUrl") or j.get("url") or j.get("jobUrl") or ""
                            if link and not link.startswith("http"): link = BASE + link
                            out.append({"titolo": j.get("title") or j.get("jobTitle") or "N/D",
                                         "location": j.get("city") or j.get("location") or "",
                                         "url": link, "data": ""})
                        if out: return out
                    except: pass
        for card in soup.select("[data-ph-at-id*='job'],[class*='job-list-item'],"
                                 "[class*='job-card'],[class*='JobCard']"):
            t = card.select_one("[data-ph-at-id*='title'],h2,h3,[class*='title']")
            a = card.select_one("a[href]")
            if not t: continue
            href = a["href"] if a else ""
            if href and not href.startswith("http"): href = BASE + href
            out.append({"titolo": t.get_text(strip=True), "location": "",
                         "url": href, "data": ""})
        return out

    print("    → Playwright intercept XHR PwC Italia...")
    data = _pw_intercept_json(
        f"{BASE}/it/it/search-results",
        api_pattern=r"(phenom|/jobs\?|/search\?|positions|typeahead)",
        wait_ms=9000,
    )
    if data:
        jobs = (data.get("jobs") or data.get("positions") or
                data.get("jobList") or (data.get("data") or {}).get("jobs") or [])
        for j in jobs:
            link = j.get("applyUrl") or j.get("url") or j.get("jobUrl") or ""
            if link and not link.startswith("http"): link = BASE + link
            risultati.append({"titolo": j.get("title") or j.get("jobTitle") or "N/D",
                               "location": j.get("city") or j.get("location") or "",
                               "url": link, "data": ""})

    if not risultati:
        print("    → Playwright HTML PwC Italia...")
        html = _pw_get_html(
            f"{BASE}/it/it/search-results",
            wait_selector="[data-ph-at-id*='job'],[class*='job-list-item'],[class*='JobCard']",
            wait_ms=7000,
        )
        if html: risultati = _da_html(html)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  PwC BELGIO  —  portale globale PwC
# ============================================================

def scrape_pwc_belgio():
    print("🔍 PwC Belgio...")
    PWC_BEL_URL = (
        "https://www.pwc.com/gx/en/careers/job-results.html"
        "?wdcountry=BEL&wdjobsite=Global_Campus_Careers"
        "&flds=jobreqid,title,location,los,specialism,grade,apply"
    )

    def _da_html(html):
        found = []
        soup  = BeautifulSoup(html, "lxml")
        for script in soup.find_all("script"):
            raw = script.string or ""
            m   = re.search(r'(\[\s*\{[^<]{80,}\}\s*\])', raw, re.DOTALL)
            if m:
                try:
                    jobs = json.loads(m.group(1))
                    for j in (jobs if isinstance(jobs, list) else []):
                        if not isinstance(j, dict) or "title" not in j: continue
                        found.append({"titolo": j.get("title") or "N/D",
                                       "location": j.get("location") or "Belgium",
                                       "url": j.get("apply") or j.get("url") or PWC_BEL_URL,
                                       "data": ""})
                except: pass
        if not found:
            for row in soup.select("tr[class*='job'],li[class*='job'],"
                                   "div[class*='job-result'],div[class*='jobCard']"):
                t = row.select_one("a,[class*='title']")
                if not t: continue
                href = t.get("href","") if t.name=="a" else ""
                if not href:
                    a = t.find("a"); href = a.get("href","") if a else ""
                if href and not href.startswith("http"):
                    href = "https://www.pwc.com" + href
                found.append({"titolo": t.get_text(strip=True),
                               "location": "Belgium", "url": href, "data": ""})
        return found

    risultati = []
    r = http_get(PWC_BEL_URL)
    if r: risultati = _da_html(r.text)

    if not risultati and PLAYWRIGHT_OK:
        print("    → Playwright PwC Belgio...")
        html = _pw_get_html(PWC_BEL_URL, wait_selector="tr,[class*='job']", wait_ms=6000)
        if html: risultati = _da_html(html)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  DELOITTE ITALIA  —  Avature ATS
# ============================================================

def scrape_deloitte():
    print("🔍 Deloitte Italia (Avature)...")
    base      = "https://deloittecm.avature.net"
    risultati = []
    offset    = 0

    while True:
        url = (f"{base}/en_US/careers/SearchJobs/"
               "?729=5946&729_format=1565&731=%5B6470%2C6471%5D"
               f"&731_format=1567&listFilterMode=1&jobRecordsPerPage=50&jobOffset={offset}")
        r = http_get(url)
        if not r: break
        soup  = BeautifulSoup(r.text, "lxml")
        cards = soup.select("h3 a[href*='/careers/JobDetail/']")
        if not cards: break
        for a in cards:
            href = base + a["href"] if a["href"].startswith("/") else a["href"]
            ctx  = a.find_parent("li") or a.find_parent("tr") or a.find_parent("div")
            loc  = ""
            if ctx:
                loc_el = ctx.select_one("[class*='location'],[class*='city'],td:nth-child(2)")
                if loc_el: loc = loc_el.get_text(strip=True)
            risultati.append({"titolo": a.get_text(strip=True),
                               "location": loc or "Italia",
                               "url": href, "data": ""})
        offset += 50
        if len(cards) < 50: break
        time.sleep(0.5)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  KPMG ITALIA  —  SAP SuccessFactors
# ============================================================

def scrape_kpmg():
    print("🔍 KPMG Italia...")
    risultati = []

    for api in [
        "https://careers.kpmg.it/api/apply/v2/jobs?domain=careers.kpmg.it&start=0&num=100&sort_by=newest",
        "https://careers.kpmg.it/api/jobs?start=0&num=100&sort_by=newest",
    ]:
        r = http_get(api)
        if not r: continue
        try:
            data = r.json()
            jobs = data.get("positions") or data.get("jobs") or data.get("results") or []
            if not jobs: continue
            for j in jobs:
                pub = j.get("t_create") or j.get("startDate") or j.get("postedDate") or ""
                if isinstance(pub, (int, float)) or (isinstance(pub, str) and pub.isdigit()):
                    pub = ts_ms_to_str(pub)
                jid  = j.get("jobId") or j.get("id") or j.get("positionId") or ""
                link = j.get("applyUrl") or (f"https://careers.kpmg.it/job/{jid}" if jid else "https://careers.kpmg.it")
                risultati.append({"titolo": j.get("title") or j.get("jobTitle") or "N/D",
                                   "location": j.get("city") or j.get("location") or "Italia",
                                   "url": link,
                                   "data": pub[:10] if isinstance(pub, str) else ""})
            break
        except: continue

    if not risultati:
        print("    → fallback HTML KPMG...")
        r2 = http_get("https://careers.kpmg.it/search/?q=&sortColumn=referencedate&sortDirection=desc")
        if r2:
            soup = BeautifulSoup(r2.text, "lxml")
            for row in soup.select("table tbody tr"):
                cols = row.select("td")
                if len(cols) < 2: continue
                link_el = cols[0].select_one("a")
                if not link_el: continue
                href = link_el.get("href","")
                if href and not href.startswith("http"): href = "https://careers.kpmg.it" + href
                risultati.append({"titolo": link_el.get_text(strip=True),
                                   "location": cols[1].get_text(strip=True) if len(cols) >= 2 else "",
                                   "url": href,
                                   "data": cols[-1].get_text(strip=True) if len(cols) >= 3 else ""})

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 📧  GENERAZIONE EMAIL HTML
# ============================================================

BRAND_COLORS = {
    "EY":         ("#FFE600", "#1a1a1a"),
    "PwC Italia": ("#E0301E", "#ffffff"),
    "PwC Belgio": ("#E0301E", "#ffffff"),
    "Deloitte":   ("#86BC25", "#1a1a1a"),
    "KPMG":       ("#00338D", "#ffffff"),
}

def genera_html(tutte, totale_trovate):
    oggi_str = datetime.now().strftime("%d %B %Y")
    totale   = sum(len(v) for v in tutte.values())
    sezioni  = ""
    for azienda, offerte in tutte.items():
        if not offerte: continue
        bg, fg = BRAND_COLORS.get(azienda, ("#1a1a2e", "#ffffff"))
        righe  = ""
        for o in offerte:
            loc  = f'<span style="color:#888;">📍 {o["location"]}</span>&ensp;' if o.get("location") else ""
            data = f'<span style="color:#aaa;">📅 {o["data"]}</span>' if o.get("data") else ""
            righe += f"""
            <tr>
              <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;vertical-align:top;">
                <a href="{o['url']}" style="color:#1a1a2e;font-weight:600;text-decoration:none;
                   font-size:14px;line-height:1.4;display:block;">{o['titolo']}</a>
                <div style="margin-top:3px;font-size:12px;">{loc}{data}</div>
              </td>
            </tr>"""
        sezioni += f"""
        <div style="margin-bottom:24px;border-radius:8px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <div style="background:{bg};padding:11px 16px;display:flex;
                      justify-content:space-between;align-items:center;">
            <span style="color:{fg};font-size:16px;font-weight:700;">{azienda}</span>
            <span style="color:{fg};font-size:12px;opacity:.8;">
              {len(offerte)} nuov{'a' if len(offerte)==1 else 'e'}
            </span>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;">{righe}</table>
        </div>"""

    if not sezioni:
        body = (
            '<div style="text-align:center;padding:40px 0;color:#aaa;">'
            '<p style="font-size:40px;">✅</p>'
            '<p style="font-size:16px;font-weight:600;">Nessuna offerta nuova oggi.</p>'
            f'<p style="font-size:13px;">{totale_trovate} offerte totali già tutte viste.</p></div>'
        )
    else:
        body = sezioni

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;
             font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:28px auto;padding:0 12px;">
    <div style="background:linear-gradient(135deg,#0d1b2a,#1b3a5c);
                border-radius:12px 12px 0 0;padding:26px 24px 20px;text-align:center;">
      <div style="font-size:34px;margin-bottom:6px;">🏦</div>
      <h1 style="color:#fff;margin:0;font-size:21px;letter-spacing:1px;">BIG4 JOB NEWSLETTER</h1>
      <p style="color:#7eb8e0;margin:6px 0 0;font-size:13px;">{oggi_str}</p>
    </div>
    <div style="background:#dbeafe;padding:11px 20px;
                border-left:4px solid #2563eb;border-right:4px solid #2563eb;
                text-align:center;font-size:14px;color:#1e3a5f;">
      🆕 <strong>{totale} nuove offerte</strong> su {totale_trovate} totali
      · EY · PwC ITA · PwC BEL · Deloitte · KPMG
    </div>
    <div style="background:#f8f9fa;padding:20px 14px;">{body}</div>
    <div style="background:#0d1b2a;border-radius:0 0 12px 12px;padding:13px;
                text-align:center;font-size:11px;color:#4a6fa5;">
      Newsletter automatica · Python 🐍 · {oggi_str}
    </div>
  </div>
</body></html>""", totale

# ============================================================
# 📤  INVIO EMAIL
# ============================================================

def invia_email(html_body, totale):
    # Supporta più destinatari separati da virgola nel secret EMAIL_DESTINATARIO
    # Es: "primo@email.com,secondo@email.com,terzo@email.com"
    destinatari = [d.strip() for d in EMAIL_DESTINATARIO.split(",") if d.strip()]

    msg            = MIMEMultipart("alternative")
    msg["Subject"] = f"📰 Big4 Jobs {datetime.now():%d/%m/%Y} — {totale} nuove offerte"
    msg["From"]    = GMAIL_MITTENTE
    msg["To"]      = ", ".join(destinatari)
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(GMAIL_MITTENTE, GMAIL_PASSWORD)
            s.sendmail(GMAIL_MITTENTE, destinatari, msg.as_string())
        print(f"✅ Email inviata a {destinatari}")
    except smtplib.SMTPAuthenticationError:
        print("❌ Errore autenticazione → rigenera App Password su myaccount.google.com")
    except Exception as e:
        print(f"❌ Errore invio: {e}")

# ============================================================
# 🚀  MAIN
# ============================================================

def main():
    print(f"\n{'='*55}")
    print(f"  BIG4 JOB NEWSLETTER  {datetime.now():%d/%m/%Y %H:%M}")
    print(f"{'='*55}\n")

    # --- Carica gli ID già visti ---
    seen = carica_seen()

    scrapers = [
        ("EY",         scrape_ey),
        ("PwC Italia", scrape_pwc_italia),
        ("PwC Belgio", scrape_pwc_belgio),
        ("Deloitte",   scrape_deloitte),
        ("KPMG",       scrape_kpmg),
    ]

    tutte_trovate = {}   # tutte le offerte scraped
    tutte_nuove   = {}   # solo quelle mai viste prima

    for nome, fn in scrapers:
        try:
            offerte = fn()
            tutte_trovate[nome] = offerte
            if offerte:
                nuove, seen = filtra_nuove(nome, offerte, seen)
                if nuove:
                    tutte_nuove[nome] = nuove
        except Exception as e:
            print(f"   ❌ {nome}: {e}")
        time.sleep(1)

    # --- Salva gli ID aggiornati ---
    salva_seen(seen)

    totale_trovate = sum(len(v) for v in tutte_trovate.values())
    totale_nuove   = sum(len(v) for v in tutte_nuove.values())

    print(f"\n📊 Riepilogo:")
    for n in [s[0] for s in scrapers]:
        trovate = len(tutte_trovate.get(n, []))
        nuove   = len(tutte_nuove.get(n, []))
        print(f"   {n:15s}→ {trovate:3d} trovate · {nuove:3d} nuove")
    print(f"   {'TOTALE':15s}→ {totale_trovate:3d} trovate · {totale_nuove:3d} nuove\n")

    html, totale = genera_html(tutte_nuove, totale_trovate)
    invia_email(html, totale)
    print("\n✨ Done!\n")

main()

# ============================================================
#  📰 JOB NEWSLETTER — Big4 & consulting Italia/Belgio
#  EY | PwC Italia | PwC Belgio | Deloitte | KPMG | Accenture
#  NTT DATA | Bip | Digital360 | Capgemini
#
#  Scheduling: GitHub Actions (gira ogni giorno alle 07:30 CET)
# ============================================================

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json, time, re, os, hashlib, sys

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    PLAYWRIGHT_OK = True
    print("✅ Playwright disponibile")
except ImportError:
    PLAYWRIGHT_OK = False
    print("⚠️  Playwright non trovato — i fallback Playwright non funzioneranno")

# ============================================================
# ✏️  CONFIGURAZIONE  (valori dai Secrets GitHub)
# ============================================================

GMAIL_MITTENTE     = os.environ.get("GMAIL_MITTENTE",     "")
GMAIL_PASSWORD     = os.environ.get("GMAIL_PASSWORD",     "")
EMAIL_DESTINATARIO = os.environ.get("EMAIL_DESTINATARIO", "")

# File locale dove vengono salvati gli ID delle offerte già inviate
SEEN_FILE = "seen_jobs.json"

# ============================================================
# 🩺  PARAMETRI DEL MONITORAGGIO
# ============================================================

# Quante run conservare nello storico dei conteggi (serve a calcolare la mediana)
STORICO_MAX_RUN = 14
# Quante run servono come minimo prima di poter dare un giudizio sul calo
STORICO_MIN_RUN = 3
# Sotto questa frazione della mediana storica, il calo è considerato sospetto
SOGLIA_CALO = 0.5
# Se la quota di "nuove" sul totale supera questo valore (con storico presente),
# è probabile che la deduplica non stia funzionando
SOGLIA_NUOVE_ANOMALE = 0.9
# Se una fonte raccoglie meno di questa frazione delle offerte che il sito
# DICHIARA, la raccolta è incompleta: le offerte mancanti riemergeranno nei
# giorni successivi come false "nuove". Va segnalato.
SOGLIA_COPERTURA = 0.95

# Le offerte "nuove" per il tracker ma pubblicate da più di questi giorni NON
# vengono mostrate nell'email (restano comunque salvate come viste). Capita con
# annunci riaperti o resi visibili tardi, che mantengono la data originale.
# Si applica solo alle fonti che forniscono una data. None = filtro disattivato.
MAX_GIORNI_NUOVA = 30

# Copertura per fonte: {fonte: (raccolte, dichiarate)}.
# La riempiono gli scraper che conoscono il totale dichiarato dal sito.
COPERTURA = {}

def registra_copertura(fonte, raccolte, dichiarate):
    if dichiarate:
        COPERTURA[fonte] = (raccolte, dichiarate)
        if raccolte < dichiarate:
            print(f"    ⚠️  {fonte}: raccolte {raccolte} su {dichiarate} dichiarate")

# ============================================================
# 👁️  FILTRO "GIÀ VISTI"
# ============================================================

def _job_id(azienda: str, offerta: dict) -> str:
    """Genera un ID stabile per un'offerta: URL > titolo+location come fallback.
    Se lo scraper fornisce "_id_src", l'ID si calcola da quello invece che
    dall'URL mostrato: così si può cambiare il link nell'email (es. pagina
    dell'offerta invece del modulo di candidatura) senza invalidare gli ID
    già salvati in seen_jobs.json."""
    url = (offerta.get("_id_src") or offerta.get("url", "")).strip()
    if url:
        raw = url
    else:
        raw = f"{azienda}|{offerta.get('titolo','').strip().lower()}|{offerta.get('location','').strip().lower()}"
    return hashlib.md5(raw.encode()).hexdigest()

def _senza_apply(url: str) -> str:
    """Gli URL Workday che finiscono con /apply aprono direttamente il modulo
    di candidatura: togliendo il suffisso si apre la pagina dell'offerta."""
    return re.sub(r"/apply/?$", "", url or "")

_MESI_ABBR = {"gen": 1, "feb": 2, "mar": 3, "apr": 4, "mag": 5, "giu": 6, "lug": 7,
              "ago": 8, "set": 9, "ott": 10, "nov": 11, "dic": 12,
              "jan": 1, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "dec": 12}

def _eta_giorni(data):
    """Età in giorni di un'offerta a partire dal campo "data" delle varie fonti:
    ISO "2026-09-30" (PwC Italia, Bip, EY), "2 ott 2026" (KPMG),
    "Offerta pubblicata 9 giorni fa" / "ieri" / "oggi" (Accenture).
    Ritorna None se la data manca o non è riconoscibile (→ l'offerta si mostra)."""
    t = (data or "").strip().lower()
    if not t:
        return None
    oggi = datetime.now().date()
    try:
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", t)
        if m:
            return (oggi - datetime(int(m[1]), int(m[2]), int(m[3])).date()).days
        m = re.match(r"(\d{1,2})[ /.-]([a-z]{3})[a-z]*\.?[ /.-](\d{4})", t)
        if m and m[2] in _MESI_ABBR:
            return (oggi - datetime(int(m[3]), _MESI_ABBR[m[2]], int(m[1])).date()).days
        m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", t)
        if m:
            anno = int(m[3]) + (2000 if len(m[3]) == 2 else 0)
            return (oggi - datetime(anno, int(m[2]), int(m[1])).date()).days
    except ValueError:
        return None
    if "oggi" in t or "today" in t:
        return 0
    if "ieri" in t or "yesterday" in t:
        return 1
    m = re.search(r"(\d+)\+?\s*(giorni|days)", t)
    if m:
        return int(m[1]) + (1 if ("più di" in t or "+" in t) else 0)
    return None

def _workday_data(testo):
    """Workday (PwC Belgio, Accenture) dà solo date relative: "Offerta pubblicata
    24 giorni fa", "oggi", "ieri", "più di 30 giorni fa". Le date esatte si
    convertono in AAAA-MM-GG come le altre fonti; "più di 30 giorni" resta testo
    (la data reale non è nota), ma _eta_giorni lo riconosce comunque come vecchia."""
    eta = _eta_giorni(testo)
    t = (testo or "").lower()
    if eta is None or "più di" in t or "+" in t:
        return (testo or "").replace("Offerta pubblicata ", "")
    return (datetime.now() - timedelta(days=eta)).strftime("%Y-%m-%d")

def carica_seen() -> tuple[set, list]:
    """Restituisce (ID già visti, storico dei conteggi per fonte)."""
    if os.path.exists(SEEN_FILE):
        try:
            with open(SEEN_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            ids     = set(data.get("ids", []))
            storico = data.get("storico_conteggi", [])
            print(f"📂 Caricati {len(ids)} ID già visti da {SEEN_FILE} · storico: {len(storico)} run")
            return ids, storico
        except Exception as e:
            print(f"⚠️  Errore lettura {SEEN_FILE}: {e}")
    else:
        print(f"📂 {SEEN_FILE} non trovato — prima esecuzione, tutte le offerte sono nuove")
    return set(), []

def salva_seen(seen: set, storico: list):
    try:
        with open(SEEN_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "ids":               list(seen),
                "aggiornato":        datetime.now().isoformat(),
                "storico_conteggi":  storico[-STORICO_MAX_RUN:],   # solo le ultime N run
            }, f, indent=2)
        print(f"💾 Salvati {len(seen)} ID in {SEEN_FILE}")
    except Exception as e:
        print(f"⚠️  Errore scrittura {SEEN_FILE}: {e}")

def filtra_nuove(azienda: str, offerte: list, seen: set) -> tuple[list, set]:
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
# 🩺  HEALTH CHECK — rileva scraper rotti e anomalie di deduplica
#
#  Serve perché un sito che cambia struttura NON produce un errore:
#  lo scraper restituisce semplicemente 0 (o molte meno) offerte e
#  il workflow resta verde. Qui i cali vengono resi espliciti.
# ============================================================

def _mediana(valori: list) -> float:
    if not valori:
        return 0.0
    v = sorted(valori)
    n = len(v)
    return float(v[n // 2]) if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2

def health_check(conteggi: dict, nuove_per_fonte: dict, storico: list) -> list:
    """Confronta i conteggi di oggi con lo storico. Restituisce una lista di problemi:
    ogni problema è (gravità, fonte, messaggio) con gravità 'bloccante' o 'sospetto'."""
    problemi = []

    for fonte, trovate in conteggi.items():
        # Storico dei conteggi passati per questa fonte
        passati = [run["conteggi"][fonte] for run in storico
                   if isinstance(run.get("conteggi"), dict) and fonte in run["conteggi"]]

        if trovate == 0:
            problemi.append(("bloccante", fonte,
                             "0 offerte trovate — scraper probabilmente rotto "
                             "(selettori cambiati, sito irraggiungibile o filtro non più valido)"))
            continue

        if len(passati) >= STORICO_MIN_RUN:
            med = _mediana(passati)
            if med > 0 and trovate < med * SOGLIA_CALO:
                problemi.append(("sospetto", fonte,
                                 f"{trovate} offerte contro una mediana storica di {med:.0f} "
                                 f"(-{100*(1-trovate/med):.0f}%) — possibile cambio di struttura del sito"))

        # Copertura: il sito dichiara più offerte di quante ne abbiamo raccolte
        if fonte in COPERTURA:
            raccolte, dichiarate = COPERTURA[fonte]
            if dichiarate and raccolte < dichiarate * SOGLIA_COPERTURA:
                problemi.append(("sospetto", fonte,
                                 f"raccolte {raccolte} offerte su {dichiarate} dichiarate dal sito — "
                                 "raccolta incompleta: le mancanti potrebbero comparire nei prossimi "
                                 "giorni come false 'nuove'"))

        # Deduplica: con uno storico già presente, quasi tutto "nuovo" è anomalo
        nuove = nuove_per_fonte.get(fonte, 0)
        if storico and trovate > 0 and (nuove / trovate) > SOGLIA_NUOVE_ANOMALE and nuove > 5:
            problemi.append(("sospetto", fonte,
                             f"{nuove} nuove su {trovate} trovate ({100*nuove/trovate:.0f}%) — "
                             "possibile deduplica non funzionante (URL instabili o ID che cambiano)"))

    return problemi

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
        headers = {**HEADERS, **kw.pop("headers", {})}
        r = requests.get(url, headers=headers, timeout=15, **kw)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"    ⚠️  GET {url[:70]}... → {e}")
        return None

def http_post(url, **kw):
    try:
        headers = {**HEADERS, **kw.pop("headers", {})}
        timeout = kw.pop("timeout", 15)
        r = requests.post(url, headers=headers, timeout=timeout, **kw)
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
#  🏢  EY  —  Yello ATS  (requests)
#
#  ATS: Yello.
#  NOTA (agosto 2026): il filtro per paese via field_245[] NON funziona più
#  — il server ignora il parametro e restituisce sempre il feed globale.
#  Si usa quindi la ricerca testuale ?query=<città>, iterando sulle città
#  EY di Italia e Belgio.
#
#  NOTA (ottobre 2026): ogni ricerca restituisce 25 risultati per pagina.
#  &page=N viene ignorato, ma il sito usa &page_number=N (trovato nel JS
#  della job board, funzione di infinite scroll) e quello FUNZIONA.
#  Si paginano quindi tutte le pagine di ogni città: prima il vecchio
#  metodo a parole chiave raccoglieva ad es. 39 offerte su 62 a Diegem.
#
#  L'endpoint risponde con JSON {"html": "...", "display_count_text": "N Risultati"};
#  il totale è valorizzato solo a pagina 1 (dalla 2 in poi vale "-1").
# ============================================================

# Città EY in Italia e Belgio usate come termini di ricerca.
EY_CITTA = [
    # Italia
    ("milano", "Italia"), ("roma", "Italia"), ("torino", "Italia"),
    ("bologna", "Italia"), ("napoli", "Italia"), ("padova", "Italia"),
    ("firenze", "Italia"), ("genova", "Italia"), ("brescia", "Italia"),
    ("verona", "Italia"), ("bari", "Italia"), ("treviso", "Italia"),
    ("ancona", "Italia"), ("bergamo", "Italia"),
    # Belgio
    ("brussels", "Belgio"), ("bruxelles", "Belgio"), ("antwerp", "Belgio"),
    ("antwerpen", "Belgio"), ("ghent", "Belgio"), ("gent", "Belgio"),
    ("liege", "Belgio"), ("diegem", "Belgio"), ("hasselt", "Belgio"),
]

EY_BOARD_ID = "c1riT--B2O-KySgYWsZO1Q"

# Riconosce la sede nel titolo dell'offerta (solo parole intere: "roma" non
# deve scattare su "Romania", "gent" non su "agent").
EY_SEDE_RE = re.compile(
    r"\b(" + "|".join(sorted({c for c, _ in EY_CITTA} | {"trieste", "cagliari", "palermo",
                                                         "catania", "pescara", "perugia"},
                              key=len, reverse=True)) + r")\b", re.I)

_MESI_IT = {"gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6,
            "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12}

def _ey_data(testo):
    """Yello mostra "Nuovo" per le offerte recentissime e "26 Marzo" (senza anno)
    per le altre. Si converte in AAAA-MM-GG come le altre fonti; l'anno è quello
    corrente, o il precedente se la data risulterebbe nel futuro."""
    t = (testo or "").strip().lower()
    oggi = datetime.now()
    if t in ("nuovo", "new", "oggi", "today"):
        return oggi.strftime("%Y-%m-%d")
    m = re.match(r"(\d{1,2})\s+([a-zà-ü]+)", t)
    if m and m.group(2) in _MESI_IT:
        try:
            d = datetime(oggi.year, _MESI_IT[m.group(2)], int(m.group(1)))
            if d > oggi + timedelta(days=1):
                d = d.replace(year=oggi.year - 1)
            return d.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return testo or ""

def scrape_ey():
    print("🔍 EY (Yello, requests)...")
    BASE = "https://eyglobal.yello.co/job_boards/c1riT--B2O-KySgYWsZO1Q"
    ey_headers = {**HEADERS, "X-Requested-With": "XMLHttpRequest",
                  "Accept": "application/json, text/javascript, */*"}
    MAX_PAGINE = 40   # tetto di sicurezza per città (~1000 offerte)

    risultati = []
    tot_dichiarate = tot_raccolte = 0

    for citta, paese in EY_CITTA:
        raccolti   = {}     # chiave (req id o url) → offerta
        dichiarato = None
        for pagina in range(1, MAX_PAGINE + 1):
            url = f"{BASE}/search?query={citta}&locale=it&page_number={pagina}"
            r = http_get(url, headers=ey_headers)
            if not r:
                break
            try:
                j = r.json()
            except ValueError:
                break
            if pagina == 1:
                m = re.search(r"(\d+)", j.get("display_count_text", "") or "")
                dichiarato = int(m.group(1)) if m else None

            soup  = BeautifulSoup(j.get("html", ""), "lxml")
            nuovi = 0
            for item in soup.select("li.search-results__item"):
                a = item.select_one("a.search-results__req_title")
                if not a:
                    continue
                href = a.get("href", "")
                # NOTA (ottobre 2026): Yello restituisce lo STESSO annuncio a volte
                # con "&locale=it" nell'href e a volte senza. Poiché l'ID si calcola
                # dall'URL, l'offerta cambiava ID e tornava come falsa "nuova".
                # Si ricostruisce quindi sempre l'URL in forma canonica dallo slug.
                m_slug = re.search(r"/jobs/([^/?#]+)", href)
                if m_slug:
                    href = (f"https://eyglobal.yello.co/jobs/{m_slug.group(1)}"
                            f"?job_board_id={EY_BOARD_ID}&locale=it")
                elif href and not href.startswith("http"):
                    href = "https://eyglobal.yello.co" + href
                span      = item.select_one("div span")
                posted_el = item.select_one(".search-results__post-time")
                req_id    = span.get_text(strip=True) if span else ""
                chiave    = req_id or href
                if chiave in raccolti:
                    continue
                titolo = a.get_text(strip=True)
                # La ricerca per città trova anche offerte di altre sedi (la città
                # compare nel testo): se il titolo nomina una sede, si usa quella.
                m_sede = EY_SEDE_RE.search(titolo)
                sede   = m_sede.group(1).capitalize() if m_sede else citta.capitalize()
                raccolti[chiave] = {
                    "titolo":   titolo,
                    "location": f"EY {paese} · {sede}",
                    "url":      href,
                    "data":     _ey_data(posted_el.get_text(strip=True) if posted_el else ""),
                }
                nuovi += 1
            time.sleep(0.2)
            if nuovi == 0:                                   # pagina vuota o ripetuta → fine
                break
            if dichiarato and len(raccolti) >= dichiarato:  # raccolto tutto
                break

        if dichiarato:
            tot_dichiarate += dichiarato
            tot_raccolte   += min(len(raccolti), dichiarato)
            if len(raccolti) < dichiarato:
                print(f"    ⚠️  EY {citta}: raccolte {len(raccolti)} su {dichiarato} dichiarate")
        risultati.extend(raccolti.items())

    # De-duplica tra città (la stessa offerta può uscire da più ricerche)
    visti, deduped = set(), []
    for chiave, offerta in risultati:
        if chiave in visti:
            continue
        visti.add(chiave)
        deduped.append(offerta)

    registra_copertura("EY", tot_raccolte, tot_dichiarate)

    # NOTA (ottobre 2026): la ricerca per città è testuale, quindi trova anche
    # offerte ESTERE che nominano la città nel testo (es. "Naples" → un MBA
    # Intern negli USA uscito nella ricerca "napoli"). Si legge quindi la
    # pagina di ogni offerta, che riporta paese ("Paese / regione") e sede
    # precisa (es. "ITA-Roma"), e si tengono solo Italia e Belgio.
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=6) as pool:
        dettagli = list(pool.map(_ey_dettaglio, [o["url"] for o in deduped]))

    filtrate, escluse, ignote = [], 0, 0
    for offerta, (paese_det, sede_det) in zip(deduped, dettagli):
        if paese_det is None:
            ignote += 1                       # pagina non letta: si tiene l'offerta
            filtrate.append(offerta)
            continue
        paese_it = EY_PAESI_OK.get(paese_det.strip().lower())
        if not paese_it:
            escluse += 1
            continue
        if sede_det:
            offerta["location"] = f"EY {paese_it} · {sede_det}"
        filtrate.append(offerta)
    if escluse:
        print(f"    → escluse {escluse} offerte fuori Italia/Belgio")
    if ignote:
        print(f"    ⚠️  EY: {ignote} pagine offerta non lette (tenute senza verifica del paese)")

    print(f"   → {len(filtrate)} offerte trovate")
    return filtrate

# Nomi del paese come appaiono sulla pagina Yello (locale=it, con varianti inglesi).
EY_PAESI_OK = {"italia": "Italia", "italy": "Italia",
               "belgio": "Belgio", "belgium": "Belgio", "belgique": "Belgio", "belgië": "Belgio"}

def _ey_dettaglio(url):
    """Legge la pagina dell'offerta EY. Ritorna (paese, sede) oppure (None, None)
    se la pagina non è leggibile. Sede: es. "ITA-Roma, ITA-Milano" → "Roma, Milano"."""
    for tentativo in range(2):
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "lxml")
            paese = None
            for g in soup.select(".secondary-details__group"):
                t = g.select_one(".secondary-details__title")
                c = g.select_one(".secondary-details__content")
                if t and c and re.search(r"paese|country", t.get_text(), re.I):
                    paese = c.get_text(" ", strip=True)
            spans = soup.select(".details-top__title span")
            sede = spans[1].get_text(strip=True) if len(spans) > 1 else ""
            sede = ", ".join(dict.fromkeys(
                re.sub(r"^[A-Z]{3}-", "", x.strip()) for x in sede.split(",") if x.strip()))
            if paese:
                return paese, sede
        except Exception:
            pass
        time.sleep(1)
    return None, None

# ============================================================
# 🏢  PwC ITALIA  —  Phenom People
#
#  NOTA (ottobre 2026): la paginazione ?from=N (10 per pagina) NON è
#  affidabile: Phenom restituisce i risultati in un ordine diverso a ogni
#  richiesta, le pagine si sovrappongono e ogni run perdeva 30-50 offerte
#  DIVERSE su ~340. Quelle saltate riemergevano poi come false "nuove"
#  (es. offerte pubblicate a luglio segnalate a ottobre).
#  Soluzione: l'endpoint POST /widgets accetta "size" alto e restituisce
#  TUTTE le offerte in un'unica richiesta, in modo stabile.
#  Gli URL (applyUrl di Workday) sono identici a quelli del metodo vecchio,
#  quindi gli ID già salvati in seen_jobs.json restano validi.
# ============================================================

def _pwc_italia_requests(BASE):
    body = {"lang": "it_it", "deviceType": "desktop", "country": "it",
            "pageName": "search-results", "ddoKey": "refineSearch", "sortBy": "",
            "subsearch": "", "from": 0, "jobs": True, "counts": True,
            "all_fields": ["category", "country", "state", "city", "type"],
            "size": 1000, "clearAll": False, "jdsource": "facets",
            "isSliderEnable": False, "pageId": "page20", "siteType": "external",
            "keywords": "", "global": True, "selected_fields": {}, "locationData": {}}
    r = http_post(f"{BASE}/widgets", json=body, timeout=30,
                  headers={"Content-Type": "application/json", "Accept": "application/json"})
    if not r:
        return []
    try:
        d = r.json()["refineSearch"]
        jobs = d["data"]["jobs"]
        totale = d.get("totalHits")
    except Exception as e:
        print(f"    ⚠️  Risposta widgets PwC Italia non valida: {e}")
        return []

    out, visti = [], set()
    for j in jobs:
        link = j.get("applyUrl") or j.get("url") or ""
        if link and not link.startswith("http"): link = BASE + link
        chiave = j.get("jobId") or link
        if chiave in visti:
            continue
        visti.add(chiave)
        out.append({"titolo": j.get("title") or "N/D",
                    "location": j.get("cityState") or j.get("city") or j.get("location") or "",
                    "url": _senza_apply(link),   # pagina dell'offerta
                    "_id_src": link,             # ID invariato rispetto al passato
                    "data": (j.get("postedDate") or j.get("dateCreated") or "")[:10]})
    registra_copertura("PwC Italia", len(out), totale)
    return out

def scrape_pwc_italia():
    print("🔍 PwC Italia (Phenom widgets + fallback Playwright)...")
    BASE = "https://jobs-it.pwc.com"
    risultati = _pwc_italia_requests(BASE)
    if risultati:
        print(f"   → {len(risultati)} offerte trovate")
        return risultati

    if not PLAYWRIGHT_OK:
        print("    ⚠️  requests senza risultati e Playwright non disponibile")
        return risultati

    def _estrai_array_bilanciato(testo, chiave):
        # Conta l'apertura/chiusura delle parentesi quadre per trovare la fine
        # reale dell'array (gli oggetti job contengono array annidati).
        m = re.search(r'"%s"\s*:\s*\[' % re.escape(chiave), testo)
        if not m:
            return None
        start = m.end() - 1
        depth = 0
        for i in range(start, len(testo)):
            if testo[i] == '[':
                depth += 1
            elif testo[i] == ']':
                depth -= 1
                if depth == 0:
                    return testo[start:i + 1]
        return None

    def _da_html(html):
        out  = []
        soup = BeautifulSoup(html, "lxml")
        for script in soup.find_all("script"):
            raw = script.string or ""
            for chiave in ["jobs", "jobList", "positions"]:
                array_raw = _estrai_array_bilanciato(raw, chiave)
                if array_raw:
                    try:
                        jobs = json.loads(array_raw)
                        for j in jobs:
                            if not isinstance(j, dict): continue
                            link = j.get("applyUrl") or j.get("url") or j.get("jobUrl") or ""
                            if link and not link.startswith("http"): link = BASE + link
                            out.append({"titolo": j.get("title") or j.get("jobTitle") or "N/D",
                                         "location": j.get("city") or j.get("location") or "",
                                         "url": _senza_apply(link), "_id_src": link,
                                         "data": ""})
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
                               "url": _senza_apply(link), "_id_src": link, "data": ""})

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
# 🏢  PwC BELGIO  —  Workday API (fallback: var jsondata su pwc.be)
#
#  ATS: Workday (pwc.wd3.myworkdayjobs.com).
#  La pagina pwc.be risponde 403 ai bot: si interroga direttamente
#  l'API Workday (CXS) dei due career site PwC, filtrando per Belgio.
# ============================================================

# Sedi belghe riconosciute nel facet "locations" di Workday (parole intere).
PWC_BE_SEDI = re.compile(
    r"\b(brussels|bruxelles|brussel|diegem|zaventem|antwerp|antwerpen|anvers|ghent|gent|"
    r"gand|li[eè]ge|luik|hasselt|kortrijk|courtrai|namur|namen|leuven|louvain|mechelen|"
    r"malines|charleroi|mons|bruges|brugge|belgium|belgique|belgi[eë])\b", re.I)

def _pwc_belgio_workday():
    """API Workday (CXS) dei due career site PwC, max 20 risultati a pagina.

    NOTA (ottobre 2026): prima si filtrava con searchText="Belgium", che
    perdeva ~20 offerte belghe su ~95 (es. 41 su 57 a Bruxelles) e includeva
    offerte estere (es. Brno). Ora si legge il facet "locations" e si
    selezionano gli ID delle sedi belghe: filtro esatto e completo.
    Se il facet non è leggibile si torna al vecchio filtro testuale."""
    out, visti = [], set()
    tot_dichiarate = 0
    h = {**HEADERS, "Content-Type": "application/json", "Accept": "application/json"}
    for site in ["Global_Campus_Careers", "Global_Experienced_Careers"]:
        api = f"https://pwc.wd3.myworkdayjobs.com/wday/cxs/pwc/{site}/jobs"

        # 1) ID delle sedi belghe dal facet "locations"
        filtro = {"appliedFacets": {}, "searchText": "Belgium"}   # fallback
        try:
            r = requests.post(api, headers=h, timeout=20,
                              json={"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""})
            r.raise_for_status()
            ids = [v["id"]
                   for f in r.json().get("facets", []) if f.get("facetParameter") == "locationMainGroup"
                   for g in f.get("values", []) if g.get("facetParameter") == "locations"
                   for v in g.get("values", []) if PWC_BE_SEDI.search(v.get("descriptor", ""))]
            if ids:
                filtro = {"appliedFacets": {"locations": ids}, "searchText": ""}
            else:
                print(f"    ⚠️  Workday {site}: nessuna sede belga nel facet, uso il filtro testuale")
        except Exception as e:
            print(f"    ⚠️  Workday {site} facet → {e} (uso il filtro testuale)")

        # 2) Paginazione
        offset, totale = 0, None
        for _ in range(30):
            try:
                r = requests.post(api, headers=h, timeout=20,
                                  json={**filtro, "limit": 20, "offset": offset})
                r.raise_for_status()
                d = r.json()
            except Exception as e:
                print(f"    ⚠️  Workday {site} offset {offset} → {e}")
                break
            posts = d.get("jobPostings") or []
            if totale is None:
                totale = d.get("total") or 0
                tot_dichiarate += totale
            if not posts:
                break
            for j in posts:
                path = j.get("externalPath") or ""
                if not path or path in visti:
                    continue
                visti.add(path)
                url_apply = f"https://pwc.wd3.myworkdayjobs.com/{site}{path}/apply"
                out.append({"titolo": j.get("title") or "N/D",
                            "location": j.get("locationsText") or "Belgio",
                            "url": _senza_apply(url_apply),   # pagina dell'offerta
                            "_id_src": url_apply,             # ID invariato rispetto al passato
                            "data": _workday_data(j.get("postedOn"))})
            offset += len(posts)
            if offset >= totale:
                break
            time.sleep(0.4)
    registra_copertura("PwC Belgio", len(out), tot_dichiarate)
    return out

def scrape_pwc_belgio():
    print("🔍 PwC Belgio (Workday API)...")
    URL = "https://www.pwc.be/en/careers/students-graduates.html"
    risultati = _pwc_belgio_workday()
    if risultati:
        print(f"   → {len(risultati)} offerte trovate")
        return risultati
    print("    → Workday senza risultati, provo la pagina pwc.be...")

    r = http_get(URL)
    if not r:
        print("    ⚠️  Impossibile scaricare la pagina PwC Belgio")
        return risultati

    # Estrai var jsondata = [...] dalla pagina
    m = re.search(r'var\s+jsondata\s*=\s*(\[.+?\])\s*;', r.text, re.DOTALL)
    if m:
        try:
            jobs = json.loads(m.group(1))
            for j in jobs:
                if not isinstance(j, dict):
                    continue
                apply_url = j.get("apply") or j.get("url") or ""
                risultati.append({
                    "titolo":   j.get("title") or "N/D",
                    "location": j.get("location") or j.get("region") or "Belgio",
                    "url":      _senza_apply(apply_url),
                    "_id_src":  apply_url,
                    "data":     j.get("date") or "",
                })
            print(f"   → {len(risultati)} offerte trovate")
            return risultati
        except Exception as e:
            print(f"    ⚠️  Errore parsing jsondata: {e}")

    # Fallback Playwright se requests non trova jsondata
    if PLAYWRIGHT_OK:
        print("    → Playwright fallback PwC Belgio...")
        html = _pw_get_html(URL, wait_ms=6000)
        if html:
            m2 = re.search(r'var\s+jsondata\s*=\s*(\[.+?\])\s*;', html, re.DOTALL)
            if m2:
                try:
                    jobs = json.loads(m2.group(1))
                    for j in jobs:
                        if not isinstance(j, dict): continue
                        risultati.append({
                            "titolo":   j.get("title") or "N/D",
                            "location": j.get("location") or j.get("region") or "Belgio",
                            "url":      _senza_apply(j.get("apply") or j.get("url") or ""),
                            "_id_src":  j.get("apply") or j.get("url") or "",
                            "data":     j.get("date") or "",
                        })
                except Exception as e:
                    print(f"    ⚠️  Errore parsing jsondata (Playwright): {e}")

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  DELOITTE ITALIA  —  Avature ATS
#
#  NOTA (set 2026): il server ignora jobRecordsPerPage=50 e serve solo 6
#  card per pagina. L'offset avanza del numero REALE di card ricevute e ci
#  si ferma sul totale dichiarato ("1-6 of 215") o quando la pagina non
#  porta offerte nuove.
# ============================================================

def scrape_deloitte():
    print("🔍 Deloitte Italia (Avature)...")
    base      = "https://deloittecm.avature.net"
    risultati = []
    visti     = set()
    offset    = 0
    totale    = None

    for _ in range(150):   # tetto di sicurezza (~900 offerte)
        url = (f"{base}/en_US/careers/SearchJobs/"
               "?729=5946&729_format=1565&731=%5B6470%2C6471%5D"
               f"&731_format=1567&listFilterMode=1&jobRecordsPerPage=50&jobOffset={offset}")
        r = http_get(url)
        if not r: break
        if totale is None:
            m = re.search(r"\d+\s*-\s*\d+\s*of\s*(\d+)", r.text)
            totale = int(m.group(1)) if m else None
        soup  = BeautifulSoup(r.text, "lxml")
        cards = soup.select("h3 a[href*='/careers/JobDetail/']")
        if not cards: break
        nuovi = 0
        for a in cards:
            href = base + a["href"] if a["href"].startswith("/") else a["href"]
            if href in visti: continue
            visti.add(href); nuovi += 1
            ctx  = a.find_parent("li") or a.find_parent("tr") or a.find_parent("div")
            loc  = ""
            if ctx:
                loc_el = ctx.select_one("[class*='location'],[class*='city'],td:nth-child(2)")
                if loc_el: loc = loc_el.get_text(strip=True)
            risultati.append({"titolo": a.get_text(strip=True),
                               "location": loc or "Italia",
                               "url": href, "data": ""})
        if nuovi == 0: break
        offset += len(cards)
        if totale and offset >= totale: break
        time.sleep(0.4)

    registra_copertura("Deloitte", len(risultati), totale)
    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  KPMG ITALIA  —  SAP SuccessFactors
#
#  Lista HTML a tabella. Paginazione: startrow=0, 5, 10, 15...
#  Fine: quando la pagina non contiene più righe nella tabella.
# ============================================================

def scrape_kpmg():
    print("🔍 KPMG Italia (SAP SuccessFactors)...")
    BASE_URL  = "https://careers.kpmg.it/search/"
    STEP      = 5
    risultati = []
    startrow  = 0

    while True:
        url = (f"{BASE_URL}?q=&sortColumn=referencedate&sortDirection=desc"
               f"&startrow={startrow}")
        r = http_get(url)
        if not r:
            break
        soup = BeautifulSoup(r.text, "lxml")
        rows = soup.select("table#searchresults tbody tr")
        if not rows:
            rows = soup.select("table.table tbody tr")
        if not rows:
            break

        for row in rows:
            cols = row.select("td")
            if len(cols) < 2:
                continue
            link_el = cols[0].select_one("a")
            if not link_el:
                continue
            href = link_el.get("href", "")
            if href and not href.startswith("http"):
                href = "https://careers.kpmg.it" + href
            data = ""
            for col in cols:
                cls = " ".join(col.get("class", []))
                if "date" in cls.lower() or "colDate" in cls:
                    data = col.get_text(strip=True)
                    break
            if not data and len(cols) >= 3:
                data = cols[-1].get_text(strip=True)

            risultati.append({
                "titolo":   link_el.get_text(strip=True),
                "location": cols[1].get_text(strip=True) if len(cols) >= 2 else "Italia",
                "url":      href,
                "data":     data,
            })

        startrow += STEP
        if len(rows) < STEP:
            break
        time.sleep(0.3)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  ACCENTURE ITALIA  —  Workday (requests, API REST diretta)
#
#  Filtro paese: facet "locationCountry", ID Italia fisso.
#  Paginazione: offset crescente di 20 fino al "total" dichiarato.
# ============================================================

def scrape_accenture():
    print("🔍 Accenture Italia (Workday)...")
    URL = "https://accenture.wd103.myworkdayjobs.com/wday/cxs/accenture/AccentureCareers/jobs"
    ITALIA_ID = "8cd04a563fd94da7b06857a79faaf815"
    BASE_JOB_URL = "https://accenture.wd103.myworkdayjobs.com/en-US/AccentureCareers"
    LIMIT = 20
    risultati = []

    headers = {**HEADERS, "Content-Type": "application/json", "Accept": "application/json"}
    offset = 0
    totale_dichiarato = None
    while True:
        body = {"appliedFacets": {"locationCountry": [ITALIA_ID]}, "limit": LIMIT,
                "offset": offset, "searchText": ""}
        try:
            r = requests.post(URL, headers=headers, json=body, timeout=15)
            r.raise_for_status()
            dati = r.json()
        except Exception as e:
            print(f"    ⚠️  POST Workday Accenture → {e}")
            break

        if totale_dichiarato is None:
            totale_dichiarato = dati.get("total", 0)

        jobs = dati.get("jobPostings", [])
        if not jobs:
            break
        for j in jobs:
            titolo = j.get("title") or "N/D"
            path   = j.get("externalPath", "")
            bullet = j.get("bulletFields", [])
            luogo  = bullet[1] if len(bullet) > 1 else ""
            risultati.append({
                "titolo":   titolo,
                "location": f"Accenture Italia" + (f" · {luogo}" if luogo and luogo != "Location Negotiable" else ""),
                "url":      f"{BASE_JOB_URL}{path}" if path else "",
                "data":     _workday_data(j.get("postedOn")),
            })

        offset += LIMIT
        if offset >= totale_dichiarato:
            break
        time.sleep(0.2)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  NTT DATA ITALIA  —  requests + paginazione HTML classica
#
#  Paginazione: /career/posizioni-aperte/page/N. Selettore: a.job-detail-link.
# ============================================================

def scrape_nttdata():
    print("🔍 NTT DATA Italia...")
    BASE = "https://it.nttdata.com/career/posizioni-aperte"
    risultati = []
    page = 1

    while True:
        url = f"{BASE}/page/{page}" if page > 1 else BASE
        r = http_get(url)
        if not r:
            break
        soup  = BeautifulSoup(r.text, "lxml")
        cards = soup.select("a.job-detail-link")
        if not cards:
            break
        for a in cards:
            titolo_el = a.select_one(".is-h5")
            loc_el    = a.select_one(".is-small")
            href      = a.get("href", "")
            if href and not href.startswith("http"):
                href = "https://it.nttdata.com" + href
            risultati.append({
                "titolo":   titolo_el.get_text(strip=True) if titolo_el else "N/D",
                "location": f"NTT DATA · {loc_el.get_text(strip=True)}" if loc_el else "NTT DATA Italia",
                "url":      href,
                "data":     "",
            })
        page += 1
        time.sleep(0.3)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  BIP  —  Oracle Recruiting Cloud (requests, API REST diretta)
#
#  Ogni offerta include PrimaryLocationCountry: filtro Italia affidabile.
#  Paginazione: offset crescente di 25, fino al TotalJobsCount.
# ============================================================

def scrape_bip():
    print("🔍 Bip (Oracle Recruiting Cloud)...")
    BASE = "https://fa-etjb-saasfaprod1.fa.ocs.oraclecloud.com"
    API  = f"{BASE}/hcmRestApi/resources/latest/recruitingCEJobRequisitions"
    LIMIT = 25
    risultati = []

    headers = {**HEADERS, "Accept": "application/json"}
    offset = 0
    totale_dichiarato = None
    while True:
        finder = (f"findReqs;siteNumber=CX_1,limit={LIMIT},offset={offset},"
                  f"sortBy=POSTING_DATES_DESC")
        params = {"onlyData": "true", "expand": "requisitionList", "finder": finder}
        try:
            r = requests.get(API, headers=headers, params=params, timeout=15)
            r.raise_for_status()
            dati = r.json()["items"][0]
        except Exception as e:
            print(f"    ⚠️  GET Oracle Bip → {e}")
            break

        if totale_dichiarato is None:
            totale_dichiarato = dati.get("TotalJobsCount", 0)

        reqs = dati.get("requisitionList", [])
        if not reqs:
            break
        for j in reqs:
            if j.get("PrimaryLocationCountry") != "IT":
                continue
            job_id = j.get("Id", "")
            risultati.append({
                "titolo":   j.get("Title") or "N/D",
                "location": "Bip Italia",
                "url":      f"{BASE}/hcmUI/CandidateExperience/en/sites/CX_1/job/{job_id}" if job_id else "",
                "data":     j.get("PostedDate", ""),
            })

        offset += LIMIT
        if offset >= totale_dichiarato:
            break
        time.sleep(0.2)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  DIGITAL360 (Digital360, P4I, FPA, Digital360 GOV, Cryptonet Labs)
#
#  Sito HubSpot server-side. Paginazione: ?page=N.
#  ATTENZIONE: alcuni annunci (stesso ruolo, sedi diverse) condividono
#  LO STESSO URL — si aggiunge la città come frammento (#città) per
#  rendere l'hash univoco per sede.
# ============================================================

def scrape_digital360():
    print("🔍 Digital360 (gruppo: Digital360, P4I, FPA, GOV, Cryptonet Labs)...")
    BASE = "https://www.digital360.it/posizioni-aperte"
    risultati = []
    page = 1

    while True:
        r = http_get(BASE, params={"page": page})
        if not r:
            break
        soup  = BeautifulSoup(r.text, "lxml")
        cards = soup.select("div.positions-item")
        if not cards:
            break
        for c in cards:
            tag_el = c.select(".item-pre-heading p")
            azienda  = tag_el[0].get_text(strip=True) if len(tag_el) > 0 else "Digital360"
            citta    = tag_el[1].get_text(strip=True) if len(tag_el) > 1 else ""
            modalita = tag_el[2].get_text(strip=True) if len(tag_el) > 2 else ""
            h3 = c.select_one("h3.item-heading")
            a  = c.select_one(".item-actions a")
            href = a.get("href", "") if a else ""
            if href and citta:
                href = f"{href}#{citta.lower().replace(' ', '-')}"
            risultati.append({
                "titolo":   h3.get_text(strip=True) if h3 else "N/D",
                "location": f"{azienda} · {citta}" + (f" ({modalita})" if modalita else ""),
                "url":      href,
                "data":     "",
            })
        page += 1
        time.sleep(0.3)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  CAPGEMINI ITALIA  —  API custom (requests, API REST diretta)
#
#  ATTENZIONE: country_code va passato come "it-it" (minuscolo, con
#  trattino): "IT" o "it" restituiscono 0 risultati senza errore.
#  Paginazione: page/size, ci si ferma al "total" dichiarato.
# ============================================================

def scrape_capgemini():
    print("🔍 Capgemini Italia...")
    URL  = "https://cg-jobstream-api.azurewebsites.net/api/job-search"
    SIZE = 50
    risultati = []

    headers = {**HEADERS, "Accept": "application/json"}
    page = 1
    totale_dichiarato = None
    while True:
        params = {"country_code": "it-it", "page": page, "size": SIZE}
        try:
            r = requests.get(URL, headers=headers, params=params, timeout=15)
            r.raise_for_status()
            dati = r.json()
        except Exception as e:
            print(f"    ⚠️  GET Capgemini → {e}")
            break

        if totale_dichiarato is None:
            totale_dichiarato = dati.get("total", 0)

        jobs = dati.get("data", [])
        if not jobs:
            break
        for j in jobs:
            # "tcsource=apply" apre subito il modulo di candidatura: lo togliamo
            url_annuncio = (j.get("apply_job_url", "") or "").replace("&tcsource=apply", "")
            risultati.append({
                "titolo":   j.get("title") or "N/D",
                "location": f"Capgemini · {j.get('location','')}".rstrip(" ·"),
                "url":      url_annuncio,
                "data":     "",
            })

        page += 1
        if len(risultati) >= totale_dichiarato:
            break
        time.sleep(0.2)

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
    "Accenture":  ("#A100FF", "#ffffff"),
    "NTT DATA":   ("#FF0033", "#ffffff"),
    "Bip":        ("#1a1a2e", "#ffffff"),
    "Digital360": ("#0d1b2a", "#ffffff"),
    "Capgemini":  ("#0070AD", "#ffffff"),
}

def genera_html(tutte, totale_trovate, problemi=None, fonti=None, nascoste=None):
    oggi_str = datetime.now().strftime("%d %B %Y")
    totale   = sum(len(v) for v in tutte.values())
    elenco_fonti = " · ".join(fonti or BRAND_COLORS.keys())

    # Banner diagnostico: compare solo se l'health check ha rilevato qualcosa
    avviso = ""
    if problemi:
        righe_pb = ""
        for gravita, fonte, msg in problemi:
            icona = "🔴" if gravita == "bloccante" else "🟠"
            righe_pb += (f'<li style="margin-bottom:5px;">{icona} <strong>{fonte}</strong>: {msg}</li>')
        avviso = (
            '<div style="background:#fff4e5;border-left:4px solid #ff9800;'
            'padding:12px 18px;margin:0 0 18px;border-radius:6px;">'
            '<div style="font-size:14px;font-weight:700;color:#8a4b00;margin-bottom:6px;">'
            '⚠️ Controllo automatico: possibili scraper da verificare</div>'
            f'<ul style="margin:0;padding-left:18px;font-size:12px;color:#8a4b00;">{righe_pb}</ul>'
            '</div>'
        )

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
                <a href="{o.get('url') or '#'}" style="color:#1a1a2e;font-weight:600;text-decoration:none;
                   font-size:14px;line-height:1.4;display:block;">{o['titolo']}</a>
                <div style="margin-top:3px;font-size:12px;">{loc}{data}</div>
              </td>
            </tr>"""
        sezioni += f"""
        <div style="margin-bottom:24px;border-radius:8px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:{bg};">
            <tr>
              <td style="padding:11px 16px;color:{fg};font-size:16px;font-weight:700;">{azienda}</td>
              <td align="right" style="padding:11px 16px;color:{fg};font-size:12px;opacity:.8;white-space:nowrap;">
                {len(offerte)} nuov{'a' if len(offerte)==1 else 'e'}
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;">{righe}</table>
        </div>"""

    nota_nascoste = ""
    if nascoste:
        n = sum(nascoste.values())
        nota_nascoste = (
            '<p style="text-align:center;font-size:11px;color:#999;margin:4px 0 0;">'
            f'{n} offert{"a" if n == 1 else "e"} compars{"a" if n == 1 else "e"} oggi ma '
            f'pubblicat{"a" if n == 1 else "e"} da più di {MAX_GIORNI_NUOVA} giorni non '
            f'{"è mostrata" if n == 1 else "sono mostrate"} ('
            + ", ".join(f"{k} {v}" for k, v in nascoste.items()) + ').</p>')

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
      <div style="font-size:11px;margin-top:3px;opacity:.8;">{elenco_fonti}</div>
    </div>
    <div style="background:#f8f9fa;padding:20px 14px;">{avviso}{body}{nota_nascoste}</div>
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
    """Restituisce lo stato dell'invio: 'ok', 'auth' (credenziali rifiutate),
    'config' (secret mancanti) o 'errore'."""
    if not GMAIL_MITTENTE or not GMAIL_PASSWORD or not EMAIL_DESTINATARIO:
        mancanti = [n for n, v in [("GMAIL_MITTENTE", GMAIL_MITTENTE),
                                    ("GMAIL_PASSWORD", GMAIL_PASSWORD),
                                    ("EMAIL_DESTINATARIO", EMAIL_DESTINATARIO)] if not v]
        print(f"❌ Secret mancanti o vuoti: {', '.join(mancanti)}")
        return "config"

    # Supporta più destinatari separati da virgola nel secret EMAIL_DESTINATARIO
    # Separatori ammessi: virgola, punto e virgola, spazio, a capo.
    # dict.fromkeys rimuove eventuali doppioni mantenendo l'ordine.
    destinatari = list(dict.fromkeys(
        d.strip() for d in re.split(r"[,;\s]+", EMAIL_DESTINATARIO) if d.strip()))

    msg            = MIMEMultipart("alternative")
    msg["Subject"] = f"📰 Big4 Jobs {datetime.now():%d/%m/%Y} — {totale} nuove offerte"
    msg["From"]    = GMAIL_MITTENTE
    # Destinatari in CCN: nell'intestazione "A" compare solo il mittente e
    # NON si scrive alcun header "Bcc" (altrimenti gli indirizzi sarebbero
    # visibili nel sorgente del messaggio). I veri destinatari vengono
    # passati solo a sendmail(), cioè a livello di trasporto SMTP.
    msg["To"]      = GMAIL_MITTENTE
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(GMAIL_MITTENTE, GMAIL_PASSWORD)
            # Il mittente riceve anch'esso la copia (è nel campo "A"): lo si aggiunge
            # una sola volta per non ricevere doppioni se è già tra i destinatari.
            invio_a = list(dict.fromkeys([GMAIL_MITTENTE] + destinatari))
            s.sendmail(GMAIL_MITTENTE, invio_a, msg.as_string())
        print(f"✅ Email inviata in CCN a {len(destinatari)} destinatari")
        return "ok"
    except smtplib.SMTPAuthenticationError:
        print("❌ Errore autenticazione → rigenera App Password su myaccount.google.com")
        return "auth"
    except Exception as e:
        print(f"❌ Errore invio: {e}")
        return "errore"

# ============================================================
# 🚀  MAIN
# ============================================================

def main():
    print(f"\n{'='*55}")
    print(f"  BIG4 JOB NEWSLETTER  {datetime.now():%d/%m/%Y %H:%M}")
    print(f"{'='*55}\n")

    seen, storico = carica_seen()

    scrapers = [
        ("EY",         scrape_ey),
        ("PwC Italia", scrape_pwc_italia),
        ("PwC Belgio", scrape_pwc_belgio),
        ("Deloitte",   scrape_deloitte),
        ("KPMG",       scrape_kpmg),
        ("Accenture",  scrape_accenture),
        ("NTT DATA",   scrape_nttdata),
        ("Bip",        scrape_bip),
        ("Digital360", scrape_digital360),
        ("Capgemini",  scrape_capgemini),
    ]

    tutte_trovate = {}
    tutte_nuove   = {}
    errori_scraper = {}   # scraper che hanno sollevato un'eccezione
    nascoste       = {}   # fonte → n. offerte nuove ma pubblicate da troppo tempo

    for nome, fn in scrapers:
        try:
            offerte = fn()
            tutte_trovate[nome] = offerte
            if offerte:
                nuove, seen = filtra_nuove(nome, offerte, seen)
                if MAX_GIORNI_NUOVA is not None:
                    recenti = [o for o in nuove
                               if (_eta_giorni(o.get("data")) or 0) <= MAX_GIORNI_NUOVA]
                    if len(recenti) < len(nuove):
                        nascoste[nome] = len(nuove) - len(recenti)
                        print(f"   → {nascoste[nome]} non mostrate: pubblicate da più di "
                              f"{MAX_GIORNI_NUOVA} giorni")
                    nuove = recenti
                if nuove:
                    tutte_nuove[nome] = nuove
        except Exception as e:
            print(f"   ❌ {nome}: {e}")
            tutte_trovate[nome] = []
            errori_scraper[nome] = str(e)
        time.sleep(1)

    conteggi        = {n: len(tutte_trovate.get(n, [])) for n, _ in scrapers}
    nuove_per_fonte = {n: len(tutte_nuove.get(n, []))   for n, _ in scrapers}

    # --- Health check: confronta con lo storico prima di aggiornarlo ---
    problemi = health_check(conteggi, nuove_per_fonte, storico)
    for nome, err in errori_scraper.items():
        problemi.insert(0, ("bloccante", nome, f"eccezione durante lo scraping: {err}"))

    # Lo storico si aggiorna comunque, così la mediana resta rappresentativa
    storico = storico + [{"data": datetime.now().strftime("%Y-%m-%d"), "conteggi": conteggi}]
    salva_seen(seen, storico)

    totale_trovate = sum(conteggi.values())
    totale_nuove   = sum(nuove_per_fonte.values())

    print(f"\n📊 Riepilogo:")
    for n in [s[0] for s in scrapers]:
        cop = ""
        if n in COPERTURA:
            racc, dich = COPERTURA[n]
            cop = f" · copertura {racc}/{dich}"
        print(f"   {n:15s}→ {conteggi[n]:3d} trovate · {nuove_per_fonte[n]:3d} nuove{cop}")
    print(f"   {'TOTALE':15s}→ {totale_trovate:3d} trovate · {totale_nuove:3d} nuove\n")

    if problemi:
        print("🩺 Health check — anomalie rilevate:")
        for gravita, fonte, msg in problemi:
            print(f"   {'🔴' if gravita=='bloccante' else '🟠'} [{gravita}] {fonte}: {msg}")
    else:
        print("🩺 Health check: tutte le fonti nella norma ✅")

    if nascoste:
        print(f"   ({sum(nascoste.values())} offerte non mostrate perché pubblicate da più di "
              f"{MAX_GIORNI_NUOVA} giorni: " + ", ".join(f"{k} {v}" for k, v in nascoste.items()) + ")")

    html, totale = genera_html(tutte_nuove, totale_trovate, problemi,
                               fonti=[n for n, _ in scrapers], nascoste=nascoste)
    stato_invio  = invia_email(html, totale)
    print("\n✨ Done!\n")

    # --- Esito del workflow ---
    # Si esce con codice 1 (run rossa su GitHub → notifica automatica via email)
    # solo per i problemi che l'email da sola non può segnalare o che sono gravi.
    motivi_fallimento = []
    if stato_invio == "auth":
        motivi_fallimento.append("autenticazione SMTP rifiutata (App Password Gmail scaduta o revocata)")
    elif stato_invio == "config":
        motivi_fallimento.append("secret GitHub mancanti o vuoti")
    elif stato_invio == "errore":
        motivi_fallimento.append("invio email fallito")
    bloccanti = [p for p in problemi if p[0] == "bloccante"]
    if bloccanti:
        motivi_fallimento.append(f"{len(bloccanti)} scraper senza risultati: "
                                 + ", ".join(p[1] for p in bloccanti))

    if motivi_fallimento:
        print("❌ Run marcata come FALLITA per:")
        for m in motivi_fallimento:
            print(f"   · {m}")
        sys.exit(1)

if __name__ == "__main__":
    main()

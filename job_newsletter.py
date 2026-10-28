# ============================================================
#  📰 JOB NEWSLETTER — Big4 & consulting Italia/Belgio
#  EY | PwC Italia | PwC Belgio | Deloitte | KPMG | Accenture
#  NTT DATA Italia | NTT DATA Belgio | Bip | Digital360 | Capgemini
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
import html as html_lib
from zoneinfo import ZoneInfo

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

# Recupero una tantum: offerte mai inviate perché lo scraper non le trovava
# (EY, ottobre 2026: sedi di Trieste, Siena, Tournai e Gosselies mancanti).
# Sono più vecchie di MAX_GIORNI_NUOVA ma vanno mostrate UNA volta; dopo
# l'invio finiscono in seen_jobs.json e non tornano. Valido fino alla data
# indicata, poi il blocco si può cancellare.
RECUPERO_UNA_TANTUM = {
    "fino_al": "2026-11-15",
    "titoli": {"EY": ["FAAS Trieste", "Healthcare e Life science - Siena",
                      "Tournai", "Gosselies"]},
}

def _da_recuperare(fonte, offerta):
    if oggi_italia() > RECUPERO_UNA_TANTUM["fino_al"]:
        return False
    t = (offerta.get("titolo") or "").lower()
    return any(k.lower() in t for k in RECUPERO_UNA_TANTUM["titoli"].get(fonte, []))

# Etichette mostrate accanto a ogni offerta nell'email, dedotte dal titolo.
# Per ciascun gruppo vince la PRIMA regola che corrisponde (l'ordine conta);
# se nessuna corrisponde, l'etichetta del gruppo non compare.
ETICHETTE_LIVELLO = [
    ("Stage",   r"\b(stage|stagiaire|intern(ship)?|tirocini[oa])\b"),
    ("Junior",  r"\b(junior|jr\.?|graduate|neolaureat[oie]|entry[ -]level|assistant)\b"),
    ("Manager", r"\b(manager|director|partner|head of|lead)\b"),
    ("Senior",  r"\b(senior|sr\.?|experienced)\b"),
]
ETICHETTE_AREA = [
    ("Audit",      r"\b(audit|assurance|revisione)\b"),
    ("Tax & Legal", r"\b(tax|fiscal\w*|tributari\w*|legal|legale)\b"),
    ("Deals",      r"\b(deals?|m&a|valuation|transaction\w*|corporate finance)\b"),
    ("Tech",       r"\b(developer|engineer\w*|sap|cloud|data|cyber\w*|software|architect|devops|"
                   r"java|python|it)\b"),
    ("Consulting", r"\b(consult\w*|advisory|strategy|business analyst)\b"),
]

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

# Nomi di fonte cambiati nel tempo (vecchio → nuovo), per lo storico dei conteggi
FONTI_RINOMINATE = {"NTT DATA": "NTT DATA Italia", "Accenture": "Accenture Italia",
                    "Deloitte": "Deloitte Italia", "KPMG": "KPMG Italia",
                    "Capgemini": "Capgemini Italia"}

# Prima run di una fonte appena aggiunta: tutte le sue offerte risulterebbero
# "nuove" (centinaia). Si mostrano solo quelle pubblicate negli ultimi N giorni;
# le altre (e quelle senza data) si registrano come viste senza mostrarle.
GIORNI_FONTE_NUOVA = 7

class SeenIlleggibile(Exception):
    """seen_jobs.json esiste ma non si riesce a leggere."""

def carica_seen() -> tuple[set, list]:
    """Restituisce (ID già visti, storico dei conteggi per fonte).

    Se il file ESISTE ma è illeggibile (JSON troncato, conflitto di merge,
    struttura inattesa) solleva SeenIlleggibile: proseguire con un insieme
    vuoto farebbe inviare come "nuove" tutte le ~3000 offerte monitorate e
    sovrascriverebbe lo storico. Meglio fermarsi e far fallire la run."""
    if not os.path.exists(SEEN_FILE):
        print(f"📂 {SEEN_FILE} non trovato — prima esecuzione, tutte le offerte sono nuove")
        return set(), []
    try:
        with open(SEEN_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict) or not isinstance(data.get("ids", []), list):
            raise ValueError("struttura inattesa (manca la lista 'ids')")
        ids     = {i for i in data.get("ids", []) if isinstance(i, str)}
        storico = [r for r in (data.get("storico_conteggi") or []) if isinstance(r, dict)]
        # Fonti rinominate: lo storico dei conteggi resta collegato al nuovo nome
        for run in storico:
            c = run.get("conteggi")
            if isinstance(c, dict):
                for vecchio, nuovo in FONTI_RINOMINATE.items():
                    if vecchio in c and nuovo not in c:
                        c[nuovo] = c.pop(vecchio)
    except Exception as e:
        raise SeenIlleggibile(f"{SEEN_FILE} illeggibile: {e}") from e
    print(f"📂 Caricati {len(ids)} ID già visti da {SEEN_FILE} · storico: {len(storico)} run")
    return ids, storico

def oggi_italia() -> str:
    """Data di oggi in Italia (AAAA-MM-GG): GitHub gira in UTC."""
    return datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")

def leggi_ultimo_invio():
    """Data (ora italiana) dell'ultima newsletter inviata con successo, o None."""
    try:
        with open(SEEN_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("ultimo_invio")
    except Exception:
        return None

def salva_seen(seen: set, storico: list, ultimo_invio=None):
    """Scrittura atomica: si scrive un file temporaneo e lo si rinomina. Se la
    run si interrompe a metà scrittura, seen_jobs.json resta quello di prima
    invece di rimanere troncato (e illeggibile alla run successiva)."""
    tmp = SEEN_FILE + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({
                "ids":               sorted(seen),   # ordinati: diff git stabili tra una run e l'altra
                "aggiornato":        datetime.now().isoformat(),
                # Serve a inviare UNA sola newsletter al giorno anche se il
                # workflow parte più volte (più orari pianificati + avvio esterno)
                "ultimo_invio":      ultimo_invio or leggi_ultimo_invio(),
                "storico_conteggi":  storico[-STORICO_MAX_RUN:],   # solo le ultime N run
            }, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, SEEN_FILE)
        print(f"💾 Salvati {len(seen)} ID in {SEEN_FILE}")
    except Exception as e:
        print(f"⚠️  Errore scrittura {SEEN_FILE}: {e}")
        try:
            os.remove(tmp)
        except OSError:
            pass

def filtra_nuove(azienda: str, offerte: list, seen: set) -> tuple[list, set]:
    nuove = []
    nuovi_ids = set()
    for o in offerte:
        job_id = _job_id(azienda, o)
        # "not in nuovi_ids": la stessa offerta presente due volte nella
        # raccolta di oggi compare una sola volta nell'email
        if job_id not in seen and job_id not in nuovi_ids:
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
        # Storico dei conteggi passati per questa fonte. Gli zeri (giorni in cui
        # lo scraper era rotto, già segnalati come bloccanti) si escludono: altrimenti
        # abbasserebbero la mediana e nasconderebbero un recupero solo parziale.
        passati = [run["conteggi"][fonte] for run in storico
                   if isinstance(run.get("conteggi"), dict)
                   and isinstance(run["conteggi"].get(fonte), int) and run["conteggi"][fonte] > 0]

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
        if passati and trovate > 0 and (nuove / trovate) > SOGLIA_NUOVE_ANOMALE and nuove > 5:
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

def _crea_sessione():
    """Sessione HTTP con retry automatico sugli errori temporanei (connessione
    caduta, 429, 5xx), con attesa crescente (1s, 2s, 4s) e rispetto di
    Retry-After. Senza retry un singolo 502 faceva perdere una fonte intera
    o troncava la paginazione a metà (le offerte saltate tornavano poi come
    false "nuove"). Anche i POST si ripetono: qui sono tutte ricerche, senza
    effetti collaterali."""
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    retry = Retry(total=3, connect=3, read=3, status=3, backoff_factor=1,
                  status_forcelist=(429, 500, 502, 503, 504),
                  allowed_methods=None,            # None = tutti i metodi, POST compreso
                  respect_retry_after_header=True, raise_on_status=False)
    s = requests.Session()
    adapter = HTTPAdapter(max_retries=retry, pool_maxsize=10)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s

SESSION = _crea_sessione()

def http_get(url, **kw):
    try:
        headers = {**HEADERS, **kw.pop("headers", {})}
        timeout = kw.pop("timeout", 15)
        r = SESSION.get(url, headers=headers, timeout=timeout, **kw)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"    ⚠️  GET {url[:70]}... → {e}")
        return None

def http_post(url, **kw):
    try:
        headers = {**HEADERS, **kw.pop("headers", {})}
        timeout = kw.pop("timeout", 15)
        r = SESSION.post(url, headers=headers, timeout=timeout, **kw)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"    ⚠️  POST {url[:70]}... → {e}")
        return None

def _json(r):
    """JSON della risposta, o None se la risposta manca o non è JSON valido."""
    if r is None:
        return None
    try:
        return r.json()
    except ValueError:
        print(f"    ⚠️  Risposta non JSON da {r.url[:70]}...")
        return None

# Tetto di sicurezza per le paginazioni "finché ci sono risultati": se un sito
# risponde a una pagina oltre l'ultima ripetendo l'ultima (o la prima) pagina,
# senza un tetto il ciclo non terminerebbe mai e la run resterebbe appesa.
MAX_PAGINE = 100

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
    # Aggiunte a ottobre 2026 dopo la verifica di completezza (verifica_siti.py):
    # c'erano offerte a Trieste e Siena che nessuna ricerca trovava. Le ricerche
    # per paese ("italia", "italy") coprono le sedi minori non elencate; le
    # offerte estere che ne escono vengono scartate dal controllo del paese.
    ("trieste", "Italia"), ("siena", "Italia"), ("cagliari", "Italia"),
    ("palermo", "Italia"), ("catania", "Italia"), ("pescara", "Italia"),
    ("perugia", "Italia"), ("italia", "Italia"), ("italy", "Italia"),
    # Belgio
    ("brussels", "Belgio"), ("bruxelles", "Belgio"), ("antwerp", "Belgio"),
    ("antwerpen", "Belgio"), ("ghent", "Belgio"), ("gent", "Belgio"),
    ("liege", "Belgio"), ("diegem", "Belgio"), ("hasselt", "Belgio"),
    # Aggiunte a ottobre 2026: offerte a Tournai e Gosselies non trovate
    ("tournai", "Belgio"), ("gosselies", "Belgio"), ("charleroi", "Belgio"),
    ("namur", "Belgio"), ("mons", "Belgio"), ("leuven", "Belgio"),
    ("mechelen", "Belgio"), ("belgium", "Belgio"), ("belgique", "Belgio"),
]

EY_BOARD_ID = "c1riT--B2O-KySgYWsZO1Q"

# Riconosce la sede nel titolo dell'offerta (solo parole intere: "roma" non
# deve scattare su "Romania", "gent" non su "agent").
EY_SEDE_RE = re.compile(
    r"\b(" + "|".join(sorted({c for c, _ in EY_CITTA
                               if c not in ("italia", "italy", "belgium", "belgique")},
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
    MAX_PAGINE_EY = 40   # tetto di sicurezza per città (~1000 offerte)

    risultati = []
    tot_dichiarate = tot_raccolte = 0

    for citta, paese in EY_CITTA:
        raccolti   = {}     # chiave (req id o url) → offerta
        dichiarato = None
        for pagina in range(1, MAX_PAGINE_EY + 1):
            url = f"{BASE}/search?query={citta}&locale=it&page_number={pagina}"
            j = _json(http_get(url, headers=ey_headers))
            if not isinstance(j, dict):
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
            r = SESSION.get(url, headers=HEADERS, timeout=20)
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

# Sedi riconosciute nel facet "locations" di Workday per gli altri paesi.
# Belfast (Irlanda del Nord) è Regno Unito: non rientra in "Irlanda".
PWC_SEDI = {
    "Belgio":      (PWC_BE_SEDI, "Belgium"),
    "Lussemburgo": (re.compile(r"\b(luxembourg|luxemburg|kirchberg|leudelange)\b", re.I), "Luxembourg"),
    "Irlanda":     (re.compile(r"\b(dublin|cork|limerick|galway|waterford|kilkenny|ireland)\b", re.I), "Ireland"),
    # NOTA (ottobre 2026): werkenbijpwc.nl rifiuta la connessione e pwc.nl blocca
    # gli accessi automatici. Dal Workday globale arrivano solo le offerte NL
    # pubblicate lì (poche): copertura parziale.
    "Paesi Bassi": (re.compile(r"\b(amsterdam|rotterdam|utrecht|eindhoven|groningen|zwolle|den haag|"
                               r"the hague|amstelveen|arnhem|maastricht|netherlands)\b", re.I), "Netherlands"),
}

def _pwc_belgio_workday(paese="Belgio"):
    """API Workday (CXS) dei due career site PwC, max 20 risultati a pagina.

    NOTA (ottobre 2026): prima si filtrava con searchText="Belgium", che
    perdeva ~20 offerte belghe su ~95 (es. 41 su 57 a Bruxelles) e includeva
    offerte estere (es. Brno). Ora si legge il facet "locations" e si
    selezionano gli ID delle sedi belghe: filtro esatto e completo.
    Se il facet non è leggibile si torna al vecchio filtro testuale."""
    out, visti = [], set()
    tot_dichiarate = 0
    h = {**HEADERS, "Content-Type": "application/json", "Accept": "application/json"}
    sedi_re, testo_paese = PWC_SEDI[paese]
    for site in ["Global_Campus_Careers", "Global_Experienced_Careers"]:
        api = f"https://pwc.wd3.myworkdayjobs.com/wday/cxs/pwc/{site}/jobs"

        # 1) ID delle sedi del paese dal facet "locations"
        filtro = {"appliedFacets": {}, "searchText": testo_paese}   # fallback
        try:
            r = SESSION.post(api, headers=h, timeout=20,
                              json={"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""})
            r.raise_for_status()
            ids = [v["id"]
                   for f in r.json().get("facets", []) if f.get("facetParameter") == "locationMainGroup"
                   for g in f.get("values", []) if g.get("facetParameter") == "locations"
                   for v in g.get("values", []) if sedi_re.search(v.get("descriptor", ""))]
            if ids:
                filtro = {"appliedFacets": {"locations": ids}, "searchText": ""}
            else:
                print(f"    ⚠️  Workday {site}: nessuna sede ({paese}) nel facet, uso il filtro testuale")
        except Exception as e:
            print(f"    ⚠️  Workday {site} facet → {e} (uso il filtro testuale)")

        # 2) Paginazione
        offset, totale = 0, None
        for _ in range(30):
            try:
                r = SESSION.post(api, headers=h, timeout=20,
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
                            "location": f"PwC {paese} · {j.get('locationsText')}" if paese != "Belgio" and j.get("locationsText")
                                        else (j.get("locationsText") or paese),
                            "url": _senza_apply(url_apply),   # pagina dell'offerta
                            "_id_src": url_apply,             # ID invariato rispetto al passato
                            "data": _workday_data(j.get("postedOn"))})
            offset += len(posts)
            if offset >= totale:
                break
            time.sleep(0.4)
    registra_copertura(f"PwC {paese}", len(out), tot_dichiarate)
    return out

def scrape_pwc_paese(paese):
    """PwC Lussemburgo e Irlanda: stessi career site Workday globali del Belgio."""
    print(f"🔍 PwC {paese} (Workday API)...")
    risultati = _pwc_belgio_workday(paese)
    print(f"   → {len(risultati)} offerte trovate")
    return risultati

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
#
#  Filtri URL: 729=5946 è il paese (Italia; 5947 Grecia, 5948 Malta).
#  NOTA (ottobre 2026): c'era anche 731=[6470,6471], un filtro sul livello che
#  escludeva le ~20 offerte "Manager and above". Tolto: le altre fonti
#  includono già i Manager, che nell'email hanno l'etichetta "Manager".
# ============================================================

# Portali Avature di Deloitte: (base, filtri URL). Deloitte Belgio ha un
# portale tutto suo, quindi senza filtro paese.
DELOITTE_AVATURE = {
    "Italia": ("https://deloittecm.avature.net", "729=5946&729_format=1565&"),
    "Belgio": ("https://deloittebe.avature.net", ""),
}

def scrape_deloitte(paese="Italia"):
    print(f"🔍 Deloitte {paese} (Avature)...")
    base, filtri = DELOITTE_AVATURE[paese]
    risultati = []
    visti     = set()
    offset    = 0
    totale    = None

    for _ in range(150):   # tetto di sicurezza (~900 offerte)
        url = (f"{base}/en_US/careers/SearchJobs/?{filtri}"
               f"listFilterMode=1&jobRecordsPerPage=50&jobOffset={offset}")
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
                               "location": f"Deloitte {paese}" + (f" · {loc}" if loc else ""),
                               "url": href, "data": ""})
        if nuovi == 0: break
        offset += len(cards)
        if totale and offset >= totale: break
        time.sleep(0.4)

    registra_copertura(f"Deloitte {paese}", len(risultati), totale)
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
    visti     = set()
    startrow  = 0

    for _ in range(400):   # tetto di sicurezza (~2000 offerte con 5 per pagina)
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

        nuovi = 0
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
            if href in visti:
                continue
            visti.add(href)
            nuovi += 1
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

        # Pagina che non porta offerte nuove (es. il sito ripete l'ultima pagina
        # oltre la fine): ci si ferma invece di girare all'infinito.
        if nuovi == 0:
            break
        startrow += STEP
        if len(rows) < STEP:
            break
        time.sleep(0.3)

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  PORTALI SuccessFactors "classici" (tabella tr.data-row)
#
#  Usati da EY (careers.ey.com, posizioni experienced in tutti i paesi) e da
#  KPMG Belgio (ema-careers.kpmg.com). Ogni pagina ha 25-50 righe con
#  a.jobTitle-link e span.jobLocation ("Limerick, IE"); paginazione con
#  &startrow=N; il totale è in "1 – 25 of 155".
# ============================================================

def _sf_classico(base, ricerca, nome, sigla_paese=None):
    """Tutte le offerte di una ricerca SuccessFactors. Con sigla_paese ("IE")
    si tengono solo le righe con sede in quel paese: le offerte multi-sede
    possono mostrare una sede principale estera (es. "Hoboken, NJ" nella
    ricerca Paesi Bassi)."""
    out, visti, totale, startrow, escluse = [], set(), None, 0, 0
    for _ in range(MAX_PAGINE):
        r = http_get(f"{base}{ricerca}&startrow={startrow}")
        if not r:
            break
        if totale is None:
            m = re.search(r"\d+\s*[–-]\s*\d+\s*(?:of|di|van|sur)\s*([\d.,]+)",
                          BeautifulSoup(r.text, "lxml").get_text(" ", strip=True))
            totale = int(re.sub(r"\D", "", m.group(1))) if m else None
        soup = BeautifulSoup(r.text, "lxml")
        righe = soup.select("tr.data-row")
        if not righe:
            break
        nuove = 0
        for tr in righe:
            a = tr.select_one("a.jobTitle-link")
            if not a:
                continue
            href = a.get("href", "")
            if href and not href.startswith("http"):
                href = base + href
            if href in visti:
                continue
            visti.add(href)
            nuove += 1
            loc_el  = tr.select_one(".jobLocation")
            data_el = tr.select_one(".jobDate, .colDate")
            loc = loc_el.get_text(" ", strip=True) if loc_el else ""
            loc = re.sub(r"\s*\+\d+\s*more.*$", "", loc)
            if sigla_paese and loc and not re.search(rf",\s*{sigla_paese}\b", loc):
                escluse += 1
                continue
            citta = loc.split(",")[0].strip()          # "Milano, IT, 20123" → "Milano"
            out.append({"titolo":   a.get_text(strip=True),
                        "location": nome + (f" · {citta}" if citta else ""),
                        "url":      href,
                        "data":     data_el.get_text(strip=True) if data_el else ""})
        if nuove == 0:
            break
        startrow += len(righe)
        if totale and startrow >= totale:
            break
        time.sleep(0.4)
    if escluse:
        print(f"    → escluse {escluse} offerte con sede principale fuori dal paese")
    registra_copertura(nome, len(out) + escluse, totale)
    return out

# Sigla paese del filtro di careers.ey.com
EY_SF_PAESI = {"Italia": "IT", "Belgio": "BE", "Lussemburgo": "LU", "Irlanda": "IE", "Paesi Bassi": "NL"}

def scrape_ey_experienced(paese):
    """EY: careers.ey.com è il portale delle posizioni experienced (il board
    Yello letto da scrape_ey è soprattutto per neolaureati e stage)."""
    nome = f"EY {paese}"
    print(f"🔍 {nome} (careers.ey.com)...")
    sigla = EY_SF_PAESI[paese]
    out = _sf_classico("https://careers.ey.com", f"/ey/search/?q=&optionsFacetsDD_country={sigla}",
                       nome, sigla)
    print(f"   → {len(out)} offerte trovate")
    return out

def scrape_kpmg_belgio():
    print("🔍 KPMG Belgio (ema-careers.kpmg.com)...")
    out = _sf_classico("https://ema-careers.kpmg.com", "/search/?q=&locationsearch=Belgium",
                       "KPMG Belgio", "BE")
    print(f"   → {len(out)} offerte trovate")
    return out

# ============================================================
# 🏢  SuccessFactors "Career Site Builder" (nuova interfaccia, API JSON)
#
#  KPMG Lussemburgo (careers.kpmg.lu) e Deloitte Lussemburgo (jobs.deloitte.lu):
#  la pagina carica le offerte con POST /services/recruiting/v1/jobs.
#  Se le chiamate dirette non restituiscono nulla (il sito vuole i cookie e
#  il token della sessione del browser) si ripetono dentro Playwright.
# ============================================================

def _sf_csb_corpo(pagina, categoria, locale):
    return {"locale": locale, "pageNumber": pagina, "sortBy": "", "keywords": "", "location": "",
            "facetFilters": {}, "brand": "", "skills": [], "categoryId": categoria,
            "alertId": "", "rcmCandidateId": ""}

def _sf_csb_requests(host, categoria, locale, pagina_ricerca):
    s = requests.Session()
    s.headers.update(HEADERS)
    r = s.get(host + pagina_ricerca, timeout=30)
    token = re.search(r'csrf[_-]?token["\']?\s*[:=]\s*["\']([^"\']+)', r.text, re.I)
    h = {"Content-Type": "application/json", "Accept": "application/json",
         "Origin": host, "Referer": host + pagina_ricerca}
    if token:
        h["X-CSRF-Token"] = token.group(1)
    risultati, totale = [], None
    for pagina in range(MAX_PAGINE):
        d = s.post(host + "/services/recruiting/v1/jobs", json=_sf_csb_corpo(pagina, categoria, locale),
                   headers=h, timeout=30).json()
        totale = d.get("totalJobs") if totale is None else totale
        blocco = [x.get("response") or {} for x in d.get("jobSearchResult") or []]
        if not blocco:
            break
        risultati += blocco
        if totale and len(risultati) >= totale:
            break
        time.sleep(0.4)
    return risultati, totale

def _sf_csb_playwright(host, categoria, locale, pagina_ricerca):
    if not PLAYWRIGHT_OK:
        return [], None
    JS = """async ([categoria, locale]) => {
        let out = [], totale = null;
        for (let pagina = 0; pagina < 100; pagina++) {
            const r = await fetch('/services/recruiting/v1/jobs', {method: 'POST',
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                body: JSON.stringify({locale, pageNumber: pagina, sortBy: '', keywords: '', location: '',
                    facetFilters: {}, brand: '', skills: [], categoryId: categoria, alertId: '', rcmCandidateId: ''})});
            if (!r.ok) break;
            const d = await r.json();
            if (totale === null) totale = d.totalJobs;
            const blocco = (d.jobSearchResult || []).map(x => x.response || {});
            if (!blocco.length) break;
            out.push(...blocco);
            if (totale && out.length >= totale) break;
        }
        return {out, totale};
    }"""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            page = browser.new_context(user_agent=HEADERS["User-Agent"], locale="en-GB").new_page()
            page.goto(host + pagina_ricerca, wait_until="networkidle", timeout=60_000)
            res = page.evaluate(JS, [categoria, locale])
            browser.close()
            return res.get("out") or [], res.get("totale")
    except Exception as e:
        print(f"    ⚠️  Playwright {host}: {e}")
        return [], None

def _sf_csb(host, nome, categoria=0, locale="en_GB", pagina_ricerca="/search/?q="):
    try:
        jobs, totale = _sf_csb_requests(host, categoria, locale, pagina_ricerca)
    except Exception as e:
        print(f"    ⚠️  {nome}: API → {e}")
        jobs, totale = [], None
    if not jobs:
        print("    → API senza risultati, riprovo dal browser...")
        jobs, totale = _sf_csb_playwright(host, categoria, locale, pagina_ricerca)
    out, visti = [], set()
    for j in jobs:
        jid = j.get("id")
        if not jid or jid in visti:
            continue
        visti.add(jid)
        titolo = html_lib.unescape(j.get("unifiedStandardTitle") or "N/D")
        luoghi = j.get("jobLocationShort") or []
        citta  = (luoghi[0].split(",")[0].strip() if luoghi else "")
        out.append({"titolo":   titolo,
                    "location": nome + (f" · {citta}" if citta else ""),
                    "url":      f"{host}/job/{j.get('urlTitle') or 'job'}/{jid}-{locale}",
                    "_id_src":  f"{host}/job/{jid}",       # stabile anche se cambia il titolo
                    "data":     j.get("unifiedStandardStart") or ""})   # "16/09/2025"
    registra_copertura(nome, len(out), totale)
    return out

def scrape_kpmg_lussemburgo():
    print("🔍 KPMG Lussemburgo (careers.kpmg.lu)...")
    out = _sf_csb("https://careers.kpmg.lu", "KPMG Lussemburgo")
    print(f"   → {len(out)} offerte trovate")
    return out

def scrape_deloitte_lussemburgo():
    print("🔍 Deloitte Lussemburgo (jobs.deloitte.lu)...")
    # 9826901 = categoria "View all Jobs" del portale
    out = _sf_csb("https://jobs.deloitte.lu", "Deloitte Lussemburgo", categoria=9826901,
                  pagina_ricerca="/go/View-all-Jobs/9826901/")
    print(f"   → {len(out)} offerte trovate")
    return out

# ============================================================
# 🏢  PAESI BASSI — siti "werken bij" con l'elenco completo in JSON
# ============================================================

def scrape_deloitte_paesi_bassi():
    """werkenbijdeloitte.nl carica tutte le offerte da /data/jobpostings.json."""
    print("🔍 Deloitte Paesi Bassi (werkenbijdeloitte.nl)...")
    base = "https://werkenbijdeloitte.nl"
    dati = _json(http_get(f"{base}/data/jobpostings.json", timeout=40))
    out, visti = [], set()
    for j in dati if isinstance(dati, list) else []:
        slug = j.get("slug") or ""
        chiave = j.get("identifier") or slug
        if not slug or chiave in visti:
            continue
        visti.add(chiave)
        luogo = ""
        for k in ("jobLocation", "city", "location", "addressLocality"):
            v = j.get(k)
            if isinstance(v, str) and v.strip():
                luogo = v.strip()
                break
            if isinstance(v, dict):
                luogo = (v.get("city") or v.get("addressLocality") or v.get("name") or "").strip()
                if luogo:
                    break
        out.append({"titolo":   (j.get("name") or "N/D").strip(),
                    "location": "Deloitte Paesi Bassi" + (f" · {luogo}" if luogo else ""),
                    "url":      base + slug,
                    "data":     (j.get("datePosted") or j.get("publishedAt") or "")[:10]})
    print(f"   → {len(out)} offerte trovate")
    return out

def _testo_semplice(v):
    if isinstance(v, dict):
        v = ", ".join(x for x in v.values() if x)
    return html_lib.unescape(re.sub(r"<[^>]+>", " ", str(v or ""))).strip()

def scrape_kpmg_paesi_bassi():
    """werkenbijkpmg.nl: indice di ricerca con tutte le vacature in /_lunr/vacancies."""
    print("🔍 KPMG Paesi Bassi (werkenbijkpmg.nl)...")
    base = "https://www.werkenbijkpmg.nl"
    dati = _json(http_get(f"{base}/_lunr/vacancies", timeout=40))
    out, visti = [], set()
    for j in dati if isinstance(dati, list) else []:
        titolo = _testo_semplice(j.get("title"))
        if not titolo or not j.get("searchable"):        # voci di prova senza contenuto
            continue
        url = ""
        for k in ("url", "path", "link", "alias", "href"):
            if isinstance(j.get(k), str) and j[k].strip():
                url = j[k].strip()
                break
        if not url:
            m = re.search(r'href=["\'](/(?:en/)?(?:vacature|jobs?)/[^"\']+)', json.dumps(j))
            url = m.group(1) if m else ""
        if not url:
            url = "/vacature/" + re.sub(r"[^a-z0-9]+", "-", titolo.lower()).strip("-")
        if not url.startswith("http"):
            url = base + url
        if url in visti:
            continue
        visti.add(url)
        m = re.search(r'datetime=["\\]*"?(\d{4}-\d{2}-\d{2})', str(j.get("created") or ""))
        luogo = _testo_semplice(j.get("term_location"))
        out.append({"titolo":   titolo,
                    "location": "KPMG Paesi Bassi" + (f" · {luogo}" if luogo else ""),
                    "url":      url,
                    "data":     m.group(1) if m else ""})
    print(f"   → {len(out)} offerte trovate")
    return out

# ============================================================
# 🏢  WORKDAY generico (API CXS) — Deloitte Irlanda
# ============================================================

def _workday(host, tenant, site, nome, escludi=None):
    """Tutte le offerte di un career site Workday (20 per pagina).
    escludi: regex sulle sedi da scartare."""
    api = f"https://{host}/wday/cxs/{tenant}/{site}/jobs"
    out, offset, totale, escluse = [], 0, None, 0
    for _ in range(MAX_PAGINE):
        d = _json(http_post(api, json={"appliedFacets": {}, "limit": 20, "offset": offset, "searchText": ""},
                            headers={"Content-Type": "application/json", "Accept": "application/json"},
                            timeout=20))
        if not isinstance(d, dict):
            break
        if totale is None:
            totale = d.get("total") or 0
        posts = d.get("jobPostings") or []
        if not posts:
            break
        for j in posts:
            luogo = j.get("locationsText") or ""
            if escludi and re.search(escludi, luogo, re.I):
                escluse += 1
                continue
            path = j.get("externalPath") or ""
            out.append({"titolo":   j.get("title") or "N/D",
                        "location": nome + (f" · {luogo}" if luogo else ""),
                        "url":      f"https://{host}/en-US/{site}{path}" if path else "",
                        "data":     _workday_data(j.get("postedOn"))})
        offset += len(posts)
        if offset >= totale:
            break
        time.sleep(0.4)
    if escluse:
        print(f"    → escluse {escluse} offerte fuori dal paese")
    registra_copertura(nome, len(out) + escluse, totale)
    return out

def scrape_deloitte_irlanda():
    print("🔍 Deloitte Irlanda (Workday)...")
    out = []
    for site in ["Experienced_Professionals", "Early_Careers"]:
        # Belfast è Irlanda del Nord (Regno Unito)
        out += _workday("deloitteie.wd3.myworkdayjobs.com", "deloitteie", site, "Deloitte Irlanda",
                        escludi=r"belfast|northern ireland")
    print(f"   → {len(out)} offerte trovate")
    return out

# ============================================================
# 🏢  ACCENTURE ITALIA  —  Workday (requests, API REST diretta)
#
#  Filtro paese: facet "locationCountry", ID Italia fisso.
#  Paginazione: offset crescente di 20 fino al "total" dichiarato.
#
#  NOTA (ottobre 2026): Workday risponde HTTP 429 (rate limit) alle
#  richieste da IP di datacenter, e la run restava rossa con 0 offerte.
#  Ora: header Origin/Referer, retry con backoff sui 429 e, se requests
#  non basta, le stesse chiamate API eseguite dentro un browser Playwright
#  (stesso dominio, cookie reali).
# ============================================================

ACCENTURE_API  = "https://accenture.wd103.myworkdayjobs.com/wday/cxs/accenture/AccentureCareers/jobs"
ACCENTURE_BASE = "https://accenture.wd103.myworkdayjobs.com/en-US/AccentureCareers"

def _accenture_post(body, headers):
    """POST Workday con retry/backoff sui 429, sui 5xx e sugli errori di rete
    (attese più lunghe della sessione generica: il rate limit di Workday è
    severo). Ritorna il JSON o None."""
    # Il blocco 429 di Workday dura fino a qualche minuto: attese crescenti
    # fino a ~4 minuti in tutto prima di arrendersi (e passare al browser).
    for attesa in (0, 10, 30, 60, 120):
        time.sleep(attesa)
        try:
            r = requests.post(ACCENTURE_API, headers=headers, json=body, timeout=20)
            if r.status_code == 429 or r.status_code >= 500:
                print(f"    ⚠️  Accenture HTTP {r.status_code}, riprovo...")
                continue
            r.raise_for_status()
            return r.json()
        except (requests.ConnectionError, requests.Timeout) as e:
            print(f"    ⚠️  POST Workday Accenture → {e}, riprovo...")
            continue
        except Exception as e:
            print(f"    ⚠️  POST Workday Accenture → {e}")
            return None
    print("    ⚠️  Accenture: errore persistente dopo i retry")
    return None

# ID del facet "locationCountry" di Workday (letti dal facet, ottobre 2026)
ACCENTURE_PAESI = {
    "Italia":      "8cd04a563fd94da7b06857a79faaf815",
    "Belgio":      "a04ea128f43a42e59b1e6a19e8f0b374",
    "Lussemburgo": "328b82f597514643a7683a78fc67c3f1",
    "Irlanda":     "04a05835925f45b3a59406a2a6b72c8a",
    "Paesi Bassi": "9696868b09c64d52a62ee13b052383cc",
}

def _accenture_playwright(ITALIA_ID, LIMIT):
    """Fallback: stesse chiamate API, ma eseguite dentro un browser reale."""
    if not PLAYWRIGHT_OK:
        return []
    JS = """async ([id, limit]) => {
        const url = '/wday/cxs/accenture/AccentureCareers/jobs';
        let out = [], offset = 0, total = null, tentativi = 0;
        while (true) {
            const r = await fetch(url, {method:'POST',
                headers:{'Content-Type':'application/json','Accept':'application/json'},
                body: JSON.stringify({appliedFacets:{locationCountry:[id]},
                                      limit, offset, searchText:''})});
            if (r.status === 429 && tentativi < 4) {        // rate limit: aspetta e riprova
                tentativi++;
                await new Promise(res => setTimeout(res, 30000 * tentativi));
                continue;
            }
            if (!r.ok) return {status: r.status, jobs: out};
            tentativi = 0;
            const d = await r.json();
            if (total === null) total = d.total || 0;
            if (!d.jobPostings || !d.jobPostings.length) break;
            out.push(...d.jobPostings);
            offset += limit;
            if (offset >= total) break;
            await new Promise(res => setTimeout(res, 2500));
        }
        return {status: 200, jobs: out};
    }"""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            ctx  = browser.new_context(user_agent=HEADERS["User-Agent"], locale="it-IT")
            page = ctx.new_page()
            page.goto(ACCENTURE_BASE, wait_until="networkidle", timeout=45_000)
            res = page.evaluate(JS, [ITALIA_ID, LIMIT])
            browser.close()
            if not isinstance(res, dict):
                return []
            if res.get("status") != 200:
                print(f"    ⚠️  Accenture via browser → HTTP {res.get('status')}")
            return res.get("jobs") or []
    except Exception as e:
        print(f"    ⚠️  Playwright Accenture error: {e}")
        return []

def scrape_accenture(paese="Italia"):
    print(f"🔍 Accenture {paese} (Workday)...")
    ITALIA_ID = ACCENTURE_PAESI[paese]      # (nome storico: è l'ID del paese richiesto)
    LIMIT = 20
    headers = {**HEADERS, "Content-Type": "application/json", "Accept": "application/json",
               "Origin": "https://accenture.wd103.myworkdayjobs.com",
               "Referer": ACCENTURE_BASE}

    jobs, offset, totale = [], 0, None
    for _ in range(MAX_PAGINE):
        dati = _accenture_post({"appliedFacets": {"locationCountry": [ITALIA_ID]},
                                "limit": LIMIT, "offset": offset, "searchText": ""}, headers)
        if dati is None:
            break
        if totale is None:
            totale = dati.get("total") or 0
        page_jobs = dati.get("jobPostings") or []
        if not page_jobs:
            break
        jobs.extend(page_jobs)
        offset += LIMIT
        if offset >= totale:
            break
        time.sleep(2.5)   # Workday limita le richieste ravvicinate (HTTP 429)

    # Anche una raccolta interrotta a metà (es. 429 dopo qualche pagina) passa
    # dal browser: le offerte saltate tornerebbero domani come false "nuove".
    if not jobs or (totale and len(jobs) < totale):
        if jobs:
            print(f"    → raccolte {len(jobs)} su {totale} via requests, riprovo dal browser...")
        else:
            print("    → requests senza risultati, provo dal browser (Playwright)...")
        jobs_pw = _accenture_playwright(ITALIA_ID, LIMIT)
        if len(jobs_pw) > len(jobs):
            jobs = jobs_pw

    risultati, visti = [], set()
    for j in jobs:
        path = j.get("externalPath", "")
        if path in visti:
            continue
        visti.add(path)
        bullet = j.get("bulletFields", [])
        luogo  = bullet[1] if len(bullet) > 1 else ""
        risultati.append({
            "titolo":   j.get("title") or "N/D",
            "location": f"Accenture {paese}" + (f" · {luogo}" if luogo and luogo != "Location Negotiable" else ""),
            "url":      f"{ACCENTURE_BASE}{path}" if path else "",
            "data":     _workday_data(j.get("postedOn")),
        })

    # Il totale di Workday conta le righe, e la stessa offerta può comparire in
    # più righe (ottobre 2026: 176 righe = 173 offerte, sempre le stesse 3
    # ripetute anche cercando per categoria). La copertura confronta righe con
    # righe; le offerte inviate restano senza doppioni.
    registra_copertura(f"Accenture {paese}", len(jobs), totale)
    if len(risultati) < len(jobs):
        print(f"    → {len(jobs) - len(risultati)} righe ripetute (stessa offerta): "
              f"{len(risultati)} offerte diverse")
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
    visti = set()

    for page in range(1, MAX_PAGINE + 1):
        url = f"{BASE}/page/{page}" if page > 1 else BASE
        r = http_get(url)
        if not r:
            break
        soup  = BeautifulSoup(r.text, "lxml")
        cards = soup.select("a.job-detail-link")
        if not cards:
            break
        nuovi = 0
        for a in cards:
            titolo_el = a.select_one(".is-h5")
            loc_el    = a.select_one(".is-small")
            href      = a.get("href", "")
            if href and not href.startswith("http"):
                href = "https://it.nttdata.com" + href
            if href in visti:
                continue
            visti.add(href)
            nuovi += 1
            risultati.append({
                "titolo":   titolo_el.get_text(strip=True) if titolo_el else "N/D",
                "location": f"NTT DATA Italia · {loc_el.get_text(strip=True)}" if loc_el else "NTT DATA Italia",
                "url":      href,
                "data":     "",
            })
        if nuovi == 0:          # pagina ripetuta (oltre la fine) → stop
            break
        time.sleep(0.3)

    # NOTA (ottobre 2026): it.nttdata.com mostra solo la consulenza. Le offerte
    # italiane delle infrastrutture (ex NTT Ltd, es. Milano/Segrate) sono solo
    # sul portale globale: si aggiungono quelle che non sono già nell'elenco
    # (confronto per ID Salesforce). Se il portale non risponde si tiene
    # comunque l'elenco di it.nttdata.com.
    gia = {_nttdata_salesforce_id(o["url"]) for o in risultati} - {None}
    phenom, _ = _nttdata_phenom("Italy")
    extra = [_nttdata_offerta(j, "Italia") for j in phenom
             if _nttdata_salesforce_id(j.get("applyUrl")) not in gia]
    if extra:
        print(f"    → +{len(extra)} dal portale globale NTT DATA (non presenti su it.nttdata.com)")
    risultati += extra

    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 🏢  NTT DATA  —  portale globale careers.nttdata.com (Phenom)
#
#  NOTA (ottobre 2026): NTT DATA pubblica le offerte su due sistemi:
#  - la consulenza (ex everis) su Salesforce, careers.emeal.nttdata.com;
#    per l'Italia le stesse offerte sono su it.nttdata.com;
#  - le infrastrutture (ex NTT Ltd) su Workday, nttlimited.wd3.myworkdayjobs.com.
#  Il portale globale Phenom le raccoglie entrambe e si filtra per paese
#  (stesso endpoint POST /widgets di PwC Italia). Il Belgio (22 offerte)
#  non ha un elenco sul sito nazionale: si legge solo da qui.
# ============================================================

NTT_PHENOM = "https://careers.nttdata.com"
# Nomi di città come li scrive Phenom (spesso in spagnolo) → nome locale
NTT_CITTA = {"bruselas": "Bruxelles", "brussels": "Bruxelles", "milán": "Milano", "milan": "Milano",
             "roma": "Roma", "rome": "Roma", "turín": "Torino", "turin": "Torino", "nápoles": "Napoli"}

def _nttdata_phenom(paese):
    """Tutte le offerte del portale globale NTT DATA per un paese ("Belgium",
    "Italy"). Ritorna (lista di job Phenom, totale dichiarato) o ([], None)."""
    jobs, totale, visti = [], None, set()
    for _ in range(10):
        body = {"lang": "en_global", "deviceType": "desktop", "country": "global",
                "pageName": "search-results", "ddoKey": "refineSearch", "sortBy": "",
                "subsearch": "", "from": len(jobs), "jobs": True, "counts": True,
                "all_fields": ["category", "country", "state", "city", "type"],
                "size": 200, "clearAll": False, "jdsource": "facets", "isSliderEnable": False,
                "pageId": "page20", "siteType": "external", "keywords": "", "global": True,
                "selected_fields": {"country": [paese]}, "locationData": {}}
        d = _json(http_post(f"{NTT_PHENOM}/widgets", json=body, timeout=30,
                            headers={"Content-Type": "application/json", "Accept": "application/json"}))
        try:
            rs = d["refineSearch"]
            pagina = rs["data"]["jobs"] or []
        except (TypeError, KeyError):
            print(f"    ⚠️  Phenom NTT DATA ({paese}): risposta assente o inattesa")
            break
        if totale is None:
            totale = rs.get("totalHits")
        nuovi = [j for j in pagina if j.get("jobId") not in visti]
        visti.update(j.get("jobId") for j in nuovi)
        jobs.extend(nuovi)
        if not nuovi or (totale and len(jobs) >= totale):
            break
    return jobs, totale

def _nttdata_salesforce_id(url):
    """ID Salesforce dell'offerta (minuscolo), da careers.emeal.nttdata.com/s/offer/<ID>/…
    o da it.nttdata.com/jobs/<id>-slug: serve a non contare due volte la stessa offerta."""
    m = re.search(r"/s/offer/([A-Za-z0-9]{15,18})/", url or "") or \
        re.search(r"/jobs/([a-z0-9]{15,18})-", url or "", re.I)
    return m.group(1).lower() if m else None

# Nome del paese per il portale Phenom (filtro "country")
NTT_PAESI = {"Italia": "Italy", "Belgio": "Belgium", "Lussemburgo": "Luxembourg",
             "Irlanda": "Ireland", "Paesi Bassi": "Netherlands"}

def _nttdata_offerta(j, paese_it):
    link = j.get("applyUrl") or ""
    link = re.sub(r"\?utm_[^#]*$", "", link)        # careers.emeal: toglie ?utm_medium=…
    citta = (j.get("city") or "").strip()
    citta = NTT_CITTA.get(citta.lower(), citta)
    # Offerta multi-sede la cui sede principale è in un altro paese (es. Milano
    # nella ricerca "Belgium"): la città indicata sarebbe fuorviante
    if j.get("country") and j.get("country") != NTT_PAESI.get(paese_it):
        citta = ""
    return {"titolo":   j.get("title") or "N/D",
            "location": f"NTT DATA {paese_it}" + (f" · {citta}" if citta else ""),
            "url":      _senza_apply(link),                    # Workday: pagina dell'offerta
            "_id_src":  f"ntt-phenom:{j.get('jobId')}",        # stabile anche se cambia il link
            "data":     (j.get("postedDate") or "")[:10]}

def scrape_nttdata_paese(paese):
    """NTT DATA fuori dall'Italia: solo dal portale globale Phenom."""
    print(f"🔍 NTT DATA {paese} (portale globale Phenom)...")
    jobs, totale = _nttdata_phenom(NTT_PAESI[paese])
    risultati = [_nttdata_offerta(j, paese) for j in jobs]
    registra_copertura(f"NTT DATA {paese}", len(risultati), totale)
    print(f"   → {len(risultati)} offerte trovate")
    return risultati

def scrape_nttdata_belgio():
    return scrape_nttdata_paese("Belgio")

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
    visti = set()
    for _ in range(MAX_PAGINE):
        finder = (f"findReqs;siteNumber=CX_1,limit={LIMIT},offset={offset},"
                  f"sortBy=POSTING_DATES_DESC")
        params = {"onlyData": "true", "expand": "requisitionList", "finder": finder}
        j_resp = _json(http_get(API, headers=headers, params=params))
        try:
            dati = j_resp["items"][0]
        except (TypeError, KeyError, IndexError):
            print("    ⚠️  Oracle Bip: risposta assente o inattesa")
            break

        if totale_dichiarato is None:
            totale_dichiarato = dati.get("TotalJobsCount") or 0

        reqs = dati.get("requisitionList") or []
        if not reqs:
            break
        for j in reqs:
            if j.get("PrimaryLocationCountry") != "IT":
                continue
            job_id = j.get("Id", "")
            if job_id and job_id in visti:
                continue
            visti.add(job_id)
            risultati.append({
                "titolo":   j.get("Title") or "N/D",
                "location": "Bip Italia",
                "url":      f"{BASE}/hcmUI/CandidateExperience/en/sites/CX_1/job/{job_id}" if job_id else "",
                "data":     j.get("PostedDate", ""),
            })

        offset += LIMIT
        # Senza totale dichiarato si va avanti finché arrivano pagine piene
        if (totale_dichiarato and offset >= totale_dichiarato) or len(reqs) < LIMIT:
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
    visti = set()

    for page in range(1, MAX_PAGINE + 1):
        r = http_get(BASE, params={"page": page})
        if not r:
            break
        soup  = BeautifulSoup(r.text, "lxml")
        cards = soup.select("div.positions-item")
        if not cards:
            break
        nuovi = 0
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
            titolo = h3.get_text(strip=True) if h3 else "N/D"
            chiave = href or f"{titolo}|{citta}"
            if chiave in visti:
                continue
            visti.add(chiave)
            nuovi += 1
            risultati.append({
                "titolo":   titolo,
                "location": f"{azienda} · {citta}" + (f" ({modalita})" if modalita else ""),
                "url":      href,
                "data":     "",
            })
        if nuovi == 0:          # pagina ripetuta (oltre la fine) → stop
            break
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

# country_code dell'API per paese (verificati a ottobre 2026: le varianti
# "be-nl", "nl-en", "lu-fr"… restituiscono 0 risultati senza errore)
CAPGEMINI_PAESI = {"Italia": "it-it", "Belgio": "be-en", "Lussemburgo": "lu-en",
                   "Irlanda": "ie-en", "Paesi Bassi": "nl-nl"}

def scrape_capgemini(paese="Italia"):
    print(f"🔍 Capgemini {paese}...")
    URL  = "https://cg-jobstream-api.azurewebsites.net/api/job-search"
    SIZE = 50
    risultati = []

    headers = {**HEADERS, "Accept": "application/json"}
    totale_dichiarato = None
    visti = set()
    for page in range(1, MAX_PAGINE + 1):
        params = {"country_code": CAPGEMINI_PAESI[paese], "page": page, "size": SIZE}
        dati = _json(http_get(URL, headers=headers, params=params))
        if not isinstance(dati, dict):
            break

        if totale_dichiarato is None:
            totale_dichiarato = dati.get("total") or 0

        jobs = dati.get("data") or []
        if not jobs:
            break
        nuovi = 0
        for j in jobs:
            # "tcsource=apply" apre subito il modulo di candidatura: lo togliamo
            url_annuncio = (j.get("apply_job_url", "") or "").replace("&tcsource=apply", "")
            chiave = url_annuncio or f"{j.get('title')}|{j.get('location')}"
            if chiave in visti:
                continue
            visti.add(chiave)
            nuovi += 1
            risultati.append({
                "titolo":   j.get("title") or "N/D",
                "location": f"Capgemini {paese} · {j.get('location','')}".rstrip(" ·"),
                "url":      url_annuncio,
                "data":     "",
            })

        if nuovi == 0 or len(jobs) < SIZE:
            break
        if totale_dichiarato and len(risultati) >= totale_dichiarato:
            break
        time.sleep(0.2)

    registra_copertura(f"Capgemini {paese}", len(risultati), totale_dichiarato)
    print(f"   → {len(risultati)} offerte trovate")
    return risultati

# ============================================================
# 📧  GENERAZIONE EMAIL HTML
# ============================================================

BRAND_COLORS = {
    "EY":         ("#FFE600", "#1a1a1a"),
    "PwC":        ("#E0301E", "#ffffff"),
    "Deloitte":   ("#86BC25", "#1a1a1a"),
    "KPMG":       ("#00338D", "#ffffff"),
    "Accenture":  ("#A100FF", "#ffffff"),
    "NTT DATA":   ("#FF0033", "#ffffff"),
    "Bip":        ("#1a1a2e", "#ffffff"),
    "Digital360": ("#0d1b2a", "#ffffff"),
    "Capgemini":  ("#0070AD", "#ffffff"),
}

PAESI = ["Italia", "Belgio", "Lussemburgo", "Irlanda", "Paesi Bassi"]
PAESI_TESTO = ", ".join(PAESI[:-1]) + " e " + PAESI[-1]

def _azienda(fonte):
    """"Accenture Irlanda" → "Accenture"; "EY" → "EY"."""
    for paese in PAESI:
        if fonte.endswith(" " + paese):
            return fonte[: -len(paese) - 1]
    return fonte

def colore_marchio(fonte):
    """Colore della fonte; "Accenture Irlanda" usa quello di "Accenture"."""
    if fonte in BRAND_COLORS:
        return BRAND_COLORS[fonte][0]
    for marchio, colori in BRAND_COLORS.items():
        if fonte.startswith(marchio + " "):
            return colori[0]
    return "#6b7280"

_GIORNI_SETT = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
_MESI_NOME   = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio",
                "agosto", "settembre", "ottobre", "novembre", "dicembre"]

def _data_estesa(d):
    """'giovedì 15 ottobre 2026' senza dipendere dal locale del sistema
    (su GitHub Actions %B darebbe il mese in inglese)."""
    return f"{_GIORNI_SETT[d.weekday()]} {d.day} {_MESI_NOME[d.month - 1]} {d.year}"

def _data_relativa(data):
    """Rende uniformi le date delle varie fonti: 'oggi', 'ieri', '3 giorni fa',
    oltre la settimana '2 ott'. Se la data non è riconoscibile la mostra com'è."""
    eta = _eta_giorni(data)
    if eta is None:
        return re.sub(r"(?i)^offerta pubblicata\s+", "", (data or "").strip())
    if eta <= 0:
        return "oggi"
    if eta == 1:
        return "ieri"
    if eta < 7:
        return f"{eta} giorni fa"
    d = datetime.now() - timedelta(days=eta)
    return f"{d.day} {_MESI_NOME[d.month - 1][:3]}"

def _ancora(azienda):
    return "f-" + re.sub(r"[^a-z0-9]+", "-", azienda.lower()).strip("-")

def _etichette(titolo):
    """Livello e area dedotti dal titolo con ETICHETTE_LIVELLO / ETICHETTE_AREA."""
    t = titolo or ""
    risultato = []
    for regole in (ETICHETTE_LIVELLO, ETICHETTE_AREA):
        for nome, pattern in regole:
            if re.search(pattern, t, re.I):
                risultato.append(nome)
                break
    return risultato

def conta_offerte(n: int) -> str:
    """'1 nuova offerta', '5 nuove offerte' (anche '0 nuove offerte')."""
    return f"{n} nuova offerta" if n == 1 else f"{n} nuove offerte"

def genera_html(tutte, totale_trovate, problemi=None, fonti=None, nascoste=None, avviate=None):
    # Stile editoriale: pagina bianca, titoli serif, niente riquadri.
    # Layout a tabelle con stili inline: è l'unico modo affidabile per
    # Gmail, Outlook e Apple Mail (niente flex, gradienti o ombre).
    esc      = html_lib.escape
    oggi_str = _data_estesa(datetime.now())
    totale   = sum(len(v) for v in tutte.values())
    # Footer: aziende (senza ripetere il paese) e paesi coperti
    aziende = list(dict.fromkeys(_azienda(f) for f in (fonti or BRAND_COLORS.keys())))
    testo_fonti = "siti carriere ufficiali di " + ", ".join(aziende)
    sans  = "font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;"
    serif = "font-family:Georgia,'Times New Roman',serif;"
    inchiostro, grigio, chiaro, linea = "#111827", "#6b7280", "#9ca3af", "#e5e7eb"

    # Avviso diagnostico: compare solo se l'health check ha rilevato qualcosa
    avviso = ""
    if problemi:
        righe_pb = "".join(
            f'<div style="margin-top:4px;">{"🔴" if g == "bloccante" else "🟠"}&nbsp;'
            f'<strong>{esc(f)}</strong>: {esc(m)}</div>'
            for g, f, m in problemi)
        avviso = f"""
      <tr><td style="padding:0 32px 8px;">
        <div style="border-left:3px solid #f59e0b;padding:4px 0 4px 14px;{sans}
                    font-size:13px;line-height:1.5;color:#92400e;">
          <strong>Controllo automatico: fonti da verificare</strong>{righe_pb}
        </div>
      </td></tr>"""

    # Sommario: "EY 3 · PwC Italia 2 · …" con link alle sezioni
    sommario = " &nbsp;·&nbsp; ".join(
        f'<a href="#{_ancora(az)}" style="color:{inchiostro};text-decoration:none;">'
        f'{esc(az)}&nbsp;<strong>{len(of)}</strong></a>'
        for az, of in tutte.items() if of)

    sezioni = ""
    for azienda, offerte in tutte.items():
        if not offerte: continue
        accento = colore_marchio(azienda)
        # Prima le più recenti; quelle senza data in fondo
        ordinate = sorted(offerte, key=lambda o: (_eta_giorni(o.get("data")) is None,
                                                  _eta_giorni(o.get("data")) or 0))
        voci = ""
        for o in ordinate:
            quando = _data_relativa(o.get("data"))
            fresca = quando in ("oggi", "ieri")
            url    = esc(o.get("url") or "#")
            meta = []
            if o.get("location"):
                meta.append(f'<strong style="color:{inchiostro};font-weight:600;">'
                            f'{esc(o["location"])}</strong>')
            if quando:
                meta.append(f'<span style="color:#047857;font-weight:600;">{quando}</span>'
                            if fresca else esc(quando))
            etichette = "".join(
                f'<span style="display:inline-block;margin:0 4px 0 0;padding:1px 7px;'
                f'border:1px solid {linea};border-radius:10px;font-size:11px;'
                f'color:{grigio};white-space:nowrap;">{e}</span>'
                for e in _etichette(o.get("titolo")))
            voci += f"""
          <tr><td style="padding:14px 0;border-top:1px solid {linea};">
            <a href="{url}" style="{serif}font-size:18px;line-height:1.35;color:{inchiostro};
               text-decoration:none;">{esc(o.get('titolo') or 'N/D')}</a>
            <div style="margin-top:6px;{sans}font-size:13px;line-height:1.6;color:{grigio};">
              {' &nbsp;·&nbsp; '.join(meta)}</div>
            <div style="margin-top:6px;{sans}font-size:13px;line-height:1.8;">
              {etichette}<a href="{url}" style="color:{inchiostro};font-weight:600;
                 text-decoration:underline;white-space:nowrap;">Candidati&nbsp;→</a></div>
          </td></tr>"""
        sezioni += f"""
      <tr><td id="{_ancora(azienda)}" style="padding:28px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 0 10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="{sans}font-size:13px;font-weight:700;letter-spacing:2px;
                         text-transform:uppercase;color:{inchiostro};">
                <span style="display:inline-block;width:10px;height:10px;margin-right:8px;
                             background:{accento};border-radius:2px;"></span>{esc(azienda)}</td>
              <td align="right" style="{sans}font-size:12px;color:{chiaro};white-space:nowrap;">
                {len(offerte)} nuov{'a' if len(offerte) == 1 else 'e'}</td>
            </tr></table>
          </td></tr>{voci}
        </table>
      </td></tr>"""

    nota_nascoste = ""
    if nascoste:
        n = sum(nascoste.values())
        nota_nascoste = (
            f'{n} offert{"a" if n == 1 else "e"} compars{"a" if n == 1 else "e"} oggi ma '
            f'pubblicat{"a" if n == 1 else "e"} da più di {MAX_GIORNI_NUOVA} giorni non '
            f'{"è mostrata" if n == 1 else "sono mostrate"} ('
            + esc(", ".join(f"{k} {v}" for k, v in nascoste.items())) + ').<br>')

    if avviate:
        n = sum(avviate.values())
        nota_nascoste += (
            f"Fonti aggiunte da poco: {n} offerte già aperte sono state registrate senza "
            f"mostrarle (oggi compaiono solo quelle pubblicate negli ultimi {GIORNI_FONTE_NUOVA} "
            "giorni; da domani arriveranno tutte le nuove) — "
            + esc(", ".join(f"{k} {v}" for k, v in avviate.items())) + ".<br>")

    if sezioni:
        titolo = f"{conta_offerte(totale)} oggi"
        corpo  = sezioni
    else:
        titolo = "Nessuna offerta nuova oggi"
        corpo  = f"""
      <tr><td style="padding:16px 32px 0;{sans}font-size:15px;line-height:1.6;color:{grigio};">
        Le {totale_trovate} offerte monitorate sono già state tutte segnalate nei giorni scorsi.
      </td></tr>"""

    anteprima = (f"{conta_offerte(totale)}: " + ", ".join(
        f"{az} {len(of)}" for az, of in tutte.items() if of)) if totale else \
        "Nessuna offerta nuova oggi"
    riga_sommario = (f'<div style="margin-top:14px;{sans}font-size:14px;line-height:1.7;'
                     f'color:{inchiostro};">{sommario}</div>') if sommario else ""

    return f"""<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{esc(anteprima)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff"
       style="background:#ffffff;">
  <tr><td align="center" style="padding:16px 0 32px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
           style="width:100%;max-width:600px;">
      <tr><td style="padding:24px 32px 20px;border-bottom:2px solid {inchiostro};">
        <div style="{sans}font-size:12px;font-weight:700;letter-spacing:3px;color:{inchiostro};">
          BIG4 JOBS</div>
        <div style="margin-top:2px;{sans}font-size:12px;color:{grigio};">
          {oggi_str} · {esc(PAESI_TESTO)}</div>
        <div style="margin-top:18px;{serif}font-size:32px;line-height:1.15;color:{inchiostro};">
          {titolo}</div>
        {riga_sommario}
      </td></tr>
      <tr><td style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
      {avviso}{corpo}
      <tr><td style="padding:36px 32px 0;">
        <div style="border-top:1px solid {linea};padding-top:14px;{sans}font-size:11px;
                    line-height:1.6;color:{chiaro};">
          {nota_nascoste}{totale_trovate} offerte monitorate · Fonti: {esc(testo_fonti)}<br>
          Le etichette (livello e area) sono dedotte automaticamente dal titolo.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
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
    msg["Subject"] = f"📰 Big4 Jobs {datetime.now():%d/%m/%Y} — {conta_offerte(totale)}"
    msg["From"]    = GMAIL_MITTENTE
    # Destinatari in CCN: nell'intestazione "A" compare solo il mittente e
    # NON si scrive alcun header "Bcc" (altrimenti gli indirizzi sarebbero
    # visibili nel sorgente del messaggio). I veri destinatari vengono
    # passati solo a sendmail(), cioè a livello di trasporto SMTP.
    msg["To"]      = GMAIL_MITTENTE
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    # Il mittente riceve anch'esso la copia (è nel campo "A"): lo si aggiunge
    # una sola volta per non ricevere doppioni se è già tra i destinatari.
    invio_a = list(dict.fromkeys([GMAIL_MITTENTE] + destinatari))

    # Errori temporanei (rete, Gmail momentaneamente non disponibile): si
    # riprova. Le credenziali rifiutate invece non si risolvono riprovando.
    attese = (0, 10, 30)
    for tentativo, attesa in enumerate(attese, 1):
        time.sleep(attesa)
        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=60) as s:
                s.login(GMAIL_MITTENTE, GMAIL_PASSWORD)
                s.sendmail(GMAIL_MITTENTE, invio_a, msg.as_string())
            print(f"✅ Email inviata in CCN a {len(destinatari)} destinatari")
            return "ok"
        except smtplib.SMTPAuthenticationError:
            print("❌ Errore autenticazione → rigenera App Password su myaccount.google.com")
            return "auth"
        except Exception as e:
            print(f"❌ Errore invio (tentativo {tentativo}/{len(attese)}): {e}")
    return "errore"

# ============================================================
# 🚀  MAIN
# ============================================================

def elenco_fonti():
    """(nome, funzione) di tutte le fonti, raggruppate per paese: l'ordine è
    quello delle sezioni nell'email. I nomi si risolvono al momento della
    chiamata (così i test possono sostituire le funzioni)."""
    g = globals()
    def f(nome_fn, *args):
        return lambda: g[nome_fn](*args)
    return [
        # Italia (EY: il board Yello copre anche il Belgio)
        ("EY",                    f("scrape_ey")),
        ("EY Italia",             f("scrape_ey_experienced", "Italia")),
        ("PwC Italia",            f("scrape_pwc_italia")),
        ("Deloitte Italia",       f("scrape_deloitte", "Italia")),
        ("KPMG Italia",           f("scrape_kpmg")),
        ("Accenture Italia",      f("scrape_accenture", "Italia")),
        ("NTT DATA Italia",       f("scrape_nttdata")),
        ("Capgemini Italia",      f("scrape_capgemini", "Italia")),
        ("Bip",                   f("scrape_bip")),
        ("Digital360",            f("scrape_digital360")),
        # Belgio
        ("EY Belgio",             f("scrape_ey_experienced", "Belgio")),
        ("PwC Belgio",            f("scrape_pwc_belgio")),
        ("Deloitte Belgio",       f("scrape_deloitte", "Belgio")),
        ("KPMG Belgio",           f("scrape_kpmg_belgio")),
        ("Accenture Belgio",      f("scrape_accenture", "Belgio")),
        ("NTT DATA Belgio",       f("scrape_nttdata_paese", "Belgio")),
        ("Capgemini Belgio",      f("scrape_capgemini", "Belgio")),
        # Lussemburgo
        ("EY Lussemburgo",        f("scrape_ey_experienced", "Lussemburgo")),
        ("PwC Lussemburgo",       f("scrape_pwc_paese", "Lussemburgo")),
        ("Deloitte Lussemburgo",  f("scrape_deloitte_lussemburgo")),
        ("KPMG Lussemburgo",      f("scrape_kpmg_lussemburgo")),
        ("Accenture Lussemburgo", f("scrape_accenture", "Lussemburgo")),
        ("NTT DATA Lussemburgo",  f("scrape_nttdata_paese", "Lussemburgo")),
        ("Capgemini Lussemburgo", f("scrape_capgemini", "Lussemburgo")),
        # Irlanda
        ("EY Irlanda",            f("scrape_ey_experienced", "Irlanda")),
        ("PwC Irlanda",           f("scrape_pwc_paese", "Irlanda")),
        ("Deloitte Irlanda",      f("scrape_deloitte_irlanda")),
        ("Accenture Irlanda",     f("scrape_accenture", "Irlanda")),
        ("NTT DATA Irlanda",      f("scrape_nttdata_paese", "Irlanda")),
        ("Capgemini Irlanda",     f("scrape_capgemini", "Irlanda")),
        # Paesi Bassi
        ("EY Paesi Bassi",        f("scrape_ey_experienced", "Paesi Bassi")),
        ("PwC Paesi Bassi",       f("scrape_pwc_paese", "Paesi Bassi")),
        ("Deloitte Paesi Bassi",  f("scrape_deloitte_paesi_bassi")),
        ("KPMG Paesi Bassi",      f("scrape_kpmg_paesi_bassi")),
        ("Accenture Paesi Bassi", f("scrape_accenture", "Paesi Bassi")),
        ("NTT DATA Paesi Bassi",  f("scrape_nttdata_paese", "Paesi Bassi")),
        ("Capgemini Paesi Bassi", f("scrape_capgemini", "Paesi Bassi")),
    ]

def main():
    print(f"\n{'='*55}")
    print(f"  BIG4 JOB NEWSLETTER  {datetime.now():%d/%m/%Y %H:%M}")
    print(f"{'='*55}\n")

    try:
        seen, storico = carica_seen()
    except SeenIlleggibile as e:
        # Nessun invio e nessuna scrittura: il file va sistemato a mano
        # (di solito basta ripristinarne la versione precedente da git).
        print(f"❌ {e}")
        print("   Run interrotta: senza lo storico tutte le offerte risulterebbero nuove.")
        sys.exit(1)
    seen_iniziale = set(seen)

    # Il workflow può partire più volte al giorno (più orari di riserva perché
    # la pianificazione di GitHub arriva anche con ore di ritardo): la prima
    # run che parte invia, le altre si fermano qui. NEWSLETTER_FORZA=true
    # (avvio manuale con "forza") invia comunque.
    forza = os.environ.get("NEWSLETTER_FORZA", "").strip().lower() in ("1", "true", "yes", "si", "sì")
    if not forza and leggi_ultimo_invio() == oggi_italia():
        print(f"✅ Newsletter di oggi ({oggi_italia()}) già inviata: niente da fare.")
        return

    scrapers = elenco_fonti()

    tutte_trovate = {}
    tutte_nuove   = {}
    errori_scraper = {}   # scraper che hanno sollevato un'eccezione
    nascoste       = {}   # fonte → n. offerte nuove ma pubblicate da troppo tempo
    avviate        = {}   # fonte nuova → n. offerte già aperte registrate senza mostrarle
    gia_note = {f for run in storico if isinstance(run.get("conteggi"), dict)
                for f, n in run["conteggi"].items() if n}

    for nome, fn in scrapers:
        try:
            offerte = fn() or []
            tutte_trovate[nome] = offerte
            if offerte:
                nuove, seen = filtra_nuove(nome, offerte, seen)
                if storico and nome not in gia_note:
                    # Prima run (riuscita) di una fonte aggiunta da poco
                    recenti = [o for o in nuove
                               if _eta_giorni(o.get("data")) is not None
                               and _eta_giorni(o.get("data")) <= GIORNI_FONTE_NUOVA]
                    if len(recenti) < len(nuove):
                        avviate[nome] = len(nuove) - len(recenti)
                        print(f"   → fonte nuova: {avviate[nome]} offerte già aperte registrate "
                              f"senza mostrarle (si mostrano solo quelle degli ultimi "
                              f"{GIORNI_FONTE_NUOVA} giorni)")
                    nuove = recenti
                if MAX_GIORNI_NUOVA is not None:
                    recenti = [o for o in nuove
                               if (_eta_giorni(o.get("data")) or 0) <= MAX_GIORNI_NUOVA
                               or _da_recuperare(nome, o)]
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
                               fonti=[n for n, _ in scrapers], nascoste=nascoste, avviate=avviate)
    stato_invio  = invia_email(html, totale)

    # Le offerte si segnano come "viste" SOLO se l'email è partita: se l'invio
    # fallisce, domani verranno riproposte invece di andare perse. Lo storico
    # dei conteggi si salva in ogni caso.
    if stato_invio == "ok":
        salva_seen(seen, storico, ultimo_invio=oggi_italia())
    else:
        print("⚠️  Email non inviata: le offerte di oggi NON vengono segnate come viste")
        salva_seen(seen_iniziale, storico)
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

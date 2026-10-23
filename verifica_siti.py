"""Verifica di completezza delle fonti: confronta ciò che raccoglie ogni scraper
con ricerche più ampie e indipendenti sullo stesso sito, per scoprire offerte
che la newsletter non vede. Non invia email e non modifica seen_jobs.json.

Avvio:  python verifica_siti.py
"""
import re
import time
from concurrent.futures import ThreadPoolExecutor

from bs4 import BeautifulSoup

import job_newsletter as jn

RIEPILOGO = []


def titolo(t):
    print(f"\n{'=' * 70}\n{t}\n{'=' * 70}")


def esito(fonte, msg):
    RIEPILOGO.append((fonte, msg))
    print(f"  ➜ {msg}")


def chiavi(offerte):
    return {jn._job_id("x", o) for o in offerte}


def stabilita(nome, fn, prima):
    """Rilancia lo scraper e confronta: raccolte diverse a pochi minuti di
    distanza = paginazione instabile, offerte che vanno e vengono."""
    seconda = fn()
    a, b = chiavi(prima), chiavi(seconda)
    solo1, solo2 = a - b, b - a
    if solo1 or solo2:
        esito(nome, f"INSTABILE: 1ª raccolta {len(a)}, 2ª {len(b)}, "
                    f"{len(solo1)} solo nella 1ª, {len(solo2)} solo nella 2ª")
        per_id = {jn._job_id("x", o): o for o in prima + seconda}
        for k in list(solo1 | solo2)[:10]:
            print(f"     · {per_id[k].get('titolo')} | {per_id[k].get('url')}")
    else:
        esito(nome, f"stabile: due raccolte identiche ({len(a)} offerte)")


def non_viste(nome, offerte, seen):
    """Offerte sul sito ma non in seen_jobs.json, con la loro età: se sono
    più vecchie di MAX_GIORNI_NUOVA verrebbero nascoste dall'email."""
    fuori = [o for o in offerte if jn._job_id(nome, o) not in seen]
    vecchie = [o for o in fuori if (jn._eta_giorni(o.get("data")) or 0) > (jn.MAX_GIORNI_NUOVA or 10**9)]
    if fuori:
        print(f"  {len(fuori)} offerte attuali non ancora in seen_jobs.json "
              f"({len(vecchie)} pubblicate da più di {jn.MAX_GIORNI_NUOVA} giorni → sarebbero nascoste)")
        for o in fuori[:8]:
            print(f"     · [{o.get('data') or 's.d.'}] {o.get('titolo')}")
    return fuori, vecchie


# ----------------------------------------------------------------------------
# Controlli specifici per fonte
# ----------------------------------------------------------------------------

def verifica_ey(trovate):
    """Ricerche extra (paese, altre città) oltre a quelle dello scraper."""
    extra_query = ["italia", "italy", "belgium", "belgio", "belgique", "belgië",
                   "trieste", "cagliari", "palermo", "catania", "pescara", "perugia",
                   "bolzano", "trento", "vicenza", "udine", "lecce", "parma", "modena",
                   "salerno", "cosenza", "pisa", "monza", "varese", "como", "novara",
                   "reggio", "livorno", "messina", "mechelen", "leuven", "namur",
                   "charleroi", "kortrijk", "brugge", "zaventem", "luxembourg"]
    BASE = f"https://eyglobal.yello.co/job_boards/{jn.EY_BOARD_ID}"
    h = {**jn.HEADERS, "X-Requested-With": "XMLHttpRequest",
         "Accept": "application/json, text/javascript, */*"}
    noti = {re.search(r"/jobs/([^/?#]+)", o["url"]).group(1)
            for o in trovate if re.search(r"/jobs/([^/?#]+)", o["url"])}
    candidati = {}
    for q in extra_query:
        for pagina in range(1, 41):
            j = jn._json(jn.http_get(f"{BASE}/search?query={q}&locale=it&page_number={pagina}", headers=h))
            if not isinstance(j, dict):
                break
            soup = BeautifulSoup(j.get("html", ""), "lxml")
            items = soup.select("li.search-results__item a.search-results__req_title")
            nuovi = 0
            for a in items:
                m = re.search(r"/jobs/([^/?#]+)", a.get("href", ""))
                if m and m.group(1) not in noti and m.group(1) not in candidati:
                    candidati[m.group(1)] = (q, a.get_text(strip=True))
                    nuovi += 1
            if not items or nuovi == 0 and pagina > 1:
                break
            time.sleep(0.2)
    print(f"  {len(candidati)} offerte trovate dalle ricerche extra e non dallo scraper: verifico il paese...")
    urls = [f"https://eyglobal.yello.co/jobs/{s}?job_board_id={jn.EY_BOARD_ID}&locale=it" for s in candidati]
    with ThreadPoolExecutor(max_workers=6) as pool:
        dettagli = list(pool.map(jn._ey_dettaglio, urls))
    mancanti = []
    for (slug, (q, t)), (paese, sede) in zip(candidati.items(), dettagli):
        if paese and jn.EY_PAESI_OK.get(paese.strip().lower()):
            mancanti.append((q, t, sede))
    for q, t, sede in mancanti[:30]:
        print(f"     · MANCA [{q}] {t} — {sede}")
    esito("EY", f"{len(mancanti)} offerte Italia/Belgio non raccolte dallo scraper"
                + (" (sedi: " + ", ".join(sorted({s for _, _, s in mancanti if s}))[:300] + ")" if mancanti else ""))


def verifica_pwc_belgio(trovate):
    """Il facet sedi vs ricerche testuali: offerte belghe sfuggite al facet."""
    noti = {o["_id_src"] for o in trovate}
    h = {**jn.HEADERS, "Content-Type": "application/json", "Accept": "application/json"}
    for site in ["Global_Campus_Careers", "Global_Experienced_Careers"]:
        api = f"https://pwc.wd3.myworkdayjobs.com/wday/cxs/pwc/{site}/jobs"
        d = jn._json(jn.http_post(api, headers=h, timeout=20,
                                  json={"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""}))
        if isinstance(d, dict):
            for f in d.get("facets", []):
                for g in f.get("values", []):
                    if g.get("facetParameter") in ("locations", "locationCountry", "Location_Country"):
                        sospette = [v.get("descriptor") for v in g.get("values", [])
                                    if re.search(r"belg|BE[-_ ]|bruss|brux|antw|gent|ghent|li[eè]g",
                                                 v.get("descriptor", ""), re.I)
                                    and not jn.PWC_BE_SEDI.search(v.get("descriptor", ""))]
                        if sospette:
                            print(f"  {site}: valori facet '{g.get('facetParameter')}' simili al Belgio "
                                  f"ma NON riconosciuti: {sospette}")
        mancanti = []
        for testo in ["Belgium", "Belgique", "België", "Brussels", "Antwerp", "Ghent", "Liège", "Diegem"]:
            offset = 0
            for _ in range(20):
                d = jn._json(jn.http_post(api, headers=h, timeout=20,
                                          json={"appliedFacets": {}, "limit": 20, "offset": offset,
                                                "searchText": testo}))
                if not isinstance(d, dict) or not d.get("jobPostings"):
                    break
                for j in d["jobPostings"]:
                    url = f"https://pwc.wd3.myworkdayjobs.com/{site}{j.get('externalPath')}/apply"
                    if url not in noti and jn.PWC_BE_SEDI.search(j.get("locationsText") or ""):
                        noti.add(url)
                        mancanti.append((j.get("title"), j.get("locationsText")))
                offset += 20
                if offset >= (d.get("total") or 0):
                    break
        for t, l in mancanti[:20]:
            print(f"     · MANCA [{site}] {t} — {l}")
        esito("PwC Belgio", f"{site}: {len(mancanti)} offerte belghe trovate con ricerca testuale e non dallo scraper")


def _deloitte_raccogli(query):
    """Tutte le offerte Deloitte per una query di filtri (stessa paginazione dello scraper)."""
    base = "https://deloittecm.avature.net"
    out, offset = {}, 0
    for _ in range(150):
        r = jn.http_get(f"{base}/en_US/careers/SearchJobs/?{query}&listFilterMode=1"
                        f"&jobRecordsPerPage=50&jobOffset={offset}")
        if not r:
            break
        soup = BeautifulSoup(r.text, "lxml")
        cards = soup.select("h3 a[href*='/careers/JobDetail/']")
        nuovi = 0
        for a in cards:
            href = base + a["href"] if a["href"].startswith("/") else a["href"]
            if href not in out:
                ctx = a.find_parent("li") or a.find_parent("tr") or a.find_parent("div")
                out[href] = (a.get_text(strip=True), ctx.get_text(" ", strip=True)[:160] if ctx else "")
                nuovi += 1
        if not cards or nuovi == 0:
            break
        offset += len(cards)
        time.sleep(0.3)
    return out


def verifica_deloitte(trovate):
    """Che cosa esclude il filtro 731 dell'URL: elenca le offerte italiane
    (filtro 729) che lo scraper non raccoglie, e il contesto HTML del filtro."""
    base = "https://deloittecm.avature.net"
    r = jn.http_get(f"{base}/en_US/careers/SearchJobs/?729=5946&729_format=1565&listFilterMode=1")
    if r:
        for val in ("5946", "6470", "6471"):
            for m in list(re.finditer(val, r.text))[:2]:
                frammento = BeautifulSoup(r.text[max(0, m.start() - 300): m.end() + 300], "lxml").get_text(" ", strip=True)
                print(f"  contesto '{val}': …{frammento[:220]}…")
        # Etichette delle opzioni del filtro 731 con i relativi conteggi
        soup = BeautifulSoup(r.text, "lxml")
        for el in soup.select("[name*='731'], [data-value], option"):
            if "731" in (el.get("name") or "") or el.name == "option":
                print(f"  opzione: name={el.get('name')} value={el.get('value')} "
                      f"testo={el.get_text(' ', strip=True)[:60] or el.find_parent().get_text(' ', strip=True)[:60]}")
    noti = {o["url"] for o in trovate}
    solo_paese = _deloitte_raccogli("729=5946&729_format=1565")
    extra = {h: v for h, v in solo_paese.items() if h not in noti}
    print(f"  Con il solo filtro 729: {len(solo_paese)} offerte, {len(extra)} non raccolte dallo scraper:")
    for h, (t, ctx) in list(extra.items())[:40]:
        print(f"     · {t}  ‖ {ctx}")
    esito("Deloitte", f"{len(extra)} offerte escluse dal filtro 731 (scraper {len(trovate)}, "
                      f"solo filtro 729 {len(solo_paese)})")


def verifica_kpmg(trovate):
    r = jn.http_get("https://careers.kpmg.it/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=0")
    if r:
        testo = BeautifulSoup(r.text, "lxml").get_text(" ", strip=True)
        m = re.search(r"(\d+)\s*[–-]\s*(\d+)\s*(?:di|of)\s*(\d+)", testo)
        if m:
            esito("KPMG", f"scraper {len(trovate)} · il sito dichiara {m.group(3)}")
        else:
            esito("KPMG", f"scraper {len(trovate)} · totale dichiarato non trovato nella pagina")


def verifica_bip(trovate):
    """Offerte con sede principale estera ma una sede secondaria in Italia."""
    BASE = "https://fa-etjb-saasfaprod1.fa.ocs.oraclecloud.com"
    API = f"{BASE}/hcmRestApi/resources/latest/recruitingCEJobRequisitions"
    extra, offset, tot = [], 0, None
    for _ in range(60):
        finder = f"findReqs;siteNumber=CX_1,limit=25,offset={offset},sortBy=POSTING_DATES_DESC"
        j = jn._json(jn.http_get(API, headers={"Accept": "application/json"},
                                 params={"onlyData": "true",
                                         "expand": "requisitionList.secondaryLocations",
                                         "finder": finder}))
        try:
            d = j["items"][0]
        except Exception:
            break
        tot = tot or d.get("TotalJobsCount")
        reqs = d.get("requisitionList") or []
        if not reqs:
            break
        for q in reqs:
            if q.get("PrimaryLocationCountry") == "IT":
                continue
            sec = q.get("secondaryLocations") or []
            if any((s.get("CountryCode") == "IT") or "ital" in (s.get("Name") or "").lower() for s in sec):
                extra.append((q.get("Title"), q.get("PrimaryLocation")))
        offset += 25
        if tot and offset >= tot:
            break
    for t, l in extra[:15]:
        print(f"     · MANCA {t} — sede principale {l}")
    esito("Bip", f"{len(extra)} offerte con sede principale estera ma sede secondaria in Italia (non raccolte); "
                 f"totale globale {tot}")


def verifica_conteggi_dichiarati():
    for fonte, (racc, dich) in jn.COPERTURA.items():
        stato = "OK" if racc >= dich else f"MANCANO {dich - racc}"
        esito(fonte, f"copertura {racc}/{dich} {stato}")


# ----------------------------------------------------------------------------

def main():
    seen, _ = jn.carica_seen()
    scrapers = [("EY", jn.scrape_ey), ("PwC Italia", jn.scrape_pwc_italia),
                ("PwC Belgio", jn.scrape_pwc_belgio), ("Deloitte", jn.scrape_deloitte),
                ("KPMG", jn.scrape_kpmg), ("Accenture", jn.scrape_accenture),
                ("NTT DATA", jn.scrape_nttdata), ("Bip", jn.scrape_bip),
                ("Digital360", jn.scrape_digital360), ("Capgemini", jn.scrape_capgemini)]
    specifiche = {"EY": verifica_ey, "PwC Belgio": verifica_pwc_belgio,
                  "Deloitte": verifica_deloitte, "KPMG": verifica_kpmg, "Bip": verifica_bip}

    import os
    solo = [x.strip() for x in os.environ.get("VERIFICA_FONTI", "").split(",") if x.strip()]
    if solo:
        scrapers = [(n, f) for n, f in scrapers if n in solo]
    raccolte = {}
    for nome, fn in scrapers:
        titolo(f"{nome}: raccolta")
        try:
            raccolte[nome] = fn() or []
        except Exception as e:
            esito(nome, f"ERRORE scraper: {e}")
            raccolte[nome] = []
    verifica_conteggi_dichiarati()

    for nome, fn in scrapers:
        titolo(f"{nome}: verifiche")
        offerte = raccolte[nome]
        fuori, vecchie = non_viste(nome, offerte, seen)
        if vecchie:
            esito(nome, f"{len(vecchie)} offerte mai segnalate e più vecchie di {jn.MAX_GIORNI_NUOVA} giorni")
        senza_url = sum(1 for o in offerte if not o.get("url"))
        if senza_url:
            esito(nome, f"{senza_url} offerte senza link")
        if nome != "Accenture":          # evita altri 429 da Workday
            try:
                stabilita(nome, fn, offerte)
            except Exception as e:
                esito(nome, f"ERRORE seconda raccolta: {e}")
        if nome in specifiche:
            try:
                specifiche[nome](offerte)
            except Exception as e:
                esito(nome, f"ERRORE verifica specifica: {e}")

    titolo("RIEPILOGO")
    for fonte, msg in RIEPILOGO:
        print(f"  {fonte:12s} │ {msg}")


if __name__ == "__main__":
    main()

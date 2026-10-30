"""Prova temporanea: perché NTT DATA Irlanda, Deloitte e KPMG Lussemburgo
non raccolgono tutte le offerte dichiarate dal sito."""
import json, sys, time, collections
sys.path.insert(0, ".")
import requests
import job_newsletter as jn

def sez(t): print(f"\n{'=' * 60}\n{t}\n{'=' * 60}", flush=True)

# ---------------- NTT DATA Irlanda ----------------
def ntt(paese, extra=None, size=200, frm=0):
    body = {"lang": "en_global", "deviceType": "desktop", "country": "global",
            "pageName": "search-results", "ddoKey": "refineSearch", "sortBy": "",
            "subsearch": "", "from": frm, "jobs": True, "counts": True,
            "all_fields": ["category", "country", "state", "city", "type"],
            "size": size, "clearAll": False, "jdsource": "facets", "isSliderEnable": False,
            "pageId": "page20", "siteType": "external", "keywords": "", "global": True,
            "selected_fields": {"country": [paese]} if paese else {}, "locationData": {}}
    if extra: body.update(extra)
    r = requests.post(f"{jn.NTT_PHENOM}/widgets", json=body, timeout=30,
                      headers={**jn.HEADERS, "Content-Type": "application/json", "Accept": "application/json"})
    return r.json().get("refineSearch") or {}

sez("NTT DATA Irlanda")
for size, frm in [(200, 0), (10, 0), (10, 10), (6, 6)]:
    rs = ntt("Ireland", size=size, frm=frm)
    jobs = (rs.get("data") or {}).get("jobs") or []
    print(f"size={size} from={frm}: totalHits={rs.get('totalHits')} hits={rs.get('hits')} ricevuti={len(jobs)}")
rs = ntt("Ireland")
for j in (rs.get("data") or {}).get("jobs") or []:
    print("  ", j.get("jobId"), "|", j.get("country"), "|", j.get("city"), "|", (j.get("title") or "")[:50],
          "|", (j.get("applyUrl") or "")[:80], "| multi:", j.get("multi_location") or j.get("locations"))
agg = (rs.get("data") or {}).get("aggregations") or rs.get("aggregations")
print("aggregations:", json.dumps(agg)[:1500] if agg else None)
print("chiavi refineSearch:", list(rs.keys()), "chiavi data:", list((rs.get("data") or {}).keys()))
for k in ["eid", "status"]: print(k, rs.get(k))
# ricerca per parola chiave "Ireland" / "Dublin" senza filtro paese
for kw in ["Ireland", "Dublin"]:
    rs2 = ntt(None, extra={"keywords": kw})
    jobs2 = (rs2.get("data") or {}).get("jobs") or []
    print(f"keyword {kw}: totalHits={rs2.get('totalHits')} ricevuti={len(jobs2)}")
    for j in jobs2[:40]:
        if "ireland" in json.dumps(j).lower() or "dublin" in json.dumps(j).lower():
            print("   ", j.get("jobId"), "|", j.get("country"), "|", j.get("city"), "|", (j.get("title") or "")[:50], "|", (j.get("applyUrl") or "")[:70])
# un job completo, per vedere i campi
jobs = (rs.get("data") or {}).get("jobs") or []
if jobs: print("esempio job:", json.dumps(jobs[0])[:2500])

# ---------------- SuccessFactors CSB ----------------
def csb(host, categoria, pagina_ricerca, nome):
    sez(nome)
    s = requests.Session(); s.headers.update(jn.HEADERS)
    t0 = time.time()
    try:
        r = s.get(host + pagina_ricerca, timeout=60)
        print("GET pagina:", r.status_code, f"{time.time()-t0:.1f}s", len(r.text))
    except Exception as e:
        print("GET pagina errore:", e); return
    tok = __import__("re").search(r'csrf[_-]?token["\']?\s*[:=]\s*["\']([^"\']+)', r.text, 2)
    h = {"Content-Type": "application/json", "Accept": "application/json", "Origin": host, "Referer": host + pagina_ricerca}
    if tok: h["X-CSRF-Token"] = tok.group(1)
    def giro(sortBy, etichetta):
        ids_per_pag, tutti, tot = [], [], None
        for p in range(40):
            body = jn._sf_csb_corpo(p, categoria, "en_GB"); body["sortBy"] = sortBy
            try:
                d = s.post(host + "/services/recruiting/v1/jobs", json=body, headers=h, timeout=60).json()
            except Exception as e:
                print("   errore pagina", p, e); break
            tot = d.get("totalJobs") if tot is None else tot
            b = [(x.get("response") or {}).get("id") for x in d.get("jobSearchResult") or []]
            if not b: break
            ids_per_pag.append(len(b)); tutti += b
            if len(set(tutti)) >= (tot or 10**9) and p > 0 and len(b) == 0: break
            if len(tutti) > (tot or 0) * 2 + 40: break
        print(f"  sortBy={etichetta!r}: totale={tot} pagine={len(ids_per_pag)} per_pagina={ids_per_pag[:3]} "
              f"righe={len(tutti)} distinti={len(set(tutti))} doppi={len(tutti)-len(set(tutti))}")
        return set(tutti), tot
    risultati = {}
    for sb in ["", "date", "title", "recent", "relevance", "location"]:
        risultati[sb] = giro(sb, sb)
    # due giri identici per vedere la stabilità con l'ordinamento migliore
    for sb in ["date", "title"]:
        a, _ = risultati[sb]; b, _ = giro(sb, sb + " (2° giro)")
        print(f"  stabilità {sb}: diff {len(a ^ b)}")
    # facet/filtri: cosa dice la risposta oltre ai job
    body = jn._sf_csb_corpo(0, categoria, "en_GB")
    d = s.post(host + "/services/recruiting/v1/jobs", json=body, headers=h, timeout=60).json()
    print("  chiavi risposta:", list(d.keys()))
    if d.get("jobSearchResult"): print("  esempio:", json.dumps(d["jobSearchResult"][0])[:1200])

csb("https://jobs.deloitte.lu", 9826901, "/go/View-all-Jobs/9826901/", "Deloitte Lussemburgo")
csb("https://careers.kpmg.lu", 0, "/search/?q=", "KPMG Lussemburgo")

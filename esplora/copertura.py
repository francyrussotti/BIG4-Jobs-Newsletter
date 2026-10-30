"""Prova temporanea 2: le offerte NTT DATA Irlanda con link di candidatura
verso l'ambiente di anteprima SAP hanno una pagina pubblica su careers.nttdata.com?"""
import json, re, sys
sys.path.insert(0, ".")
import requests
import job_newsletter as jn

jobs, tot = jn._nttdata_phenom("Ireland")
print("totale", tot, "ricevuti", len(jobs))
prova = [j for j in jobs if not jn._ntt_link_valido(j)]
print("con link anteprima:", len(prova))
s = requests.Session(); s.headers.update(jn.HEADERS)
for j in prova[:4]:
    print("\n---", j.get("jobId"), j.get("title"), "| seq", j.get("jobSeqNo"), "| posted", j.get("postedDate"))
    print("applyUrl:", j.get("applyUrl"))
    print("campi url:", {k: v for k, v in j.items() if isinstance(v, str) and ("http" in v or "url" in k.lower())})
    slug = re.sub(r"[^A-Za-z0-9]+", "-", j.get("title") or "").strip("-")
    for u in [f"{jn.NTT_PHENOM}/global/en/job/{j.get('jobId')}/{slug}",
              f"{jn.NTT_PHENOM}/global/en/job/{j.get('jobId')}",
              f"{jn.NTT_PHENOM}/global/en/job/{j.get('jobSeqNo')}"]:
        try:
            r = s.get(u, timeout=30, allow_redirects=True)
            t = re.search(r"<title>(.*?)</title>", r.text, re.S)
            print(f"  {r.status_code} {r.url[:110]} | title: {(t.group(1).strip()[:90] if t else None)} | titolo presente: {(j.get('title') or '')[:25].lower() in r.text.lower()}")
        except Exception as e:
            print("  errore", u, e)
    try:
        r = s.get(j.get("applyUrl"), timeout=30)
        print(f"  applyUrl → {r.status_code} {r.url[:110]} | len {len(r.text)}")
    except Exception as e:
        print("  applyUrl errore", e)
# Le stesse offerte esistono sul SuccessFactors di produzione della consulenza (careers.emeal)?
print("\nesempio campi completi:", json.dumps({k: v for k, v in prova[0].items() if k not in ("ml_skills", "ml_job_parser", "descriptionTeaser")})[:2000] if prova else None)
# Altri paesi: quante offerte con link anteprima vengono scartate?
for p in ["Italy", "Belgium", "Luxembourg", "Netherlands"]:
    js, t = jn._nttdata_phenom(p)
    print(p, "totale", t, "scartate anteprima", sum(not jn._ntt_link_valido(x) for x in js))

"""Prova temporanea dei nuovi scraper (10 società di consulenza) sui siti veri."""
import sys, os, time, traceback
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import job_newsletter as jn
PAESI = ["Italia", "Belgio", "Lussemburgo", "Irlanda", "Paesi Bassi"]
SCRAPER = {"ZS": jn.scrape_zs, "Roland Berger": jn.scrape_roland_berger, "Oliver Wyman": jn.scrape_oliver_wyman,
           "L.E.K.": jn.scrape_lek, "OC&C": jn.scrape_occ, "Simon-Kucher": jn.scrape_simon_kucher,
           "Arthur D. Little": jn.scrape_adl, "IBM Consulting": jn.scrape_ibm, "Gartner": jn.scrape_gartner}
tab = {}
for az, fn in SCRAPER.items():
    for paese in PAESI:
        t0 = time.time()
        try:
            out = fn(paese)
            tab[(az, paese)] = len(out)
            for o in out[:2]:
                print(f"   · [{o.get('data') or 's.d.'}] {o['titolo']} | {o['location']} | {o['url'][:110]}")
        except Exception:
            tab[(az, paese)] = "ERR"
            traceback.print_exc()
    # dimensione dell'elenco mondiale scaricato
    for k, v in jn._CACHE_ELENCHI.items():
        n = len(v[0]) if isinstance(v, tuple) else len(v)
        print(f"   [elenco {k}: {n} offerte nel mondo]")
for nome, fn in [("Grant Thornton Belgio", jn.scrape_grant_thornton_belgio), ("Grant Thornton Irlanda", jn.scrape_grant_thornton_irlanda)]:
    try:
        out = fn(); tab[(nome, "")] = len(out)
        for o in out[:2]:
            print(f"   · [{o.get('data') or 's.d.'}] {o['titolo']} | {o['location']} | {o['url'][:110]}")
    except Exception:
        tab[(nome, "")] = "ERR"; traceback.print_exc()

print("\n" + "=" * 80 + "\nRIEPILOGO (offerte per paese)\n" + "=" * 80)
print(f"{'':18s}" + "".join(f"{p[:11]:>12s}" for p in PAESI))
for az in SCRAPER:
    print(f"{az:18s}" + "".join(f"{str(tab.get((az, p))):>12s}" for p in PAESI))
for nome in ("Grant Thornton Belgio", "Grant Thornton Irlanda"):
    print(f"{nome:24s} {tab.get((nome, ''))}")
print("elenchi mondiali:", {k: (len(v[0]) if isinstance(v, tuple) else len(v)) for k, v in jn._CACHE_ELENCHI.items()})

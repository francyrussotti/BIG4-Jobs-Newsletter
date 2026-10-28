"""Prova temporanea dei nuovi scraper NTT DATA sui siti veri."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import job_newsletter as jn
for fn in (jn.scrape_nttdata_belgio, jn.scrape_nttdata):
    out = fn()
    print(f"\n{fn.__name__}: {len(out)} offerte · copertura {jn.COPERTURA}")
    for o in out[:12] + (["…"] if len(out) > 24 else []) + out[-12:]:
        print("   ·", o if o == "…" else f"[{o['data'] or 's.d.'}] {o['titolo']} | {o['location']} | {o['url'][:110]}")
    ids = [jn._job_id(fn.__name__, o) for o in out]
    print("   ID duplicati:", len(ids) - len(set(ids)))

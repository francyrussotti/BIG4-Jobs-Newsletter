"""Prova temporanea 3: gli scraper corretti sui siti veri, due volte ciascuno."""
import sys
sys.path.insert(0, ".")
import job_newsletter as jn

for nome, fn in [("NTT DATA Irlanda", lambda: jn.scrape_nttdata_paese("Irlanda")),
                 ("Deloitte Lussemburgo", jn.scrape_deloitte_lussemburgo),
                 ("KPMG Lussemburgo", jn.scrape_kpmg_lussemburgo)]:
    giri = []
    for _ in range(2):
        out = fn()
        giri.append({jn._job_id(nome, o) for o in out})
        print(f"RISULTATO {nome}: {len(out)} offerte, copertura {jn.COPERTURA.get(nome)}", flush=True)
    print(f"RISULTATO {nome}: differenza tra i due giri = {len(giri[0] ^ giri[1])}")
    for o in out[:3]: print("   esempio:", o["titolo"], "|", o["location"], "|", o["url"])

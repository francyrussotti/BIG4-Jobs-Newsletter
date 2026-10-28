"""Prova temporanea di tutte le fonti nuove sui siti veri."""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import job_newsletter as jn
NUOVE = [n for n, _ in jn.elenco_fonti()
         if n not in ("EY", "PwC Italia", "Deloitte Italia", "KPMG Italia", "Accenture Italia",
                      "NTT DATA Italia", "Capgemini Italia", "Bip", "Digital360", "PwC Belgio")]
fonti = dict(jn.elenco_fonti())
riepilogo = []
for nome in NUOVE:
    t0 = time.time()
    try:
        out = fonti[nome]()
    except Exception as e:
        riepilogo.append(f"{nome:24s} ERRORE {e}")
        continue
    datate = sum(1 for o in out if jn._eta_giorni(o.get("data")) is not None)
    recenti = sum(1 for o in out if (jn._eta_giorni(o.get("data")) or 99) <= 7)
    ids = {jn._job_id(nome, o) for o in out}
    cop = jn.COPERTURA.get(nome)
    riepilogo.append(f"{nome:24s} {len(out):4d} offerte · copertura {cop} · con data {datate} · ultimi 7gg {recenti}"
                     f" · ID unici {len(ids)} · {time.time()-t0:.0f}s")
    for o in out[:3]:
        print(f"   · [{o.get('data') or 's.d.'}] {o['titolo']} | {o['location']} | {o['url'][:120]}")
print("\n" + "=" * 80 + "\nRIEPILOGO\n" + "=" * 80)
print("\n".join(riepilogo))

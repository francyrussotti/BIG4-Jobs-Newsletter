"""Rimanda la newsletter di oggi a una sola persona (es. chi è stato appena
aggiunto all'elenco), senza toccare seen_jobs.json né scrivere agli altri.

La mail non viene salvata: si ricostruisce rileggendo i siti e tenendo solo
le offerte che la newsletter di oggi ha segnato come nuove (differenza tra
seen_jobs.json di oggi e quello precedente nella storia git).

Uso (dal workflow "Rimanda la newsletter di oggi"):
  REINVIA_A=<parte dell'indirizzo> python reinvia.py
L'indirizzo completo si prende dal secret EMAIL_DESTINATARIO, così non
compare nel repository pubblico né nei log.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

import job_newsletter as jn


def versioni_seen():
    """(id di ieri, id segnati oggi) dalla storia git di seen_jobs.json."""
    commit = subprocess.run(["git", "log", "--format=%H", "-n", "30", "--", jn.SEEN_FILE],
                            capture_output=True, text=True, check=True).stdout.split()
    def leggi(c):
        r = subprocess.run(["git", "show", f"{c}:{jn.SEEN_FILE}"], capture_output=True, text=True)
        return json.loads(r.stdout) if r.returncode == 0 else None
    oggi = jn.oggi_italia()
    for c in commit:
        dopo = leggi(c)
        if not dopo or dopo.get("ultimo_invio") != oggi:
            continue
        prima = leggi(f"{c}^")
        if prima and prima.get("ultimo_invio") != oggi:
            return prima, set(dopo["ids"]) - set(prima["ids"])
    return None, None


def main():
    chiave = os.environ.get("REINVIA_A", "").strip().lower()
    elenco = [d for d in re.split(r"[,;\s]+", jn.EMAIL_DESTINATARIO) if d.strip()]
    scelti = [d for d in elenco if chiave and chiave in d.lower()]
    if len(scelti) != 1:
        print(f"❌ '{chiave}' corrisponde a {len(scelti)} indirizzi nel secret EMAIL_DESTINATARIO "
              "(ne serve esattamente uno): l'indirizzo è stato aggiunto all'elenco?")
        return 1

    prima, ids_oggi = versioni_seen()
    if prima is None:
        print("❌ La newsletter di oggi non risulta ancora inviata: niente da rimandare.")
        return 1
    print(f"📬 Offerte segnate come nuove oggi: {len(ids_oggi)}")

    with tempfile.TemporaryDirectory() as cartella:
        file_prima = os.path.join(cartella, "seen_prima.json")
        with open(file_prima, "w") as f:
            json.dump(prima, f)
        jn.SEEN_FILE = file_prima                   # punto di partenza: com'era stamattina
        jn.salva_seen = lambda *a, **k: None        # nessuna scrittura
        jn.EMAIL_DESTINATARIO = scelti[0]
        jn.COPIA_AL_MITTENTE = False
        filtra = jn.filtra_nuove
        def solo_quelle_di_oggi(azienda, offerte, seen):
            offerte = [o for o in offerte if jn._job_id(azienda, o) in ids_oggi]
            return filtra(azienda, offerte, seen)
        jn.filtra_nuove = solo_quelle_di_oggi
        invia = jn.invia_email
        esito = {}
        def invia_e_ricorda(*a, **k):
            esito["stato"] = invia(*a, **k)
            return esito["stato"]
        jn.invia_email = invia_e_ricorda
        os.environ["NEWSLETTER_FORZA"] = "true"
        try:
            jn.main()
        except SystemExit:
            pass   # il main esce con 1 anche per problemi delle fonti: conta solo l'invio
    if esito.get("stato") != "ok":
        print(f"❌ Invio non riuscito ({esito.get('stato')})")
        return 1
    print("✅ Newsletter di oggi rimandata.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

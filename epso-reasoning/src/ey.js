// ---------- EY Belgium online assessment (Maki People): preparation page ----------
const EY_TPL={'ey-num':'Problemi numerici','ey-series':'Serie numeriche','ey-order':'Ordinamenti','ey-syl':'Sillogismi','ey-cond':'Se… allora','ey-sjt':'Situazioni di lavoro','ey-ai':'Uso dell\'AI'};
const EY_TIPS={
  mind:['Circa 37 secondi a domanda: se una domanda ti blocca, scegli e vai avanti.','Problemi numerici: scrivi i dati su carta e calcola il valore unitario.','Serie: guarda le differenze, poi rapporti, quadrati, due serie alternate.','Figure: un elemento alla volta (forma, posizione, rotazione, numero, colore).'],
  crit:['Logica non verbale: serie di figure e figure da escludere.','Un elemento alla volta: forma, lati, colore, posizione, rotazione, numero.','"Quale non c\'entra": cerca la proprietà comune a quattro figure su cinque.','Circa 37 secondi a domanda: se non vedi la regola, scegli e vai avanti.'],
  adapt:['Scegli la risposta che affronta il problema, comunica con le persone coinvolte e mostra flessibilità.','Evita le risposte rigide ("si fa come concordato"), passive ("aspetto") o solitarie ("faccio da solo senza dire niente").'],
  aipro:['Nel test vero sono affermazioni sul tuo modo di usare l\'AI: rispondi in modo sincero e coerente, non "da manuale".','Dati riservati mai in strumenti pubblici.','Ogni dato, citazione o calcolo prodotto dall\'AI va verificato.','Un buon prompt: ruolo, compito, pubblico, formato, vincoli.','Le decisioni importanti restano a una persona.']
};
function renderEY(){
  const s=k=>SEC[k];
  const last=DB.sessions.find(x=>x.kind==='eyfull');
  const ex=(DB.eyExamples||[{},{},{},{},{}]);
  app().innerHTML=header('Test EY · Maki','Preparazione al test online di EY Belgium (EU MIST): MIND, Critical thinking, Adaptability, AI proficiency.')+`
  <main class="wrap stack">
    <section class="panel stack">
      <h2>Cosa sappiamo del test</h2>
      <dl class="dl">
        <dt>Confermato (email)</dt><dd>Piattaforma Maki People. Attività da 5-10 minuti ciascuna, 40 minuti in tutto. Pausa possibile solo tra un'attività e l'altra. Lingua: inglese, francese o olandese (scegli l'inglese e usalo per tutto). Carta e penna utili. Punteggio minimo richiesto. Scadenza venerdì 13 novembre. <b>Vietato usare l'AI durante il test.</b></dd>
        <dt>Catalogo ufficiale Maki</dt><dd><b>MIND</b> 10 min: abilità cognitiva non verbale, serie di numeri, problem solving, ragionamento numerico. <b>Basic critical thinking</b> 8 min: logica <b>non verbale</b> (figure). <b>Adaptability (SJT)</b> 8 min: situazioni di lavoro. <b>AI proficiency (SJT)</b> 12 min: affermazioni sul tuo uso dell'AI, scegli l'opzione che ti descrive meglio; misura agilità con gli strumenti, alfabetizzazione su dati e algoritmi, uso etico, interazione con lo strumento. Totale 38 minuti, coerente con i 40 dell'email.</dd>
        <dt>Da verificare all'inizio</dt><dd>Adaptability e AI proficiency esistono anche come <b>colloquio strutturato</b> (11-12 min, risposte scritte o parlate su tue esperienze reali, valutate con griglie di comportamento). Le versioni a situazioni non sono disponibili in olandese, quelle a colloquio sì: EY potrebbe usare queste. Prepara comunque gli esempi qui sotto.</dd>
        <dt>Da fonti terze</dt><dd>Numero di domande: MIND circa 16, Critical thinking circa 13, Adaptability circa 10. Timer non sospendibile dentro un'attività, ogni attività si fa una volta, risultato riusato se hai fatto la stessa attività negli ultimi 6 mesi, Chrome da computer, schermo intero, monitoraggio.</dd>
        <dt>Piano</dt><dd>Allenati oggi e domani con le prove qui sotto, poi fai il test vero <b>lunedì 9 o martedì 10 novembre</b>, in un'unica sessione, da computer con Chrome, connessione stabile, carta e penna. Così resta margine prima del 13, che è anche il giorno dell'EPSO.</dd>
      </dl>
      <p class="small muted">Queste prove sono domande originali per allenarti al formato e ai tempi; non sono domande del test reale. Durante il test vero non usare l'AI né questo sito.</p>
    </section>
    <section class="hero">
      <button class="card primary-card" id="ey-full"><span class="eyebrow">Simulazione completa EY</span><b>Le quattro attività di fila, con pausa facoltativa tra una e l'altra</b><span class="spec mono">16 dom. · 10:00 → 13 · 08:00 → 10 · 08:00 → 10 · 12:00</span>${last?`<span class="muted">Ultima: ${fmtD(last.date)} · ${last.parts.map(p=>`${SEC[p.sec].name} ${p.score}/${p.n}`).join(' · ')}</span>`:'<span class="muted">Fanne una come prova generale prima del test vero.</span>'}</button>
      <div class="cards4">${['mind','crit','adapt','aipro'].map(k=>`<div class="card"><span class="eyebrow">${s(k).name}</span><b>${s(k).n} domande · ${fmtT(s(k).sec)}</b>
        <span class="muted small">${{mind:'Problemi numerici, serie, figure, logica.',crit:'Logica non verbale: serie di figure e "quale non c\'entra".',adapt:'Situazioni di lavoro: la risposta più efficace.',aipro:'Uso pratico e responsabile dell\'AI. Nel test vero: rispondi in modo sincero e coerente.'}[k]}</span>
        <div class="row"><button class="primary" data-eyt="${k}">A tempo</button><button data-eyp="${k}">Pratica</button></div></div>`).join('')}</div>
    </section>
    <section class="panel row spread"><div><h2>Calcolo rapido</h2><p class="small muted">MIND è a tempo stretto: allena il calcolo a mente con sessioni da 60-180 secondi (operatore, ruota, vero o falso, calcolo).</p></div><button class="primary" data-nav="mental">Allenati</button></section>
    <section class="panel row spread"><div><h2>EY interview</h2><p class="small muted">In inglese, dopo il test: requisiti della vacancy, ecosistema spaziale UE, analisi costi-benefici, domande tecniche con risposte modello, esercizi.</p></div><button class="primary" data-nav="interview">Apri</button></section>
    <section class="panel stack">
      <h2>I miei esempi</h2>
      <p class="small muted">Se Adaptability o AI proficiency sono colloqui strutturati, ti chiederanno esperienze reali. Prepara per ciascun esempio: situazione, cosa hai fatto, risultato. Per l'AI: come hai verificato e corretto l'output, un errore intercettato, un caso in cui hai scelto di non usarla. Restano solo in questo browser.</p>
      ${[0,1,2,3,4].map(i=>`<label>${i<3?'AI · esempio '+(i+1):'Adattamento al cambiamento · esempio '+(i-2)}<textarea class="eyex" data-i="${i}" rows="4" placeholder="Compito · come ho usato l'AI · cosa ho verificato o corretto · risultato">${esc(ex[i]&&ex[i].t||'')}</textarea></label>`).join('')}
      <p class="small muted" id="ey-saved"></p>
    </section>
    ${footer()}
  </main>`;
  bindNav();
  $('#ey-full').onclick=startEYFull;
  document.querySelectorAll('[data-eyt]').forEach(b=>b.onclick=()=>startSession('single',{sec:b.dataset.eyt}));
  document.querySelectorAll('[data-eyp]').forEach(b=>b.onclick=()=>startSession('practice',{sec:b.dataset.eyp}));
  document.querySelectorAll('.eyex').forEach(t=>t.oninput=()=>{ DB.eyExamples=DB.eyExamples||[{},{},{},{},{}]; DB.eyExamples[+t.dataset.i]={t:t.value}; saveDB(); $('#ey-saved').textContent='Salvato.'; });
}
function startEYFull(){
  const parts=['mind','crit','adapt','aipro'].map(sec=>({sec,items:buildEY(sec,SEC[sec].n),ans:{},flag:{},ms:{},changes:{},cur:0,timed:true,seconds:SEC[sec].sec,started:null,ended:null,deadline:null}));
  S={kind:'eyfull',parts,pi:0,created:Date.now(),done:false}; renderIntro();
}

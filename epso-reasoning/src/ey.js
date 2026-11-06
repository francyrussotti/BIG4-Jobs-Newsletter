// ---------- EY Belgium online assessment (Maki People): preparation page ----------
const EY_TPL={'ey-num':'Problemi numerici','ey-series':'Serie numeriche','ey-order':'Ordinamenti','ey-syl':'Sillogismi','ey-cond':'Se… allora','ey-sjt':'Situazioni di lavoro','ey-ai':'Uso dell\'AI'};
const EY_TIPS={
  mind:['Circa 37 secondi a domanda: se una domanda ti blocca, scegli e vai avanti.','Problemi numerici: scrivi i dati su carta e calcola il valore unitario.','Serie: guarda le differenze, poi rapporti, quadrati, due serie alternate.','Figure: un elemento alla volta (forma, posizione, rotazione, numero, colore).'],
  crit:['Sillogismi: disegna cerchi; segue solo ciò che vale in ogni caso.','"Se P allora Q": da P segue Q, da non-Q segue non-P; da Q o da non-P non segue nulla.','Ordinamenti: metti i nomi su una riga, indizio per indizio.','Tabelle: leggi la domanda prima dei dati.'],
  adapt:['Scegli la risposta che affronta il problema, comunica con le persone coinvolte e mostra flessibilità.','Evita le risposte rigide ("si fa come concordato"), passive ("aspetto") o solitarie ("faccio da solo senza dire niente").'],
  aipro:['Dati riservati mai in strumenti pubblici.','Ogni dato, citazione o calcolo prodotto dall\'AI va verificato.','Un buon prompt: ruolo, compito, pubblico, formato, vincoli.','Le decisioni importanti restano a una persona.']
};
function renderEY(){
  const s=k=>SEC[k];
  const last=DB.sessions.find(x=>x.kind==='eyfull');
  const ex=(DB.eyExamples||[{},{},{}]);
  app().innerHTML=header('Test EY · Maki','Preparazione al test online di EY Belgium (EU MIST): MIND, Critical thinking, Adaptability, AI proficiency.')+`
  <main class="wrap stack">
    <section class="panel stack">
      <h2>Cosa sappiamo del test</h2>
      <dl class="dl">
        <dt>Confermato (email)</dt><dd>Piattaforma Maki People. Attività da 5-10 minuti ciascuna, 40 minuti in tutto. Pausa possibile solo tra un'attività e l'altra. Lingua: inglese, francese o olandese (scegli l'inglese e usalo per tutto). Carta e penna utili. Punteggio minimo richiesto. Scadenza venerdì 13 novembre. <b>Vietato usare l'AI durante il test.</b></dd>
        <dt>Da fonti terze</dt><dd>MIND circa 16 domande in 10 minuti; Critical thinking circa 13 in 8; Adaptability circa 10 in 8; per AI proficiency resta circa il tempo rimanente. Timer non sospendibile dentro un'attività, ogni attività si fa una volta, spesso schermo intero e monitoraggio. Non verificato per il tuo test.</dd>
        <dt>Piano</dt><dd>Allenati oggi e domani con le prove qui sotto, poi fai il test vero <b>lunedì 9 o martedì 10 novembre</b>, in un'unica sessione, da computer con Chrome, connessione stabile, carta e penna. Così resta margine prima del 13, che è anche il giorno dell'EPSO.</dd>
      </dl>
      <p class="small muted">Queste prove sono domande originali per allenarti al formato e ai tempi; non sono domande del test reale. Durante il test vero non usare l'AI né questo sito.</p>
    </section>
    <section class="hero">
      <button class="card primary-card" id="ey-full"><span class="eyebrow">Simulazione completa EY</span><b>Le quattro attività di fila, con pausa facoltativa tra una e l'altra</b><span class="spec mono">16 dom. · 10:00 → 13 · 08:00 → 10 · 08:00 → 10 · 10:00</span>${last?`<span class="muted">Ultima: ${fmtD(last.date)} · ${last.parts.map(p=>`${SEC[p.sec].name} ${p.score}/${p.n}`).join(' · ')}</span>`:'<span class="muted">Fanne una come prova generale prima del test vero.</span>'}</button>
      <div class="cards4">${['mind','crit','adapt','aipro'].map(k=>`<div class="card"><span class="eyebrow">${s(k).name}</span><b>${s(k).n} domande · ${fmtT(s(k).sec)}</b>
        <span class="muted small">${{mind:'Problemi numerici, serie, figure, logica.',crit:'Sillogismi, "se… allora", ordinamenti, tabelle.',adapt:'Situazioni di lavoro: la risposta più efficace.',aipro:'Uso pratico e responsabile dell\'AI, basi dell\'AI Act.'}[k]}</span>
        <div class="row"><button class="primary" data-eyt="${k}">A tempo</button><button data-eyp="${k}">Pratica</button></div></div>`).join('')}</div>
    </section>
    <section class="panel stack">
      <h2>I miei esempi con l'AI</h2>
      <p class="small muted">Per AI proficiency prepara 2-3 esempi reali. Per ciascuno: il compito, come hai verificato e corretto l'output, un errore che hai intercettato, un caso in cui hai scelto di non usarla. Restano solo in questo browser.</p>
      ${[0,1,2].map(i=>`<label>Esempio ${i+1}<textarea class="eyex" data-i="${i}" rows="4" placeholder="Compito · come ho usato l'AI · cosa ho verificato o corretto · risultato">${esc(ex[i]&&ex[i].t||'')}</textarea></label>`).join('')}
      <p class="small muted" id="ey-saved"></p>
    </section>
    ${footer()}
  </main>`;
  bindNav();
  $('#ey-full').onclick=startEYFull;
  document.querySelectorAll('[data-eyt]').forEach(b=>b.onclick=()=>startSession('single',{sec:b.dataset.eyt}));
  document.querySelectorAll('[data-eyp]').forEach(b=>b.onclick=()=>startSession('practice',{sec:b.dataset.eyp}));
  document.querySelectorAll('.eyex').forEach(t=>t.oninput=()=>{ DB.eyExamples=DB.eyExamples||[{},{},{}]; DB.eyExamples[+t.dataset.i]={t:t.value}; saveDB(); $('#ey-saved').textContent='Salvato.'; });
}
function startEYFull(){
  const parts=['mind','crit','adapt','aipro'].map(sec=>({sec,items:buildEY(sec,SEC[sec].n),ans:{},flag:{},ms:{},changes:{},cur:0,timed:true,seconds:SEC[sec].sec,started:null,ended:null,deadline:null}));
  S={kind:'eyfull',parts,pi:0,created:Date.now(),done:false}; renderIntro();
}

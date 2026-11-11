// ---------- Area pages: Logical, Numerical, Verbal, Business case, Simulations, Tools ----------
const EY_TPL={'ey-num':'Problemi numerici','ey-series':'Serie numeriche','ey-order':'Ordinamenti','ey-syl':'Sillogismi','ey-cond':'Se… allora','ey-sjt':'Situazioni di lavoro','ey-ai':'Uso dell\'AI'};
const EY_TIPS={
  mind:['Circa 37 secondi a domanda: se una domanda ti blocca, scegli e vai avanti.','Problemi numerici: scrivi i dati su carta e calcola il valore unitario.','Serie: guarda le differenze, poi rapporti, quadrati, due serie alternate.','Figure: un elemento alla volta (forma, posizione, rotazione, numero, colore).'],
  crit:['Logica non verbale: serie di figure e figure da escludere.','Un elemento alla volta: forma, lati, colore, posizione, rotazione, numero.','"Quale non c\'entra": cerca la proprietà comune a quattro figure su cinque.','Circa 37 secondi a domanda: se non vedi la regola, scegli e vai avanti.'],
  adapt:['Scegli la risposta che affronta il problema, comunica con le persone coinvolte e mostra flessibilità.','Evita le risposte rigide ("si fa come concordato"), passive ("aspetto") o solitarie ("faccio da solo senza dire niente").'],
  aipro:['Nel test vero sono affermazioni sul tuo modo di usare l\'AI: rispondi in modo sincero e coerente, non "da manuale".','Dati riservati mai in strumenti pubblici.','Ogni dato, citazione o calcolo prodotto dall\'AI va verificato.','Un buon prompt: ruolo, compito, pubblico, formato, vincoli.','Le decisioni importanti restano a una persona.']
};

const AREA_HARD={logical:['ds','seat','mat3','mat2'],numerical:['rate','pct','ser2','pyr']};
const SEC_DESC={
  verbal:'Brano + 4 affermazioni, una sola giusta.',
  numerical:'Tabelle e grafici, 5 opzioni, calcolatrice a schermo.',
  abstract:'Serie di 5 figure: scegli la sesta.',
  mind:'Test misto a tempo stretto: problemi, grafici, serie, logica, figure.',
  crit:'Matrici 3×3 e 2×2, serie di figure, figura intrusa.',
  adapt:'Situazioni di lavoro: scegli la risposta più efficace.',
  aipro:'Uso pratico e responsabile dell\'AI nel lavoro.'
};
function secCard(k,title){ const c=SEC[k]; return `<div class="card"><span class="eyebrow">${esc(title||c.it)}</span><b>${c.n} domande · ${fmtT(c.sec)}</b><span class="muted small">${SEC_DESC[k]||''}</span><div class="row"><button class="primary" data-t="${k}">A tempo</button><button data-p="${k}">Pratica</button></div></div>`; }
function hardCard(area){ const keys=AREA_HARD[area]; return `<div class="card"><span class="eyebrow">Formati avanzati</span><b>12 domande · ${fmtT(SEC.eyhard.sec)}</b><span class="muted small">${keys.map(k=>EY_HARD_T[k][0]).join(', ')}.</span><label class="row small">Formato <select data-hsel="${area}"><option value="">Tutti mescolati</option>${keys.map(k=>`<option value="${k}">${EY_HARD_T[k][0]}</option>`).join('')}</select></label><div class="row"><button class="primary" data-ht="${area}">A tempo</button><button data-hp="${area}">Pratica</button></div></div>`; }
function bindSecButtons(){
  document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>startSession('single',{sec:b.dataset.t}));
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>startSession('practice',{sec:b.dataset.p,n:10}));
  const hard=(area,kind)=>{ const sel=document.querySelector(`[data-hsel="${area}"]`); EY_HARD_SET=AREA_HARD[area]; EY_HARD_ONLY=sel?sel.value:''; startSession(kind,{sec:'eyhard'}); };
  document.querySelectorAll('[data-ht]').forEach(b=>b.onclick=()=>hard(b.dataset.ht,'single'));
  document.querySelectorAll('[data-hp]').forEach(b=>b.onclick=()=>hard(b.dataset.hp,'practice'));
}
const AREAS={
  logical:{name:'Logical',sub:'Ragionamento astratto e logico: serie di figure, matrici, vincoli, sufficienza dei dati.'},
  numerical:{name:'Numerical',sub:'Tabelle, grafici, problemi, serie numeriche e calcolo a mente.'},
  verbal:{name:'Verbal',sub:'Comprensione di brani: cosa è vero, falso o non deducibile.'},
  case:{name:'Business case',sub:'Casi e colloqui: analisi costi-benefici, stime di mercato, situazioni di lavoro, uso dell\'AI.'}
};
function renderArea(k){
  const A=AREAS[k]; let body='';
  if(k==='logical') body=`<div class="cards3">${secCard('abstract','Serie di figure')}${secCard('crit','Matrici e figura intrusa')}${hardCard('logical')}</div>
    <section class="panel row spread"><div><h2>Metodo</h2><p class="small muted">Checklist per le figure: un elemento alla volta (forma, numero, colore, posizione, rotazione).</p></div><button data-nav="method">Apri il metodo</button></section>`;
  else if(k==='numerical') body=`<div class="cards3">${secCard('numerical','Tabelle e grafici')}${secCard('mind','Test attitudinale misto')}${hardCard('numerical')}</div>
    <section class="panel row spread"><div><h2>Calcolo rapido</h2><p class="small muted">Calcolo a mente a tempo: operatore, ruota con trappole, vero o falso, calcolo. Sessioni da 60-180 secondi.</p></div><button class="primary" data-nav="mental">Allenati</button></section>`;
  else if(k==='verbal'){ const vw=Object.keys(DB.vwrong).length, vt=verbalSources().length, vs=verbalSources().filter(s=>DB.seen[s.pid]).length;
    body=`<div class="cards3">${secCard('verbal','Comprensione di brani')}
      <div class="card"><span class="eyebrow">Ripasso</span><b>Errori verbali: ${vw}</b><span class="muted small">Rifai solo i brani che hai sbagliato. ${vs}/${vt} brani visti.</span><div class="row"><button class="primary" id="go-review" ${vw?'':'disabled'}>Ripassa</button></div></div>
      <div class="card"><span class="eyebrow">Metodo</span><b>Trappole verbali</b><span class="muted small">Tipi di affermazione e trappole ricorrenti, con esempi.</span><div class="row"><button data-nav="method">Apri il metodo</button></div></div></div>`; }
  else { const ex=(DB.eyExamples||[{},{},{},{},{}]);
    body=`<div class="cards3">
      <div class="card"><span class="eyebrow">Case & interview</span><b>Teoria, domande ed esercizi</b><span class="muted small">In inglese: analisi costi-benefici, stime di mercato, valutazioni, domande tecniche con risposte modello, esercizi numerici, quiz. Modulo di settore: spazio UE.</span><div class="row"><button class="primary" id="go-iv">Apri</button><a href="theory/case-theory-handbook.pdf" target="_blank" rel="noopener">Manuale PDF</a></div></div>
      ${secCard('adapt','Situational judgement')}${secCard('aipro','AI at work')}</div>
    <section class="panel stack">
      <h2>I miei esempi</h2>
      <p class="small muted">Per colloqui e test con risposte aperte servono esperienze reali. Per ciascun esempio: situazione, cosa hai fatto, risultato con numeri. Per l'AI: come hai verificato l'output, un errore intercettato, un caso in cui hai scelto di non usarla. Resta salvato solo in questo browser.</p>
      ${[0,1,2,3,4].map(i=>`<label>${i<3?'AI · esempio '+(i+1):'Adattamento al cambiamento · esempio '+(i-2)}<textarea class="eyex" data-i="${i}" rows="4" placeholder="Situazione · cosa ho fatto · cosa ho verificato o corretto · risultato">${esc(ex[i]&&ex[i].t||'')}</textarea></label>`).join('')}
      <p class="small muted" id="ey-saved"></p>
    </section>`; }
  app().innerHTML=header(A.name,A.sub)+`<main class="wrap stack">${body}${footer()}</main>`;
  bindNav(); bindSecButtons();
  const rv=$('#go-review'); if(rv) rv.onclick=()=>startSession('review',{sec:'verbal',n:20});
  const iv=$('#go-iv'); if(iv) iv.onclick=()=>renderInterview();
  document.querySelectorAll('.eyex').forEach(t=>t.oninput=()=>{ DB.eyExamples=DB.eyExamples||[{},{},{},{},{}]; DB.eyExamples[+t.dataset.i]={t:t.value}; saveDB(); $('#ey-saved').textContent='Salvato.'; });
}
function renderSims(){
  const lastA=DB.sessions.find(x=>x.kind==='full'), lastB=DB.sessions.find(x=>x.kind==='eyfull');
  app().innerHTML=header('Simulazioni','Prove complete a tempo, nei due formati più comuni.')+`
  <main class="wrap stack">
    <section class="hero">
      <button class="card primary-card" id="go-full"><span class="eyebrow">Formato concorso</span><b>Verbale → numerico → astratto, di fila</b><span class="spec mono">20 dom. · 35:00 → 10 dom. · 20:00 → 10 dom. · 10:00</span><span class="muted">Esito con soglie: verbale 10/20, numerico + astratto 10/20 combinati (formato dei concorsi UE).</span>${lastA?`<span class="muted small">Ultima: ${fmtD(lastA.date)}</span>`:''}</button>
      <button class="card primary-card" id="go-online"><span class="eyebrow">Formato assessment online</span><b>Quattro attività brevi, con pausa facoltativa tra una e l'altra</b><span class="spec mono">16 dom. · 10:00 → 13 · 08:00 → 10 · 08:00 → 10 · 12:00</span><span class="muted">Test misto, logica con figure, situazioni di lavoro, uso dell'AI (formato tipico delle selezioni aziendali).</span>${lastB?`<span class="muted small">Ultima: ${fmtD(lastB.date)} · ${lastB.parts.map(p=>`${SEC[p.sec].it} ${p.score}/${p.n}`).join(' · ')}</span>`:''}</button>
    </section>
    <section class="row wrap-gap"><button id="go-drill">Pratica breve: 5 domande per prova</button><button data-nav="stats">Statistiche</button></section>
    <section class="panel stack"><h2>Regole pratiche</h2><ul>
      <li>Nei test online il timer di solito non si ferma dentro un'attività: fai le pause solo tra una e l'altra.</li>
      <li>Carta e penna pronte; se una domanda ti blocca, scegli e vai avanti.</li>
      <li>Queste simulazioni usano domande originali generate al momento: allenano formato e tempi, non anticipano le domande reali.</li>
      <li>Nei test veri non usare aiuti esterni se il regolamento li vieta.</li></ul></section>
    ${footer()}
  </main>`;
  bindNav();
  $('#go-full').onclick=()=>startSession('full',{});
  $('#go-online').onclick=startEYFull;
  $('#go-drill').onclick=()=>{ S=null; startDrill(); };
}
function renderTools(){
  app().innerHTML=header('Strumenti','Metodo, esercizi dal tuo manuale in PDF, foglio risposte per test su carta.')+`
  <main class="wrap stack"><div class="cards3">
    <div class="card"><span class="eyebrow">Metodo</span><b>Guida alle prove</b><span class="muted small">Tipi di domanda, trappole, formule, gestione del tempo.</span><div class="row"><button class="primary" data-nav="method">Apri</button></div></div>
    <div class="card"><span class="eyebrow">Manuale</span><b>Il tuo PDF, con correzione</b><span class="muted small">Apri un manuale dal computer: soluzioni coperte, correzione automatica, simulazione a tempo. Il file resta nel browser.</span><div class="row"><button class="primary" data-nav="manual">Apri</button></div></div>
    <div class="card"><span class="eyebrow">Foglio risposte</span><b>Test su carta o altri siti</b><span class="muted small">Cronometro e griglia A-E; poi inserisci le soluzioni e ottieni punteggio e tempi.</span><div class="row"><button class="primary" data-nav="sheet">Apri</button></div></div>
  </div>${footer()}</main>`;
  bindNav();
}
function startEYFull(){
  EY_HARD_SET=null; EY_HARD_ONLY='';
  const parts=['mind','crit','adapt','aipro'].map(sec=>({sec,items:buildEY(sec,SEC[sec].n),ans:{},flag:{},ms:{},changes:{},cur:0,timed:true,seconds:SEC[sec].sec,started:null,ended:null,deadline:null}));
  S={kind:'eyfull',parts,pi:0,created:Date.now(),done:false}; renderIntro();
}

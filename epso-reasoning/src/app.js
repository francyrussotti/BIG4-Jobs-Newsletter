// ---------- configuration from the notice EPSO/AD/427/26 ----------
const FMT=it=>it.fmt||it.sec;
const SEC={
  verbal:{name:'Verbal reasoning',it:'Ragionamento verbale',n:20,sec:35*60,letters:4},
  numerical:{name:'Numerical reasoning',it:'Ragionamento numerico',n:10,sec:20*60,letters:5},
  abstract:{name:'Abstract reasoning',it:'Ragionamento astratto',n:10,sec:10*60,letters:5},
  mind:{name:'MIND',it:'EY · MIND',n:16,sec:10*60,letters:5,ey:true},
  crit:{name:'Basic critical thinking',it:'EY · Critical thinking',n:13,sec:8*60,letters:5,ey:true},
  adapt:{name:'Adaptability',it:'EY · Adaptability',n:10,sec:8*60,letters:4,ey:true},
  aipro:{name:'AI proficiency',it:'EY · AI proficiency',n:10,sec:12*60,letters:4,ey:true}
};
const PASS={verbal:10,numabs:10};
const KEY='epsoAD5reasoning:v1';

// ---------- storage ----------
function loadDB(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.sessions)return v}catch(e){}return {sessions:[],seen:{},vwrong:{}}}
function saveDB(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}}
let DB=loadDB();

const $=s=>document.querySelector(s);
const app=()=>document.getElementById('app');
const fmtT=s=>{s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const fmtD=d=>new Date(d).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'});

// ---------- session building ----------
function pickVerbal(n,onlyWrong){
  let srcs=verbalSources();
  if(onlyWrong){ srcs=srcs.filter(s=>DB.vwrong[s.pid]); if(!srcs.length) return null; }
  srcs=R.shuffle(srcs).sort((a,b)=>(DB.seen[a.pid]||0)-(DB.seen[b.pid]||0));
  return srcs.slice(0,Math.min(n,srcs.length)).map(buildVerbalItem);
}
function pickNumerical(n){
  const keys=R.shuffle(Object.keys(NUM_T)); const out=[];
  for(let i=0;i<n;i++){ let it=null,g=0; while(!it&&g++<5){ try{ it=buildNumericalItem(keys[i%keys.length]); if(!it.options) it=null; }catch(e){ it=null } } out.push(it||buildNumericalItem('pct')); }
  return R.shuffle(out);
}
function pickAbstract(n){ const out=[]; for(let i=0;i<n;i++) out.push(buildAbstractItem(i>=Math.round(n*0.4))); return out; }
function buildSection(sec,n,onlyWrong){
  if(SEC[sec]&&SEC[sec].ey) return buildEY(sec,n);
  if(sec==='verbal') return pickVerbal(n,onlyWrong);
  if(sec==='numerical') return pickNumerical(n);
  return pickAbstract(n);
}

let S=null, TIMER=null;

function startSession(kind,opts){
  // kind: 'full' | 'single' | 'practice' | 'review'
  const secs = kind==='full' ? ['verbal','numerical','abstract'] : [opts.sec];
  const parts=[];
  for(const sec of secs){
    const n = opts.n || SEC[sec].n;
    const items=buildSection(sec,n,kind==='review');
    if(!items||!items.length){ renderHome('Nessuna domanda verbale sbagliata da ripassare per ora.'); return; }
    parts.push({sec,items,ans:{},flag:{},ms:{},changes:{},cur:0,timed:kind!=='practice'&&kind!=='review',seconds:Math.round(SEC[sec].sec*items.length/SEC[sec].n),started:null,ended:null,deadline:null});
  }
  S={kind,parts,pi:0,created:Date.now(),done:false};
  renderIntro();
}

function beginPart(){
  CALC.open=false;
  const P=S.parts[S.pi]; P.started=Date.now(); P.last=Date.now(); if(P.timed) P.deadline=Date.now()+P.seconds*1000;
  clearInterval(TIMER); TIMER=setInterval(tick,250); renderTest();
}
function account(){ const P=S&&S.parts[S.pi]; if(!P||!P.started||P.ended) return; const now=Date.now(), it=P.items[P.cur]; P.ms[P.cur]=(P.ms[P.cur]||0)+(now-P.last); P.last=now; }
function tick(){
  const P=S&&S.parts[S.pi]; if(!P||!P.started||P.ended) return; account();
  const el=$('#clock'); if(!el) return;
  if(P.timed){ const left=(P.deadline-Date.now())/1000; el.textContent=fmtT(left); el.classList.toggle('low',left<=Math.min(300,P.seconds*0.15));
    const pc=$('#pace'); if(pc){ const per=P.seconds/P.items.length, ideal=Math.min(P.items.length,Math.floor((P.seconds-left)/per)); const done=Object.keys(P.ans).length; pc.textContent=`${done}/${P.items.length} risposte · ritmo ${done>=ideal?'in linea':'in ritardo'} · obiettivo ${fmtT(per)} a domanda`; }
    if(left<=0) endPart(true);
  } else el.textContent=fmtT((Date.now()-P.started)/1000);
}
function go(i){ const P=S.parts[S.pi]; if(i<0||i>=P.items.length) return; account(); P.cur=i; renderTest(); }
function choose(c){ const P=S.parts[S.pi]; if(!P.timed&&P.ans[P.cur]!==undefined) return; const prev=P.ans[P.cur]; if(prev!==undefined&&prev!==c) P.changes[P.cur]=(P.changes[P.cur]||0)+1; P.ans[P.cur]=c; renderTest(); }
function endPart(auto){
  const P=S.parts[S.pi]; if(P.ended) return; account(); P.ended=Date.now(); P.auto=!!auto; clearInterval(TIMER);
  if(S.pi<S.parts.length-1){ S.pi++; renderIntro(); } else finishSession();
}

function scorePart(P){ return P.items.reduce((s,it,i)=>s+(P.ans[i]===it.key?1:0),0); }
function tagOf(P,i){
  const it=P.items[i], a=P.ans[i];
  if(FMT(it)==='verbal') return a===undefined?'blank':(a===it.key?'ok':verbalTrap(it,a));
  if(FMT(it)==='numerical') return it.tpl;
  return it.rules.join('+');
}
function finishSession(){
  S.done=true; clearInterval(TIMER);
  const rec={id:Date.now(),date:S.created,kind:S.kind,parts:[]};
  S.parts.forEach(P=>{
    const att=P.items.map((it,i)=>{
      const a=P.ans[i], ok=a===it.key;
      const r={sec:it.sec,id:it.id,ok,ans:a===undefined?null:a,key:it.key,ms:Math.round(P.ms[i]||0),ch:P.changes[i]||0,fl:!!P.flag[i]};
      r.snap=FMT(it)==='verbal'?{q:it.question,o:it.options.map(o=>o.text),k:it.options.map(o=>o.kind),w:it.options.map(o=>o.why),qt:it.q}:FMT(it)==='numerical'?{q:it.question,stim:it.stim,o:it.options.map(o=>o.label),ex:it.explain,tip:it.tip||''}:{s:it.series,o:it.options.map(o=>o.frame),ex:it.explain};
      if(FMT(it)==='verbal'){ r.q=it.q; r.trap=ok||a===undefined?null:verbalTrap(it,a); r.kind=a===undefined?null:it.options[a].kind;
        DB.seen[it.id]=(DB.seen[it.id]||0)+1; if(ok) delete DB.vwrong[it.id]; else DB.vwrong[it.id]=1; }
      if(FMT(it)==='numerical'){ r.tpl=it.tpl; r.slip=ok||a===undefined?null:(it.options[a].why||''); }
      if(FMT(it)==='abstract'){ r.rules=it.rules; r.broken=ok||a===undefined?null:it.options[a].broken; r.hard=it.hard; }
      return r;});
    rec.parts.push({sec:P.sec,n:P.items.length,score:scorePart(P),secs:Math.round((P.ended-P.started)/1000),limit:P.timed?P.seconds:null,auto:!!P.auto,att});
  });
  DB.sessions.unshift(rec); DB.sessions=DB.sessions.slice(0,300);
  DB.sessions.forEach((s,i)=>{ if(i>=40) s.parts.forEach(p=>(p.att||[]).forEach(x=>{ delete x.snap; })); });
  saveDB();
  S.rec=rec; renderResults(); window.scrollTo(0,0);
}

// ---------- verdict per notice ----------
function verdict(rec){
  const g=s=>rec.parts.find(p=>p.sec===s);
  const v=g('verbal'), n=g('numerical'), a=g('abstract'); const out=[];
  if(v&&v.n===20) out.push({label:'Verbale',score:`${v.score}/20`,pass:v.score>=PASS.verbal,rule:'soglia 10/20'});
  if(n&&a&&n.n===10&&a.n===10) out.push({label:'Numerico + astratto',score:`${n.score+a.score}/20`,pass:n.score+a.score>=PASS.numabs,rule:'soglia combinata 10/20'});
  return out;
}


// ---------- study plan (from the user's plan, 4-13 Nov 2026) ----------
const PLAN=[
 {d:'2026-11-04',t:'Mer 4 nov',h:'1 h',todo:['Scegli un solo banco di quiz in inglese per il verbale.','Se hai tempo: una prova a tempo per tipo di test, per misurare la partenza.'],act:['single:verbal','single:numerical','single:abstract']},
 {d:'2026-11-05',t:'Gio 5 nov (pomeriggio)',h:'4 h',todo:['Diagnosi senza libro. Verbale: 20 domande / 35:00, poi 45 min di analisi errori (testo letto male, tempo, formulazione).','Numerico: 10 / 20:00 + analisi. Astratto: 10 / 10:00 + analisi.','Ultimi 30 min: riepilogo errori in Statistiche e scelta del punto debole.'],act:['single:verbal','single:numerical','single:abstract','stats']},
 {d:'2026-11-06',t:'Ven 6 nov',h:'5 h',warn:'Ultimo giorno per il controllo tecnico su TAO: entro le 11:59, ora di Bruxelles.',todo:['Controllo tecnico TAO.','Numerico e astratto sul manuale: usa il foglio risposte per tempi e punteggio.','Verbale qui, in inglese (non sul manuale in italiano).'],act:['sheet','single:verbal','practice:numerical','practice:abstract']},
 {d:'2026-11-07',t:'Sab 7 nov',h:'5 h',todo:['Verbale 2 h: una simulazione a tempo + analisi.','Numerico 1,5 h.','Astratto 1 h.','30 min di riepilogo errori.'],act:['single:verbal','single:numerical','single:abstract','stats']},
 {d:'2026-11-08',t:'Dom 8 nov',h:'5 h',dyn:true},
 {d:'2026-11-09',t:'Lun 9 nov',h:'5 h',dyn:true},
 {d:'2026-11-10',t:'Mar 10 nov',h:'5 h',dyn:true},
 {d:'2026-11-11',t:'Mer 11 nov',h:'3 h',todo:['Prova generale alle 11:00, stesse condizioni di venerdì (stanza, connessione, orario): le tre prove di fila.','Analisi errori; il resto del tempo libero.'],act:['full','stats']},
 {d:'2026-11-12',t:'Gio 12 nov',h:'1-2 h',todo:['Solo ripasso degli errori ricorrenti. Niente materiale nuovo né simulazioni complete.','Controlla l\'account EPSO, prepara documento d\'identità e postazione, dormi presto.'],act:['review','stats']},
 {d:'2026-11-13',t:'Ven 13 nov',h:'–',todo:['Nessun ripasso la mattina. Collegati con margine prima delle 11:00 seguendo le istruzioni TAO.'],act:[]}
];
const ACT_LABEL={'single:verbal':'Verbale a tempo','single:numerical':'Numerico a tempo','single:abstract':'Astratto a tempo','practice:numerical':'Pratica numerico','practice:abstract':'Pratica astratto','practice:verbal':'Pratica verbale',full:'Simulazione completa',review:'Ripassa errori verbali',stats:'Statistiche',sheet:'Foglio risposte (manuale)'};
function todayISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function latestPart(sec){for(const s of DB.sessions){if(s.kind!=='full'&&s.kind!=='single')continue;const p=s.parts.find(x=>x.sec===sec&&x.n===SEC[sec].n);if(p)return p}return null}
function diagnosis(){
  const v=latestPart('verbal'),n=latestPart('numerical'),a=latestPart('abstract');
  if(!n||!a) return 'Prima fai la diagnosi: una prova a tempo di numerico e una di astratto.';
  const c=n.score+a.score;
  if(c>=10) return `Numerico + astratto sono sopra il 50% combinato (${c}/20 nell'ultima misura): sposta il tempo sul verbale.`;
  const weak=n.score<=a.score?'numerico':'astratto';
  return `Numerico + astratto sotto il 50% combinato (${c}/20): dividi il tempo tra verbale e ${weak}, il più debole dei due.`+(v?` Ultimo verbale: ${v.score}/20.`:'');
}
function planDay(day){
  if(!day.dyn) return day;
  return Object.assign({},day,{todo:['Ore divise in base alla diagnosi. '+diagnosis(),'Almeno una simulazione completa a tempo di un test, poi analisi degli errori.','Non ripetere gli stessi quiz: capisci l\'errore. Usa il ripasso solo per gli errori.'],act:['single:verbal','single:numerical','single:abstract','review','stats']});
}
function planPanel(){
  const t=todayISO(); let i=PLAN.findIndex(x=>x.d===t);
  let note='';
  if(i<0){ if(t<PLAN[0].d){i=0;note='Il piano inizia il 4 novembre.'} else {i=PLAN.length-1;note='Il piano è terminato.'} }
  const day=planDay(PLAN[i]); DB.plan=DB.plan||{}; const done=DB.plan[day.d]||{};
  return `<div class="panel stack"><div class="row spread"><h2>Piano di oggi · ${esc(day.t)}</h2><span class="mono muted">${esc(day.h)}</span></div>
    ${note?`<p class="muted small">${note}</p>`:''}${day.warn?`<p class="alert"><b>${esc(day.warn)}</b></p>`:''}
    <ul class="checks">${day.todo.map((x,k)=>`<li><label class="chk"><input type="checkbox" data-plan="${day.d}:${k}" ${done[k]?'checked':''}><span>${esc(x)}</span></label></li>`).join('')}</ul>
    ${day.act.length?`<div class="row wrap-gap">${day.act.map(a=>`<button data-act="${a}">${ACT_LABEL[a]}</button>`).join('')}</div>`:''}
    <details><summary>Tutto il piano</summary><div class="tblwrap"><table class="times"><tbody>${PLAN.map(x=>{const y=planDay(x);return `<tr class="${x.d===day.d?'today':''}"><td><b>${esc(y.t)}</b><br><span class="muted small">${esc(y.h)}</span></td><td>${y.todo.map(esc).join('<br>')}</td></tr>`}).join('')}</tbody></table></div></details>
  </div>`;
}
function bindPlan(){
  document.querySelectorAll('[data-plan]').forEach(c=>c.onchange=()=>{const [d,k]=c.dataset.plan.split(':');DB.plan=DB.plan||{};DB.plan[d]=DB.plan[d]||{};DB.plan[d][k]=c.checked;saveDB();});
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const a=b.dataset.act;
    if(a==='full') return startSession('full',{}); if(a==='review') return startSession('review',{sec:'verbal',n:20});
    if(a==='stats') return renderStats(); if(a==='sheet') return renderSheetSetup();
    const [k,sec]=a.split(':'); startSession(k,{sec,n:k==='practice'?10:undefined});});
}

// ---------- rendering ----------
function header(title,sub){ return `<header class="top"><div class="in"><div><div class="eyebrow">EPSO/AD/427/26 · Reasoning</div><h1>${title}</h1>${sub?`<p class="muted">${sub}</p>`:''}</div><nav class="row"><button class="ghost" data-nav="home">Inizio</button><button class="ghost" data-nav="method">Metodo</button><button class="ghost" data-nav="manual">Manuale</button><button class="ghost" data-nav="errors">Errori</button><button class="ghost" data-nav="ey">Test EY</button><button class="ghost" data-nav="mental">Calcolo rapido</button><button class="ghost" data-nav="stats">Statistiche</button><button class="ghost" data-nav="sheet">Foglio risposte</button></nav></div></header>`; }
function bindNav(){ document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{ if(S&&!S.done&&S.parts[S.pi].started){ if(!confirmLeave()) return; } S=null; clearInterval(TIMER); if(SH&&SH.phase==='run'&&!b.closest('.bar')){} SH=SH&&SH.phase==='run'?null:SH; if(MAN&&MAN.run&&b.dataset.nav!=='manual'){ MAN.run=null; } ({home:renderHome,stats:renderStats,sheet:renderSheetSetup,method:renderMethod,manual:renderManual,errors:renderErrors,ey:renderEY,mental:renderMental})[b.dataset.nav](); }); }
let leaveArmed=false;
function confirmLeave(){ if(leaveArmed){leaveArmed=false;return true} leaveArmed=true; toast('Prova in corso: premi di nuovo per uscire senza salvare.'); setTimeout(()=>leaveArmed=false,4000); return false; }
function toast(t){ let el=$('#toast'); if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)} el.textContent=t; el.className='show'; clearTimeout(el._t); el._t=setTimeout(()=>el.className='',3500); }

function renderHome(msg){
  S=null; clearInterval(TIMER);
  const last=DB.sessions.find(s=>s.kind==='full');
  const vw=Object.keys(DB.vwrong).length, vt=verbalSources().length, vs=verbalSources().filter(s=>DB.seen[s.pid]).length;
  app().innerHTML=header('Allenamento reasoning','Verbale, numerico e astratto con tempi, soglie e formato della prova.')+`
  <main class="wrap stack">
    ${msg?`<p class="alert">${esc(msg)}</p>`:''}
    ${planPanel()}
    ${weakPanel(true)}
    <section class="hero">
      <button class="card primary-card" id="go-full">
        <span class="eyebrow">Simulazione completa</span>
        <b>Le tre prove in sequenza, come all'esame</b>
        <span class="spec mono">20 dom. · 35:00 → 10 dom. · 20:00 → 10 dom. · 10:00</span>
        <span class="muted">Esito con le soglie del bando: verbale 10/20, numerico + astratto 10/20 combinati.</span>
      </button>
      <div class="cards3">
        ${['verbal','numerical','abstract'].map(s=>`<div class="card"><span class="eyebrow">${SEC[s].it}</span><b>${SEC[s].n} domande · ${fmtT(SEC[s].sec)}</b>
          <span class="muted">${s==='verbal'?`Brano + 4 affermazioni, una sola giusta. ${vs}/${vt} brani visti.`:s==='numerical'?'Tabelle e grafici, 5 opzioni, calcolatrice a schermo. Domande sempre nuove.':'Serie di 5 figure, scegli la sesta tra 5. Domande sempre nuove.'}</span>
          <div class="row"><button class="primary" data-single="${s}">Prova a tempo</button><button data-practice="${s}">Pratica</button></div></div>`).join('')}
      </div>
    </section>
    <section class="row wrap-gap">
      <button id="go-review" ${vw?'':'disabled'}>Ripassa errori verbali (${vw})</button>
      <button id="go-drill">Pratica breve: 5 per prova</button>
      <button id="go-method">Leggi il metodo (prima volta: 15 minuti)</button>
      <button data-nav="ey">Test EY (Maki)</button>
      <button data-nav="mental">Calcolo rapido</button>
    </section>
    <section class="panel stack"><h2>Ultima simulazione completa</h2>${last?resultLines(last):'<p class="muted">Ancora nessuna. La prova generale del piano è mercoledì 11 alle 11:00.</p>'}</section>
    ${footer()}
  </main>`;
  bindNav();
  $('#go-full').onclick=()=>startSession('full',{});
  document.querySelectorAll('[data-single]').forEach(b=>b.onclick=()=>startSession('single',{sec:b.dataset.single}));
  document.querySelectorAll('[data-practice]').forEach(b=>b.onclick=()=>startSession('practice',{sec:b.dataset.practice,n:b.dataset.practice==='verbal'?10:10}));
  const rv=$('#go-review'); if(rv) rv.onclick=()=>startSession('review',{sec:'verbal',n:20});
  $('#go-drill').onclick=()=>{ S=null; startDrill(); };
  $('#go-method').onclick=()=>renderMethod();
  bindPlan(); bindFocus();
}
function startDrill(){
  const parts=['verbal','numerical','abstract'].map(sec=>({sec,items:buildSection(sec,5),ans:{},flag:{},ms:{},changes:{},cur:0,timed:false,seconds:0}));
  S={kind:'practice',parts,pi:0,created:Date.now(),done:false}; renderIntro();
}

function resultLines(rec){
  const v=verdict(rec);
  return `<p class="muted">${fmtD(rec.date)}</p><div class="verdicts">${v.map(x=>`<div class="vd ${x.pass?'ok':'bad'}"><span>${x.label}</span><b class="mono">${x.score}</b><span class="pill ${x.pass?'ok':'bad'}">${x.pass?'Superata':'Non superata'}</span><span class="muted small">${x.rule}</span></div>`).join('')}</div>`;
}

function renderIntro(){
  const P=S.parts[S.pi], c=SEC[P.sec];
  const tips={
    verbal:['Leggi prima la domanda: cerca l\'affermazione <b>correct</b> o <b>incorrect</b>? Alcune domande vanno completate ("According to the passage, …", "Why…?"): vale la stessa regola, conta solo il testo.','Poi le 4 opzioni, poi il brano cercando solo ciò che serve.','Vale solo ciò che il testo dice o implica: niente conoscenze esterne.','Attento a some/most/all, may/will, "dopo" vs "a causa di".'],
    numerical:['Leggi la domanda prima della tabella: individua righe, colonne e unità.','Stima prima di calcolare: spesso le opzioni sono abbastanza distanti.','Usa la calcolatrice a schermo (pulsante in alto), come all\'esame.','Percentuali: la base è il valore di partenza. Punti percentuali ≠ %.'],
    abstract:['Isola un elemento alla volta: forma, riempimento, lancetta, punti, quadratino, settori, caselle, lati.','Se una regola non torna tra figure vicine, prova a coppie: 1 + 2 = 3 e 4 + 5 = 6 (sovrapposizione).','Controlla il passo tra ogni coppia di figure, non solo tra la prima e l\'ultima.','Elimina le opzioni che violano anche una sola regola.','Un minuto a domanda: se dopo 60 secondi non vedi la regola, segna e passa oltre.']
  }[P.sec]||EY_TIPS[P.sec]||[];
  app().innerHTML=header(c.it,S.kind==='full'?`Prova ${S.pi+1} di 3`:S.kind==='eyfull'?`Simulazione EY · attività ${S.pi+1} di 4 · puoi fare una pausa prima di iniziare`:S.kind==='focus'?`Allenamento mirato · parte ${S.pi+1} di 3 · domande scelte sui tuoi errori`:(P.timed?'Prova a tempo':'Pratica con correzione immediata'))+`
  <main class="wrap stack narrow">
    <div class="panel stack">
      <div class="row spread"><h2>${c.name}</h2><span class="mono big2">${P.items.length} dom.${P.timed?' · '+fmtT(P.seconds):''}</span></div>
      <ul class="tips">${tips.map(t=>`<li>${t}</li>`).join('')}</ul>
      ${P.timed?'<p class="muted small">Puoi muoverti avanti e indietro e segnare le domande. Allo scadere la prova si chiude da sola. Nessuna penalità per le risposte sbagliate: rispondi sempre.</p>':'<p class="muted small">Dopo ogni risposta vedi subito la soluzione.</p>'}
      <div class="row"><button class="primary" id="begin">Inizia</button><button class="ghost" id="howto">Rileggi il metodo</button></div>
    </div>
  </main>`;
  bindNav(); $('#begin').onclick=beginPart; $('#howto').onclick=()=>{ const sec=P.sec; S=null; renderMethod(sec); };
}

function renderStim(it){
  if(FMT(it)==='verbal') return `<article class="panel passage-panel"><div class="eyebrow">Text</div>${it.title?`<h3 class="ptitle">${esc(it.title)}</h3>`:''}<p class="passage">${esc(it.text)}</p>${it.source?`<p class="src">Source: ${esc(it.source.act)}, recital ${it.source.recital}. © European Union, EUR-Lex.</p>`:''}</article>`;
  if(FMT(it)==='numerical') return it.stim?`<article class="panel stim">${it.stim}</article>`:'';
  if(it.odd) return '';
  return `<article class="panel stim"><div class="eyebrow">Which figure comes next in the series?</div><div class="series">${it.series.map((f,i)=>frameSVG(f,'figura '+(i+1))).join('')}<div class="qmark">?</div></div></article>`;
}
function optionHTML(it,i,P,reveal){
  const a=P.ans[P.cur]; let c='opt'; if(a===i) c+=' sel';
  if(reveal){ if(i===it.key) c+=' right'; else if(a===i) c+=' wrong'; }
  const L=LETTERS[i];
  if(FMT(it)==='abstract') return `<button class="${c} figopt" data-c="${i}" aria-label="Opzione ${L}"><span class="ltr">${L}</span>${frameSVG(it.options[i].frame,'opzione '+L)}</button>`;
  const lab=FMT(it)==='verbal'?it.options[i].text:it.options[i].label;
  return `<button class="${c}" data-c="${i}"><span class="ltr">${L}</span><span class="otext${FMT(it)==='numerical'?' mono':''}">${esc(lab)}</span></button>`;
}
function feedbackHTML(it,a){
  const ok=a===it.key;
  if(FMT(it)==='verbal'){
    return `<div class="fb ${ok?'ok':'bad'}"><b>${ok?'Corretto.':'Sbagliato: la risposta è '+LETTERS[it.key]+'.'}</b>${it.options.map((o,i)=>`<p><span class="mono">${LETTERS[i]}</span> <span class="kind k-${o.kind}">${{true:'Vera',false:'Falsa',cannot:'Non deducibile'}[o.kind]}</span> ${esc(o.why)}</p>`).join('')}${!ok&&a!==undefined?`<p class="small muted">Trappola: ${esc(TRAPS[verbalTrap(it,a)]||'')}</p>`:''}${coachTip(it,a)}</div>`;
  }
  if(FMT(it)==='numerical'){
    const w=a!==undefined&&!ok?it.options[a].why:null;
    return `<div class="fb ${ok?'ok':'bad'}"><b>${ok?'Corretto.':'Sbagliato: la risposta è '+LETTERS[it.key]+'.'}</b><p>${esc(it.explain)}</p>${w?`<p class="small muted">La tua opzione corrisponde a: ${esc(w)}.</p>`:''}${coachTip(it,a)}</div>`;
  }
  const br=a!==undefined&&!ok?it.options[a].broken:[];
  return `<div class="fb ${ok?'ok':'bad'}"><b>${ok?'Corretto.':'Sbagliato: la risposta è '+LETTERS[it.key]+'.'}</b><p>${esc(it.explain)}</p>${br.length?`<p class="small muted">La tua opzione viola: ${br.map(r=>AB_RULES[r].label.toLowerCase()).join(', ')}.</p>`:''}${coachTip(it,a)}</div>`;
}

function renderTest(){
  const P=S.parts[S.pi], it=P.items[P.cur], a=P.ans[P.cur], reveal=!P.timed&&a!==undefined, c=SEC[P.sec];
  app().innerHTML=`
  <div class="bar"><div class="in">
    <div class="row"><span class="secname">${c.it}</span><span class="clock mono" id="clock">--:--</span><span class="pace small muted" id="pace">${P.timed?'':'Pratica · tempo trascorso'}</span></div>
    <div class="row">${P.sec==='numerical'?'<button class="ghost" id="calc-t">Calcolatrice</button>':''}<button class="primary" id="end">${(S.kind==='full'&&S.pi<2)||(S.kind==='eyfull'&&S.pi<3)?'Consegna e passa alla prova successiva':'Consegna'}</button></div>
  </div></div>
  <main class="wrap">
    <div class="qgrid" aria-label="Domande">${P.items.map((x,i)=>{let k='cell'; if(i===P.cur)k+=' cur'; if(P.ans[i]!==undefined) k+= !P.timed?(P.ans[i]===x.key?' r-ok':' r-bad'):' ans'; if(P.flag[i])k+=' flag'; return `<button class="${k}" data-go="${i}">${i+1}</button>`}).join('')}</div>
    <div class="split ${(FMT(it)==='numerical'&&!it.stim)||it.odd?'abstract':P.sec}">
      ${renderStim(it)}
      <section class="panel qpanel stack">
        <div class="row spread"><span class="eyebrow">Question ${P.cur+1} of ${P.items.length}</span>${P.timed?`<button class="ghost small" id="flag">${P.flag[P.cur]?'Togli segno':'Segna'}</button>`:''}</div>
        <p class="qtext">${esc(FMT(it)==='verbal'?it.question:FMT(it)==='numerical'?it.question:(it.question||'Select the figure that completes the series.'))}</p>
        <div class="opts ${FMT(it)==='abstract'?'figs':''}">${it.options.map((_,i)=>optionHTML(it,i,P,reveal)).join('')}</div>
        ${reveal?feedbackHTML(it,a):''}
        <div class="row spread"><button id="prev" ${P.cur===0?'disabled':''}>← Precedente</button>${P.cur<P.items.length-1?'<button id="next">Successiva →</button>':`<button class="primary" id="end2">Consegna</button>`}</div>
        <p class="small muted">Tastiera: ${c.letters===4?'A–D':'A–E'} o 1–${c.letters} per rispondere · ← → per spostarti${P.timed?' · F per segnare':''}</p>
      </section>
    </div>
    <div id="calc" class="calc panel" hidden></div>
    <div id="confirm" class="panel stack" hidden><p><b>Consegnare questa prova?</b> <span id="cmsg"></span></p><div class="row"><button class="primary" id="yes">Consegna</button><button id="no">Continua</button></div></div>
  </main>`;
  tick();
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(+b.dataset.go));
  document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>choose(+b.dataset.c));
  if($('#prev')) $('#prev').onclick=()=>go(P.cur-1);
  if($('#next')) $('#next').onclick=()=>go(P.cur+1);
  if($('#flag')) $('#flag').onclick=()=>{P.flag[P.cur]=!P.flag[P.cur];renderTest()};
  const ask=()=>{const blank=P.items.length-Object.keys(P.ans).length, fl=Object.values(P.flag).filter(Boolean).length; $('#cmsg').textContent=(blank?blank+' senza risposta. ':'Tutte risposte. ')+(fl?fl+' segnate.':''); $('#confirm').hidden=false; $('#confirm').scrollIntoView({block:'nearest'})};
  $('#end').onclick=ask; if($('#end2')) $('#end2').onclick=ask;
  $('#yes').onclick=()=>endPart(false); $('#no').onclick=()=>{$('#confirm').hidden=true};
  if($('#calc-t')) $('#calc-t').onclick=()=>toggleCalc();
  if(CALC.open&&P.sec==='numerical') toggleCalc(true);
}

// ---------- on-screen calculator ----------
const CALC={open:false,expr:'',out:'0'};
function toggleCalc(keep){
  const el=$('#calc'); if(!el) return; if(!keep) CALC.open=!CALC.open; el.hidden=!CALC.open; if(!CALC.open) return;
  const keys=['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','%','+','C','⌫','(',')','='];
  el.innerHTML=`<div class="row spread"><span class="eyebrow">Calcolatrice</span><button class="ghost small" id="calc-x">Chiudi</button></div><div class="cdisp mono"><div class="cexpr">${esc(CALC.expr||' ')}</div><div class="cout">${esc(CALC.out)}</div></div><div class="ckeys">${keys.map(k=>`<button data-k="${k}" class="${k==='='?'primary':''}">${k}</button>`).join('')}</div>`;
  el.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>calcKey(b.dataset.k)); $('#calc-x').onclick=()=>toggleCalc();
}
function calcKey(k){
  if(k==='C'){CALC.expr='';CALC.out='0'} else if(k==='⌫'){CALC.expr=CALC.expr.slice(0,-1)} else if(k==='='){CALC.out=calcEval(CALC.expr)} else CALC.expr+=k;
  toggleCalc(true);
}
function calcEval(e){
  const s=e.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');
  if(!/^[0-9+\-*/().\s]*$/.test(s)||!s.trim()) return 'Errore';
  try{ const v=Function('"use strict";return ('+s+')')(); return isFinite(v)?String(+v.toPrecision(12)):'Errore'; }catch(x){ return 'Errore'; }
}

// ---------- results ----------
function renderResults(){
  const rec=S.rec, v=verdict(rec);
  app().innerHTML=header('Risultati',fmtD(rec.date)+' · '+({full:'Simulazione completa',single:'Prova a tempo',practice:'Pratica',review:'Ripasso errori',focus:'Allenamento mirato',eyfull:'Simulazione EY'}[rec.kind]))+`
  <main class="wrap stack">
    ${v.length?`<section class="verdicts big">${v.map(x=>`<div class="vd ${x.pass?'ok':'bad'}"><span>${x.label}</span><b class="mono">${x.score}</b><span class="pill ${x.pass?'ok':'bad'}">${x.pass?'Superata':'Non superata'}</span><span class="muted small">${x.rule}</span></div>`).join('')}</section>`:''}
    ${rec.parts.map((p,pi)=>partResult(p,S.parts[pi],pi)).join('')}
    ${weakPanel(false)}
    <div class="row"><button class="primary" data-nav="errors">Rivedi la spiegazione di tutti i tuoi errori</button></div>
    <section class="panel stack"><h2>Esporta questa sessione</h2>${exportBlock(sessionCSV([rec]),'sessione')}</section>
    <div class="row"><button class="primary" data-nav="home">Torna all'inizio</button><button data-nav="stats">Statistiche</button></div>
    ${footer()}
  </main>`;
  bindNav(); bindExport(); bindFocus();
  document.querySelectorAll('[data-cause]').forEach(b=>b.onclick=()=>{const [pi,i,k]=b.dataset.cause.split(':');const a=S.rec.parts[+pi].att[+i];a.cause=a.cause===k?null:k;saveDB();b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('csel',x===b&&a.cause===k));});
}
const CAUSES={letto:'Testo letto male',tempo:'Tempo',form:'Formulazione',calcolo:'Calcolo',regola:'Regola non vista'};
function partResult(p,P,pi){
  const c=SEC[p.sec], budget=SEC[p.sec].sec/SEC[p.sec].n;
  let analysis='';
  if(SEC[p.sec]&&SEC[p.sec].ey){
    const by={}; p.att.forEach(x=>{const k=x.rules?'Figure':(EY_TPL[x.tpl]||(NUM_T[x.tpl]?'Tabelle':'Altro'));by[k]=by[k]||{n:0,ok:0};by[k].n++;if(x.ok)by[k].ok++});
    analysis=`<div class="stack"><h3>Per tipo di domanda</h3><ul class="bars">${Object.entries(by).map(([k,o])=>`<li><span>${esc(k)}</span><b class="mono">${o.ok}/${o.n}</b></li>`).join('')}</ul></div>`;
  } else if(p.sec==='verbal'){
    const cnt={}; p.att.forEach(a=>{if(a.trap)cnt[a.trap]=(cnt[a.trap]||0)+1});
    const kinds={cannot:0,false:0,true:0}; p.att.forEach(a=>{if(!a.ok&&a.kind)kinds[a.kind]++});
    analysis=`<div class="stack"><h3>Dove hai sbagliato</h3>${Object.keys(cnt).length?`<ul class="bars">${Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<li><span>${esc(TRAPS[k]||k)}</span><b class="mono">${n}</b></li>`).join('')}</ul>`:'<p class="muted">Nessun errore classificato.</p>'}
      <p class="small muted">Opzioni sbagliate scelte: ${kinds.cannot} non deducibili, ${kinds.false} false${kinds.true?', '+kinds.true+' vere (nelle domande "incorrect")':''}.</p></div>`;
  } else if(p.sec==='numerical'){
    const by={}; p.att.forEach(a=>{const k=a.tpl;by[k]=by[k]||{n:0,ok:0};by[k].n++;if(a.ok)by[k].ok++});
    const slips={}; p.att.forEach(a=>{if(a.slip)slips[a.slip]=(slips[a.slip]||0)+1});
    analysis=`<div class="stack"><h3>Per tipo di calcolo</h3><ul class="bars">${Object.entries(by).map(([k,o])=>`<li><span>${esc(NUM_T[k].label)}</span><b class="mono">${o.ok}/${o.n}</b></li>`).join('')}</ul>${Object.keys(slips).length?`<p class="small muted">Errori tipici: ${Object.entries(slips).map(([k,n])=>esc(k)+(n>1?' ×'+n:'')).join(' · ')}.</p>`:''}</div>`;
  } else {
    const br={}; p.att.forEach(a=>{(a.broken||[]).forEach(r=>br[r]=(br[r]||0)+1)});
    const hard=p.att.filter(a=>a.hard), easy=p.att.filter(a=>!a.hard);
    analysis=`<div class="stack"><h3>Regole mancate</h3>${Object.keys(br).length?`<ul class="bars">${Object.entries(br).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<li><span>${esc(AB_RULES[k].label)}</span><b class="mono">${n}</b></li>`).join('')}</ul>`:'<p class="muted">Nessuna regola mancata.</p>'}<p class="small muted">Domande più semplici: ${easy.filter(a=>a.ok).length}/${easy.length} · più difficili: ${hard.filter(a=>a.ok).length}/${hard.length}.</p></div>`;
  }
  const maxms=Math.max(...p.att.map(a=>a.ms),1);
  return `<section class="panel stack">
    <div class="row spread"><h2>${c.it}</h2><span class="mono big2">${p.score}/${p.n}</span></div>
    <p class="muted">Tempo usato ${fmtT(p.secs)}${p.limit?' su '+fmtT(p.limit):''}${p.auto?' · consegna automatica allo scadere':''} · ${p.att.filter(a=>a.ans===null).length} senza risposta · budget ${fmtT(budget)} a domanda</p>
    <div class="grid2">${analysis}
      <div class="stack"><h3>Tempo per domanda</h3><div class="tblwrap"><table class="times"><thead><tr><th>#</th><th>Esito</th><th>Tempo</th><th></th></tr></thead><tbody>${p.att.map((a,i)=>`<tr><td class="mono">${i+1}</td><td>${a.ans===null?'<span class="muted">vuota</span>':a.ok?'<span class="okc">✓</span>':'<span class="badc">✗</span>'}${a.fl?' ⚑':''}</td><td class="mono">${fmtT(a.ms/1000)}</td><td class="tb"><i class="${a.ms/1000>budget?'over':''}" style="width:${Math.round(a.ms/maxms*100)}%"></i></td></tr>`).join('')}</tbody></table></div></div>
    </div>
    <details ${p.score<p.n?'open':''}><summary>Rivedi le ${p.n} domande con le soluzioni. Per ogni errore indica la causa.</summary><div class="review">${P.items.map((it,i)=>reviewItem(it,P.ans[i],i,pi,p.att[i])).join('')}</div></details>
  </section>`;
}
function reviewItem(it,a,i,pi,att){
  const ok=a===it.key;
  const causeBtns=(!ok&&att)?`<div class="row causes"><span class="small muted">Causa dell'errore:</span>${Object.entries(CAUSES).map(([k,l])=>`<button class="small ${att.cause===k?'csel':''}" data-cause="${pi}:${i}:${k}">${l}</button>`).join('')}</div>`:'';
  let body='';
  if(FMT(it)==='verbal') body=`<details class="inner"><summary>Brano</summary><p class="passage small2">${esc(it.text)}</p></details><p class="small muted">${esc(it.question)}</p>${it.options.map((o,j)=>`<p class="${j===it.key?'okc':(j===a?'badc':'')}"><span class="mono">${LETTERS[j]}</span> ${esc(o.text)}<br><span class="small muted">${{true:'Vera',false:'Falsa',cannot:'Non deducibile'}[o.kind]}: ${esc(o.why)}</span></p>`).join('')}`;
  else if(FMT(it)==='numerical') body=`<details class="inner"><summary>Dati</summary>${it.stim}</details><p>${esc(it.question)}</p><p class="small">${it.options.map((o,j)=>`<span class="${j===it.key?'okc':(j===a?'badc':'')}">${LETTERS[j]}. ${esc(o.label)}</span>`).join(' · ')}</p><p class="small muted">${esc(it.explain)}</p>`;
  else body=`<div class="series sm">${it.series.map(f=>frameSVG(f)).join('')}<div class="qmark">?</div></div><div class="series sm">${it.options.map((o,j)=>`<div class="optmini ${j===it.key?'k':''} ${j===a&&!ok?'w':''}"><span class="mono">${LETTERS[j]}</span>${frameSVG(o.frame)}</div>`).join('')}</div><p class="small muted">${esc(it.explain)}</p>`;
  return `<div class="ritem ${ok?'ok':'bad'}"><div class="row"><span class="mono">${String(i+1).padStart(2,'0')}</span><span>${a===undefined?'Senza risposta':ok?'Corretta':'Tua: '+LETTERS[a]+' · giusta: '+LETTERS[it.key]}</span></div>${body}${coachTip(it,a)}${causeBtns}</div>`;
}

// ---------- statistics ----------
function renderStats(){
  const ss=DB.sessions;
  const srcOf=s=>s.kind==='sheet'?(/^Manuale/.test(s.label||'')?'manuale':'foglio'):'programma';
  const all=[]; ss.forEach(s=>s.parts.forEach(p=>p.att&&p.att.forEach(x=>all.push(Object.assign({date:s.date,src:srcOf(s),test:x.sec==='sheet'?p.sec:x.sec},x)))));
  const by=sec=>all.filter(x=>x.test===sec);
  const acc=list=>list.length?Math.round(list.filter(a=>a.ok).length/list.length*100)+'%':'–';
  const avg=list=>list.length?fmtT(list.reduce((s,a)=>s+a.ms,0)/list.length/1000):'–';
  const traps={}; by('verbal').forEach(a=>{if(a.trap)traps[a.trap]=(traps[a.trap]||0)+1});
  const tpl={}; by('numerical').forEach(a=>{tpl[a.tpl]=tpl[a.tpl]||{n:0,ok:0,ms:0};tpl[a.tpl].n++;tpl[a.tpl].ms+=a.ms;if(a.ok)tpl[a.tpl].ok++});
  const rules={}; by('abstract').forEach(a=>{(a.rules||[]).forEach(r=>{rules[r]=rules[r]||{n:0,miss:0};rules[r].n++}); (a.broken||[]).forEach(r=>{rules[r]=rules[r]||{n:0,miss:0};rules[r].miss++})});
  const causes={}; all.forEach(a=>{if(a.cause)causes[a.cause]=(causes[a.cause]||0)+1});
  const full=ss.filter(s=>s.kind==='full');
  const sheets=ss.filter(s=>s.kind==='sheet');
  app().innerHTML=header('Statistiche','Tutto resta in questo browser. Esporta un backup se cambi computer.')+`
  <main class="wrap stack">
    ${weakPanel(false)}
    <section class="stack"><h2>Riepilogo di tutte le prove</h2><p class="small muted">Test del programma, simulazioni ed esercizi sul manuale, fogli risposte: tutto insieme.</p>
      <div class="cards3">${['verbal','numerical','abstract'].map(s=>overviewCard(s,by(s),ss.filter(x=>x.kind!=='sheet'||true),srcOf)).join('')}</div></section>
    ${['mind','crit','adapt','aipro'].some(k=>by(k).length)?`<section class="stack"><h2>Test EY</h2><div class="cards4">${['mind','crit','adapt','aipro'].map(k=>overviewCard(k,by(k))).join('')}</div></section>`:''}
    ${mentalStatsPanel()}
    ${dailyTable(all)}
    ${allTestsTable(ss,srcOf)}
    ${manualWrongPanel()}
    <div class="row"><button class="primary" data-nav="errors">Spiegazione di tutti gli errori</button></div>
    <section class="panel stack"><h2>Simulazioni complete</h2>${full.length?`<div class="tblwrap"><table class="times"><thead><tr><th>Data</th><th>Verbale</th><th>Num.</th><th>Astr.</th><th>Num + astr.</th><th>Esito</th></tr></thead><tbody>${full.map(s=>{const g=k=>s.parts.find(p=>p.sec===k)||{score:0};const v=verdict(s);return `<tr><td>${fmtD(s.date)}</td><td class="mono">${g('verbal').score}/20</td><td class="mono">${g('numerical').score}/10</td><td class="mono">${g('abstract').score}/10</td><td class="mono">${g('numerical').score+g('abstract').score}/20</td><td>${v.every(x=>x.pass)?'<span class="pill ok">Superata</span>':'<span class="pill bad">Non superata</span>'}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="muted">Nessuna simulazione completa salvata.</p>'}</section>
    <section class="grid2">
      <div class="panel stack"><h2>Cause degli errori (indicate da te)</h2>${Object.keys(causes).length?`<ul class="bars">${Object.entries(causes).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<li><span>${esc(CAUSES[k])}</span><b class="mono">${n}</b></li>`).join('')}</ul>`:'<p class="muted">Nei risultati, per ogni errore, indica la causa: qui vedrai quale prevale.</p>'}</div>
      <div class="panel stack"><h2>Trappole verbali più frequenti</h2>${Object.keys(traps).length?`<ul class="bars">${Object.entries(traps).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<li><span>${esc(TRAPS[k]||k)}</span><b class="mono">${n}</b></li>`).join('')}</ul>`:'<p class="muted">Ancora nessun errore verbale.</p>'}</div>
      <div class="panel stack"><h2>Numerico per tipo di calcolo</h2>${Object.keys(tpl).length?`<div class="tblwrap"><table class="times"><thead><tr><th>Tipo</th><th>Corrette</th><th>Tempo medio</th></tr></thead><tbody>${Object.entries(tpl).sort((a,b)=>a[1].ok/a[1].n-b[1].ok/b[1].n).map(([k,o])=>`<tr><td>${esc(NUM_T[k]?NUM_T[k].label:k)}</td><td class="mono">${o.ok}/${o.n}</td><td class="mono">${fmtT(o.ms/o.n/1000)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Ancora nessuna risposta.</p>'}</div>
      <div class="panel stack"><h2>Astratto per regola</h2>${Object.keys(rules).length?`<div class="tblwrap"><table class="times"><thead><tr><th>Regola</th><th>Presente</th><th>Mancata</th></tr></thead><tbody>${Object.entries(rules).map(([k,o])=>`<tr><td>${esc(AB_RULES[k].label)}</td><td class="mono">${o.n}</td><td class="mono">${o.miss}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Ancora nessuna risposta.</p>'}</div>
    </section>
    <section class="panel stack"><h2>Esporta e backup</h2>
      <p class="muted small">CSV: una riga per domanda, da aprire in Excel o Google Sheets. Backup JSON: per spostare lo storico su un altro computer o browser.</p>
      ${exportBlock(sessionCSV(ss),'tutto')}
      <div class="row"><button id="bk">Scarica backup JSON</button><label class="filebtn">Importa backup<input type="file" id="imp" accept="application/json"></label><button id="reset" class="ghost">Cancella tutto lo storico</button></div>
    </section>
    ${footer()}
  </main>`;
  bindNav(); bindExport(); bindFocus();
  document.querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>{ MAN.pendingRetry=b.dataset.retry; renderManual(); });
  $('#bk').onclick=()=>download('epso-reasoning-backup.json',JSON.stringify(DB),'application/json');
  $('#imp').onchange=e=>{const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{try{const d=JSON.parse(r.result); if(!d.sessions) throw 0; DB=d; saveDB(); toast('Backup importato.'); renderStats();}catch(x){toast('File non valido: serve un backup esportato da questo programma.')}}; r.readAsText(f);};
  let armed=false; $('#reset').onclick=()=>{ if(!armed){armed=true;$('#reset').textContent='Conferma: cancella tutto';return} DB={sessions:[],seen:{},vwrong:{},plan:{}}; saveDB(); renderStats(); toast('Storico cancellato.'); };
}

function pct(list){ return list.length?Math.round(list.filter(x=>x.ok).length/list.length*100):null; }
function sessionScores(ss,sec){ // % per session for one test, oldest first
  const out=[]; ss.slice().reverse().forEach(s=>s.parts.forEach(p=>{ if(p.sec===sec&&p.n) out.push(Math.round(p.score/p.n*100)); })); return out; }
function sparkline(vals){
  if(vals.length<2) return '';
  const w=140,h=34, pts=vals.slice(-12), step=w/(pts.length-1);
  const d=pts.map((v,i)=>`${(i*step).toFixed(1)},${(h-3-(h-6)*v/100).toFixed(1)}`).join(' ');
  const last=pts[pts.length-1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-label="andamento ultime prove"><line x1="0" x2="${w}" y1="${(h-3-(h-6)*0.5).toFixed(1)}" y2="${(h-3-(h-6)*0.5).toFixed(1)}" class="sp50"/><polyline points="${d}" class="spl"/><circle cx="${((pts.length-1)*step).toFixed(1)}" cy="${(h-3-(h-6)*last/100).toFixed(1)}" r="3" class="spd"/></svg>`;
}
function overviewCard(sec,list,ss,srcOf){
  const total=pct(list), prog=pct(list.filter(x=>x.src==='programma')), man=pct(list.filter(x=>x.src!=='programma'));
  const timed=list.filter(x=>x.ms>0), avgS=timed.length?timed.reduce((s,x)=>s+x.ms,0)/timed.length/1000:null, budget=SEC[sec].sec/SEC[sec].n;
  const sc=sessionScores(DB.sessions,sec); let trend='';
  if(sc.length>=4){ const k=Math.min(3,Math.floor(sc.length/2)); const a0=sc.slice(0,k).reduce((a,b)=>a+b,0)/k, a1=sc.slice(-k).reduce((a,b)=>a+b,0)/k; const d=Math.round(a1-a0); trend=d>=5?`<span class="okc">in crescita (+${d} punti %)</span>`:d<=-5?`<span class="badc">in calo (${d} punti %)</span>`:'stabile'; }
  return `<div class="card"><span class="eyebrow">${SEC[sec].it}</span>
    <div class="row spread"><b class="mono big2">${total===null?'–':total+'%'}</b>${sparkline(sc)}</div>
    <span class="small">${list.length} risposte${prog!==null?` · programma ${prog}%`:''}${man!==null?` · manuale/libro ${man}%`:''}</span>
    <span class="small muted">Tempo medio ${avgS===null?'–':fmtT(avgS)} (budget ${fmtT(budget)})${avgS!==null&&avgS>budget?' · <span class="badc">oltre il budget</span>':''}</span>
    ${trend?`<span class="small">Andamento: ${trend}</span>`:''}</div>`;
}
function dailyTable(all){
  const days={}; all.forEach(x=>{ const d=new Date(x.date).toISOString().slice(0,10); days[d]=days[d]||{verbal:[],numerical:[],abstract:[]}; if(days[d][x.test]) days[d][x.test].push(x); });
  const keys=Object.keys(days).sort().reverse(); if(!keys.length) return '';
  const cell=l=>l.length?`${pct(l)}% <span class="muted small">(${l.length})</span>`:'<span class="muted">–</span>';
  return `<section class="panel stack"><h2>Andamento giorno per giorno</h2><div class="tblwrap"><table class="times"><thead><tr><th>Giorno</th><th>Verbale</th><th>Numerico</th><th>Astratto</th></tr></thead><tbody>
    ${keys.map(k=>`<tr><td>${new Date(k+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'})}</td><td class="mono">${cell(days[k].verbal)}</td><td class="mono">${cell(days[k].numerical)}</td><td class="mono">${cell(days[k].abstract)}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted">Percentuale di risposte giuste; tra parentesi quante domande.</p></section>`;
}
function allTestsTable(ss,srcOf){
  if(!ss.length) return '';
  const kindLabel=s=>s.kind==='sheet'?(s.label||'Foglio risposte'):({full:'Simulazione completa',single:'Prova a tempo',practice:'Pratica',review:'Ripasso errori',focus:'Allenamento mirato',eyfull:'Simulazione EY'}[s.kind]||s.kind);
  const rows=[]; ss.slice(0,40).forEach(s=>s.parts.forEach(p=>rows.push({s,p})));
  return `<section class="panel stack"><h2>Tutte le prove</h2><div class="tblwrap"><table class="times"><thead><tr><th>Data</th><th>Origine</th><th>Tipo</th><th>Prova</th><th>Punteggio</th><th>Tempo</th></tr></thead><tbody>
    ${rows.map(({s,p})=>`<tr><td>${fmtD(s.date)}</td><td>${{programma:'Programma',manuale:'Manuale',foglio:'Foglio risposte'}[srcOf(s)]}</td><td>${esc(kindLabel(s))}</td><td>${SEC[p.sec]?SEC[p.sec].it.replace('Ragionamento ',''):esc(p.sec)}</td><td class="mono">${p.score}/${p.n} <span class="muted">(${p.n?Math.round(p.score/p.n*100):0}%)</span></td><td class="mono">${fmtT(p.secs||0)}${p.limit?' / '+fmtT(p.limit):''}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function manualWrongPanel(){
  const W=DB.manWrong||{}; const entries=Object.entries(W).filter(([k,v])=>v.length);
  if(!entries.length) return `<section class="panel stack"><h2>Esercizi del manuale da rifare</h2><p class="muted">Ancora nessuno: quando sbagli un esercizio del manuale, lo trovi qui per rifarlo.</p></section>`;
  return `<section class="panel stack"><h2>Esercizi del manuale da rifare</h2><ul class="bars">${entries.map(([k,v])=>{ const [file,sec]=k.split('|'); return `<li><span><b>${esc(sec)}</b> <span class="small muted">${esc(file)}</span><br><span class="mono small">${v.slice().sort((a,b)=>a-b).join(', ')}</span></span><button class="small" data-retry="${esc(k)}">Rifai gli errori (${v.length})</button></li>`; }).join('')}</ul>
    <p class="small muted">Un esercizio esce dalla lista quando lo rifai giusto.</p></section>`;
}
function sessionCSV(list){
  const rows=[['session_date','mode','section','q','item','correct','answer','key','seconds','answer_changes','flagged','detail','cause']];
  list.forEach(s=>s.parts.forEach(p=>(p.att||[]).forEach((a,i)=>{
    const det=a.sec==='verbal'?(a.trap||''):a.sec==='numerical'?(a.tpl+(a.slip?': '+a.slip:'')):a.sec==='abstract'?((a.rules||[]).join('+')+(a.broken?' missed '+a.broken.join('+'):'')):(s.label||'');
    rows.push([new Date(s.date).toISOString(),s.kind,a.sec,i+1,a.id,a.ok?1:0,a.ans===null?'':LETTERS[a.ans],a.key===null||a.key===undefined?'':LETTERS[a.key],(a.ms/1000).toFixed(1),a.ch||0,a.fl?1:0,det,a.cause?CAUSES[a.cause]:'']);
  })));
  return rows.map(r=>r.map(x=>/[",\n]/.test(String(x))?'"'+String(x).replace(/"/g,'""')+'"':x).join(',')).join('\n');
}
function exportBlock(csv,name){ return `<div class="stack exp" data-name="${name}"><div class="row"><button class="dl">Scarica CSV</button><button class="cp">Copia CSV</button><span class="small muted st"></span></div><textarea readonly class="csv">${esc(csv)}</textarea></div>`; }
function bindExport(){ document.querySelectorAll('.exp').forEach(b=>{const t=b.querySelector('textarea'), st=b.querySelector('.st');
  b.querySelector('.dl').onclick=()=>download('epso-reasoning-'+b.dataset.name+'.csv',t.value,'text/csv');
  b.querySelector('.cp').onclick=()=>{const fb=()=>{t.focus();t.select();st.textContent='Testo selezionato: copia con Ctrl/Cmd+C.'}; try{navigator.clipboard.writeText(t.value).then(()=>st.textContent='Copiato.',fb)}catch(e){fb()}};});}
function download(name,text,type){ try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('Download avviato. Se non parte, usa "Copia".')}catch(e){toast('Download non disponibile qui: usa "Copia".')} }

// ---------- answer sheet for book practice ----------
let SH=null;
function renderSheetSetup(){
  app().innerHTML=header('Foglio risposte','Per i test su carta o su libro: cronometro, risposte, correzione e statistiche. Il programma non contiene le domande.')+`
  <main class="wrap stack narrow"><div class="panel stack">
    <label>Tipo di prova<select id="sh-type"><option value="verbal">Verbale · 20 dom. · 35:00 · 4 opzioni</option><option value="numerical">Numerico · 10 dom. · 20:00 · 5 opzioni</option><option value="abstract">Astratto · 10 dom. · 10:00 · 5 opzioni</option><option value="custom">Personalizzato</option></select></label>
    <div class="row wrap-gap"><label>Domande<input id="sh-n" type="number" min="1" max="120" value="20"></label><label>Minuti<input id="sh-m" type="number" min="1" max="240" value="35"></label><label>Opzioni<select id="sh-o"><option>4</option><option>5</option></select></label></div>
    <label>Etichetta (es. "Libro AD 2015, test verbale 1, dom. 1-20")<input id="sh-l" type="text" maxlength="80"></label>
    <div class="row"><button class="primary" id="sh-go">Avvia cronometro</button></div>
  </div>${footer()}</main>`;
  bindNav();
  const set=()=>{const t=$('#sh-type').value; if(t!=='custom'){ $('#sh-n').value=SEC[t].n; $('#sh-m').value=SEC[t].sec/60; $('#sh-o').value=SEC[t].letters; }};
  $('#sh-type').onchange=set;
  $('#sh-go').onclick=()=>{ const n=Math.max(1,Math.min(120,+$('#sh-n').value||20)), m=Math.max(1,+$('#sh-m').value||35), o=+$('#sh-o').value;
    SH={type:$('#sh-type').value,n,sec:m*60,o,label:$('#sh-l').value.trim(),ans:{},key:{},t:{},start:Date.now(),last:Date.now(),phase:'run'}; clearInterval(TIMER); TIMER=setInterval(sheetTick,250); renderSheet(); };
}
function sheetTick(){ if(!SH||SH.phase!=='run') return; const left=SH.sec-(Date.now()-SH.start)/1000; const el=$('#clock'); if(el){el.textContent=fmtT(left); el.classList.toggle('low',left<=Math.min(300,SH.sec*0.15));} if(left<=0){ sheetStop(); } }
function sheetStop(){ SH.phase='key'; SH.end=Date.now(); clearInterval(TIMER); renderSheet(); }
function renderSheet(){
  const L=LETTERS.slice(0,SH.o).split('');
  const run=SH.phase==='run';
  app().innerHTML=`<div class="bar"><div class="in"><div class="row"><span class="secname">Foglio risposte</span><span class="clock mono" id="clock">${run?'--:--':fmtT((SH.end-SH.start)/1000)}</span><span class="small muted">${esc(SH.label)}</span></div><div class="row"><button class="ghost" data-nav="home">Inizio</button><button class="ghost" data-nav="stats">Statistiche</button>${run?'<button class="primary" id="sh-stop">Ferma e correggi</button>':'<button class="primary" id="sh-score">Calcola punteggio</button>'}</div></div></div>
  <main class="wrap stack narrow"><div class="panel stack">
    <p class="muted small">${run?'Segna la risposta di ogni domanda. Il tempo di ogni domanda è misurato dalla risposta precedente.':'Ora inserisci la soluzione dal libro (colonna "Chiave"). Il punteggio si aggiorna quando premi "Calcola punteggio".'}</p>
    <div class="tblwrap"><table class="sheet"><thead><tr><th>#</th><th>Tua risposta</th>${run?'':'<th>Chiave</th>'}<th>Tempo</th></tr></thead><tbody>
    ${Array.from({length:SH.n},(_,i)=>`<tr><td class="mono">${i+1}</td><td><div class="seg">${L.map(l=>`<button class="${SH.ans[i]===l?'sel':''}" data-a="${i}:${l}" ${run?'':'disabled'}>${l}</button>`).join('')}</div></td>${run?'':`<td><div class="seg">${L.map(l=>`<button class="${SH.key[i]===l?'selk':''}" data-k="${i}:${l}">${l}</button>`).join('')}</div></td>`}<td class="mono">${SH.t[i]?fmtT(SH.t[i]/1000):'–'}</td></tr>`).join('')}
    </tbody></table></div>
    <div id="sh-res"></div>
  </div>${footer()}</main>`;
  sheetTick(); bindNav();
  document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const [i,l]=b.dataset.a.split(':'); const now=Date.now(); if(SH.ans[i]===undefined){SH.t[i]=now-SH.last; SH.last=now;} SH.ans[i]=l; renderSheet();});
  document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const [i,l]=b.dataset.k.split(':'); SH.key[i]=l; renderSheet();});
  if($('#sh-stop')) $('#sh-stop').onclick=sheetStop;
  if($('#sh-score')) $('#sh-score').onclick=()=>{
    const keyed=Object.keys(SH.key).length; if(keyed<SH.n){ $('#sh-res').innerHTML=`<p class="alert">Mancano ${SH.n-keyed} chiavi.</p>`; return; }
    const att=Array.from({length:SH.n},(_,i)=>({sec:'sheet',id:'q'+(i+1),ok:SH.ans[i]===SH.key[i],ans:SH.ans[i]?LETTERS.indexOf(SH.ans[i]):null,key:LETTERS.indexOf(SH.key[i]),ms:SH.t[i]||0,ch:0,fl:false}));
    const score=att.filter(a=>a.ok).length;
    const rec={id:Date.now(),date:SH.start,kind:'sheet',label:SH.label||(SEC[SH.type]?SEC[SH.type].it:'Personalizzato'),parts:[{sec:SH.type,n:SH.n,score,secs:Math.round((SH.end-SH.start)/1000),limit:SH.sec,att}]};
    DB.sessions.unshift(rec); saveDB();
    const pass=SH.type==='verbal'&&SH.n===20?`<span class="pill ${score>=10?'ok':'bad'}">${score>=10?'Sopra':'Sotto'} la soglia 10/20</span>`:'';
    $('#sh-res').innerHTML=`<div class="row"><b class="mono big2">${score}/${SH.n}</b>${pass}<span class="muted">Salvato nelle statistiche.</span></div>`+exportBlock(sessionCSV([rec]),'foglio');
    bindExport(); SH.phase='done';
  };
}

function footer(){ return `<footer class="foot">
  <p>Formato e soglie dal bando EPSO/AD/427/26: verbale 20 domande in 35 minuti (soglia 10/20); numerico 10 in 20 minuti e astratto 10 in 10 minuti (soglia combinata 10/20). Numerico e astratto sono generati al momento con dati fittizi. Il punteggio qui non predice il risultato reale.</p>
  <p class="mono">Versione 2026-11-07a · Calcolo rapido</p>
  <p>Verbale: 42 brani originali scritti per questo programma; 14 brani da atti UE con affermazioni adattate da <a href="https://github.com/Chartres/epso-kviz" target="_blank" rel="noopener">EPSO AI Field Trainer</a> (CC BY-NC-SA 4.0). Testi UE © European Union, <a href="https://eur-lex.europa.eu" target="_blank" rel="noopener">EUR-Lex</a>, riuso ai sensi della Decisione 2011/833/UE. Uso personale, non commerciale. Progetto indipendente, non affiliato a EPSO.</p>
</footer>`; }

document.addEventListener('keydown',e=>{
  if(!S||S.done||e.metaKey||e.ctrlKey||e.altKey) return; const P=S.parts[S.pi]; if(!P||!P.started||P.ended) return;
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  const n=P.items[P.cur].options.length, k=e.key.toLowerCase();
  let idx='abcde'.indexOf(k); if(idx<0) idx='12345'.indexOf(k);
  if(idx>=0&&idx<n){ choose(idx); e.preventDefault(); return; }
  if(e.key==='ArrowRight') go(P.cur+1); else if(e.key==='ArrowLeft') go(P.cur-1);
  else if(k==='f'&&P.timed){P.flag[P.cur]=!P.flag[P.cur];renderTest();}
});
window.addEventListener('beforeunload',e=>{ if(S&&!S.done&&S.parts[S.pi]&&S.parts[S.pi].started){ e.preventDefault(); e.returnValue=''; } });

renderHome();

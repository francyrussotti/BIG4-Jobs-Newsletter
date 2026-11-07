// ---------- Calcolo rapido: allenamento al calcolo a mente a tempo ----------
// Quattro esercizi: Operatore (a ? b = c), Ruota (stessi numeri su una ruota che gira),
// Vero/Falso (verifica un'uguaglianza), Calcolo (scrivi il risultato).
const MC_MODES={
  op:{name:'Operatore',desc:'Vedi tre numeri: il terzo è il risultato dei primi due. Scegli l\'operazione: + − × ÷.',keys:'Tasti 1-4 oppure + - * /'},
  wheel:{name:'Ruota',desc:'Tre numeri girano su una ruota in ordine sparso. Trova l\'operazione che li lega: l\'ordine non conta (30, 10, 3 → × oppure ÷, entrambe giuste).',keys:'Tasti 1-4 oppure + - * /'},
  tf:{name:'Vero o falso',desc:'Un\'uguaglianza già scritta: è giusta o sbagliata? Gli errori sono vicini al risultato vero.',keys:'V / F oppure ← →'},
  calc:{name:'Calcolo',desc:'Scrivi il risultato e premi Invio. Dal livello 2 anche percentuali.',keys:'Numeri + Invio'}
};
const MC_LEVELS={1:'Facile · tabelline, numeri fino a 30',2:'Medio · due cifre, tabelline fino a 15',3:'Difficile · tre cifre, due cifre × una cifra'};
const MC_SYM={'+':'+','-':'−','*':'×','/':'÷','%':'% di'};
const MC_OPS=['+','-','*','/'];
let MC=null;
const mcR=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const mcPick=a=>a[Math.floor(Math.random()*a.length)];
function mcVal(a,op,b){ return op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?(b&&a%b===0?a/b:null):op==='%'?a*b/100:null; }
function mcOpsGiving(a,b,c){ return MC_OPS.filter(o=>mcVal(a,o,b)===c); }
// Ruota: operazioni valide con i tre numeri in qualsiasi ordine
function mcAnyOrder(n){ const v=new Set(); const P=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  P.forEach(([i,j,k])=>MC_OPS.forEach(o=>{ if(mcVal(n[i],o,n[j])===n[k]) v.add(o); })); return [...v]; }
function mcWheelTxt(p){ return p.op==='+'||p.op==='-'?(()=>{const z=Math.max(p.a,p.b,p.c),[x,y]=[p.a,p.b,p.c].filter((_,i)=>i!==[p.a,p.b,p.c].indexOf(z));return `${x} + ${y} = ${z} · ${z} − ${y} = ${x}`})()
  :(()=>{const z=Math.max(p.a,p.b,p.c),[x,y]=[p.a,p.b,p.c].filter((_,i)=>i!==[p.a,p.b,p.c].indexOf(z));return `${x} × ${y} = ${z} · ${z} ÷ ${y} = ${x}`})(); }
function mcPair(op,L){
  let a,b;
  if(op==='+'){ if(L===1){a=mcR(2,20);b=mcR(2,20)} else if(L===2){a=mcR(11,99);b=mcR(11,99)} else {a=mcR(101,899);b=mcR(26,499)} }
  else if(op==='-'){ if(L===1){a=mcR(8,30);b=mcR(2,a-2)} else if(L===2){a=mcR(30,150);b=mcR(11,a-5)} else {a=mcR(200,999);b=mcR(26,a-50)} }
  else if(op==='*'){ if(L===1){a=mcR(2,10);b=mcR(2,10)} else if(L===2){a=mcR(3,15);b=mcR(3,12)} else if(Math.random()<.6){a=mcR(12,99);b=mcR(3,9)} else {a=mcR(11,25);b=mcR(11,19)} }
  else if(op==='/'){ let q; if(L===1){b=mcR(2,10);q=mcR(2,10)} else if(L===2){b=mcR(3,12);q=mcR(3,15)} else {b=mcR(4,19);q=mcR(6,30)} a=b*q; }
  else if(op==='%'){ b=mcPick(L===2?[10,20,25,50,75]:[5,15,20,25,30,40,60,75,120]); const base=b%25===0?4:b%20===0?5:b%10===0?10:20; a=base*mcR(L===2?2:3,L===2?40:60); }
  if(Math.random()<.5&&(op==='+'||op==='*')){ const t=a; a=b; b=t; }
  return {a,b,op,c:mcVal(a,op,b)};
}
function mcItem(mode,L,prev){
  for(let g=0;g<200;g++){
    if(mode==='op'||mode==='wheel'){
      const p=mcPair(mcPick(MC_OPS),L);
      if(prev&&prev.a===p.a&&prev.b===p.b) continue;
      if(mode==='op'&&mcOpsGiving(p.a,p.b,p.c).length!==1) continue;
      if(mode==='wheel'){ const v=mcAnyOrder([p.a,p.b,p.c]).sort().join('');
        if(v!=='+-'&&v!=='*/') continue; // una sola famiglia: +/− oppure ×/÷
        if(new Set([p.a,p.b,p.c]).size<3) continue;
        p.valid=v.split(''); p.pos=[0,1,2].sort(()=>Math.random()-.5); p.spin=mcPick([1,-1]); }
      return p;
    }
    const ops=L>=2?['+','-','*','/','%']:MC_OPS;
    const p=mcPair(mcPick(ops),L);
    if(p.c===null||!Number.isInteger(p.c)) continue;
    if(mode==='calc') return p;
    // tf: metà vere, metà con un errore plausibile
    p.truth=Math.random()<.5; p.shown=p.c;
    if(!p.truth){
      const w=[p.c+1,p.c-1,p.c+2,p.c-2,p.c+10,p.c-10];
      if(p.op==='*') w.push(p.c+p.a,p.c-p.a,p.c+p.b,p.c-p.b);
      if(p.op!=='%') MC_OPS.forEach(o=>{const v=mcVal(p.a,o,p.b); if(v!==null&&v>0) w.push(v)});
      if(p.c>=10){ const s=String(p.c); if(s.length>=2){ const sw=s.slice(0,-2)+s.slice(-1)+s.slice(-2,-1); w.push(+sw) } }
      const ok=w.filter(x=>Number.isInteger(x)&&x>0&&x!==p.c);
      if(!ok.length) continue; p.shown=mcPick(ok);
    }
    return p;
  }
  return mcPair('+',1);
}
const mcExpr=p=>p.op==='%'?`${p.b}% di ${p.a}`:`${p.a} ${MC_SYM[p.op]} ${p.b}`;
const mcStore=()=>{ DB.mental=DB.mental||[]; return DB.mental; };

function renderMental(){
  MC=null;
  const hist=mcStore();
  const pref=DB.mentalPref||{mode:'op',level:2,dur:90};
  const best=(m,l,d)=>{const xs=hist.filter(h=>h.mode===m&&h.level===l&&h.dur===d); return xs.length?Math.max(...xs.map(h=>h.ok)):null};
  app().innerHTML=header('Calcolo rapido','Calcolo a mente a tempo. Utile per MIND (EY) e per non perdere secondi nel numerico EPSO.')+`
  <main class="wrap stack">
    <section class="panel stack">
      <h2>Scegli l'esercizio</h2>
      <div class="cards4">${Object.entries(MC_MODES).map(([k,m])=>`<label class="card mc-mode"><span class="row"><input type="radio" name="mc-mode" value="${k}" ${pref.mode===k?'checked':''}><b>${m.name}</b></span><span class="muted small">${m.desc}</span><span class="small mono">${m.keys}</span></label>`).join('')}</div>
      <div class="row wrap-gap">
        <label class="row">Livello <select id="mc-level">${[1,2,3].map(l=>`<option value="${l}" ${pref.level===l?'selected':''}>${l} · ${MC_LEVELS[l]}</option>`).join('')}</select></label>
        <label class="row">Durata <select id="mc-dur">${[[60,'1 minuto'],[90,'90 secondi'],[120,'2 minuti'],[180,'3 minuti']].map(([v,t])=>`<option value="${v}" ${pref.dur===v?'selected':''}>${t}</option>`).join('')}</select></label>
        <button class="primary" id="mc-start">Inizia</button>
      </div>
      <p class="small muted" id="mc-best"></p>
    </section>
    <section class="panel stack">
      <h2>Come andare più veloce</h2>
      <dl class="dl">
        <dt>Operatore: prima la grandezza</dt><dd>Il terzo numero è più grande di entrambi → <b>+</b> o <b>×</b>. È più piccolo del primo → <b>−</b> o <b>÷</b>. Poi decidi tra i due con una stima: 14 e 6 → 84 è ×, 20 è +. Non serve calcolare tutto.</dd>
        <dt>Ultima cifra</dt><dd>Controlla solo le unità: 37 e 8 → con + finisce per 5, con × finisce per 6. Se il terzo numero finisce per 6 è ×. Funziona anche in Vero o falso: se l'ultima cifra non torna, è falso.</dd>
        <dt>Pari e dispari</dt><dd>Pari × qualsiasi = pari. Dispari + dispari = pari. Un risultato dispari con un fattore pari è sempre falso.</dd>
        <dt>Moltiplicazioni</dt><dd>×5 = ×10 e metà. ×25 = ×100 e diviso 4. ×9 = ×10 meno il numero. ×11 di due cifre: 43×11 = 4|7|3 = 473. 2 cifre × 1 cifra: scomponi, 47×6 = 240+42 = 282.</dd>
        <dt>Divisioni</dt><dd>Leggile come moltiplicazioni al contrario: 144 ÷ 12 → "12 per quanto fa 144?". Divisibilità: per 3 se la somma delle cifre è divisibile per 3; per 4 se le ultime due cifre lo sono.</dd>
        <dt>Sottrazioni e percentuali</dt><dd>Sottrazione come distanza: 503 − 187 → da 187 a 200 = 13, da 200 a 503 = 303, totale 316. Percentuali: 10% e poi multipli; 15% = 10% + metà; 75% = tre quarti.</dd>
      </dl>
    </section>
    ${hist.length?`<section class="panel stack"><h2>Ultimi allenamenti</h2>${mcHistTable(hist.slice(0,12))}</section>`:''}
  </main>${footer()}`;
  bindNav();
  const upd=()=>{ const m=document.querySelector('[name="mc-mode"]:checked').value,l=+$('#mc-level').value,d=+$('#mc-dur').value,b=best(m,l,d);
    $('#mc-best').textContent=b===null?'Nessun record per questa combinazione.':`Record ${MC_MODES[m].name}, livello ${l}, ${d} s: ${b} giuste.`; };
  document.querySelectorAll('[name="mc-mode"],#mc-level,#mc-dur').forEach(e=>e.onchange=upd); upd();
  $('#mc-start').onclick=()=>{ const mode=document.querySelector('[name="mc-mode"]:checked').value,level=+$('#mc-level').value,dur=+$('#mc-dur').value;
    DB.mentalPref={mode,level,dur}; saveDB(); mcStart(mode,level,dur); };
}
function mcHistTable(hs){
  return `<div class="tblwrap"><table class="data"><thead><tr><th>Data</th><th>Esercizio</th><th>Liv.</th><th>Durata</th><th>Giuste</th><th>Precisione</th><th>Tempo medio</th></tr></thead><tbody>${hs.map(h=>`<tr><td>${fmtD(h.date)}</td><td>${MC_MODES[h.mode].name}</td><td>${h.level}</td><td>${h.dur}s</td><td class="mono">${h.ok}/${h.n}</td><td class="mono">${h.n?Math.round(h.ok/h.n*100):0}%</td><td class="mono">${h.n?(h.ms/h.n/1000).toFixed(1):'–'} s</td></tr>`).join('')}</tbody></table></div>`;
}
function mcStart(mode,level,dur){
  S=null; MC={mode,level,dur,start:Date.now(),end:Date.now()+dur*1000,n:0,ok:0,att:[],item:null,t0:0,last:null};
  mcNext(); clearInterval(TIMER); TIMER=setInterval(mcTick,200);
}
function mcTick(){
  if(!MC||!$('#mc-run')){ clearInterval(TIMER); return; }
  const left=(MC.end-Date.now())/1000; const c=$('#clock'); if(c){ c.textContent=fmtT(left); c.classList.toggle('low',left<=10); }
  if(left<=0) mcFinish();
}
function mcNext(){ MC.item=mcItem(MC.mode,MC.level,MC.item); MC.t0=Date.now(); mcRender(); }
function mcRender(){
  const p=MC.item, m=MC.mode;
  let stage='', ctrl='';
  if(m==='op') stage=`<div class="mc-eq mono"><span>${p.a}</span><span class="mc-q">?</span><span>${p.b}</span><span class="mc-eqs">=</span><span>${p.c}</span></div>`;
  else if(m==='wheel'){ const nums=[p.a,p.b,p.c]; const dur=[0,9,6,4][MC.level];
    stage=`<div class="mc-wheel" style="--spin:${dur}s;--dir:${p.spin>0?'normal':'reverse'};--cdir:${p.spin>0?'reverse':'normal'}">${nums.map((x,i)=>`<div class="mc-slot s${p.pos[i]}"><div class="mc-c"><span class="mc-num mono">${x}</span></div></div>`).join('')}</div><p class="small muted center">Quale operazione lega i tre numeri? L'ordine non conta.</p>`; }
  else if(m==='tf') stage=`<div class="mc-eq mono"><span>${mcExpr(p)}</span><span class="mc-eqs">=</span><span>${p.shown}</span></div>`;
  else stage=`<div class="mc-eq mono"><span>${mcExpr(p)}</span><span class="mc-eqs">=</span><span class="mc-q">?</span></div>`;
  if(m==='op'||m==='wheel') ctrl=`<div class="mc-ops">${MC_OPS.map((o,i)=>`<button class="mc-op mono" data-mco="${o}"><small>${i+1}</small>${MC_SYM[o]}</button>`).join('')}</div>`;
  else if(m==='tf') ctrl=`<div class="mc-ops two"><button class="mc-op" data-mct="1"><small>V</small>Vero</button><button class="mc-op" data-mct="0"><small>F</small>Falso</button></div>`;
  else ctrl=`<form class="row mc-form" id="mc-form" autocomplete="off"><input id="mc-in" class="mono" inputmode="decimal" enterkeyhint="go" aria-label="Risultato"><button class="primary">Invio</button></form>`;
  const L=MC.last;
  app().innerHTML=`<div class="bar" id="mc-run"><div class="in"><div class="row"><span class="secname">Calcolo rapido · ${MC_MODES[m].name} · livello ${MC.level}</span><span class="clock mono" id="clock">${fmtT((MC.end-Date.now())/1000)}</span><span class="mono">Giuste ${MC.ok} · Fatte ${MC.n}</span></div><div class="row"><button class="ghost" id="mc-stop">Ferma</button></div></div></div>
  <main class="wrap stack mc-main"><section class="panel stack mc-stage ${L?(L.ok?'flash-ok':'flash-bad'):''}">${stage}${ctrl}
    <p class="small mono mc-last">${L?(L.ok?'<span class="okc">✓</span> ':'<span class="badc">✗</span> ')+esc(L.txt):'&nbsp;'}</p></section></main>`;
  $('#mc-stop').onclick=mcFinish;
  document.querySelectorAll('[data-mco]').forEach(b=>b.onclick=()=>mcAnswer(b.dataset.mco));
  document.querySelectorAll('[data-mct]').forEach(b=>b.onclick=()=>mcAnswer(b.dataset.mct==='1'));
  const f=$('#mc-form'); if(f){ const i=$('#mc-in'); i.focus(); f.onsubmit=e=>{ e.preventDefault(); const v=i.value.trim().replace(',','.'); if(v==='') return; mcAnswer(+v); }; }
}
function mcAnswer(ans){
  if(!MC||Date.now()>MC.end) return;
  const p=MC.item, m=MC.mode, ms=Date.now()-MC.t0; let ok, txt;
  if(m==='wheel'){ ok=p.valid.includes(ans); txt=mcWheelTxt(p)+(ok?'':` (hai scelto ${MC_SYM[ans]})`); }
  else if(m==='op'){ ok=ans===p.op; txt=`${p.a} ${MC_SYM[p.op]} ${p.b} = ${p.c}`+(ok?'':` (hai scelto ${MC_SYM[ans]})`); }
  else if(m==='tf'){ ok=ans===p.truth; txt=`${mcExpr(p)} = ${p.c}`+(p.truth?' → vero':` → falso, non ${p.shown}`); }
  else { ok=ans===p.c; txt=`${mcExpr(p)} = ${p.c}`+(ok?'':` (hai scritto ${ans})`); }
  MC.n++; if(ok) MC.ok++;
  MC.att.push({op:p.op,ok,ms,txt}); MC.last={ok,txt};
  mcNext();
}
function mcFinish(){
  if(!MC) return; clearInterval(TIMER);
  const R=MC; MC=null;
  const ms=R.att.reduce((s,a)=>s+a.ms,0);
  const byOp={}; R.att.forEach(a=>{const o=byOp[a.op]=byOp[a.op]||{n:0,ok:0,ms:0}; o.n++; o.ms+=a.ms; if(a.ok)o.ok++;});
  const rec={date:Date.now(),mode:R.mode,level:R.level,dur:R.dur,n:R.n,ok:R.ok,ms,byOp};
  const hist=mcStore(); const prevBest=hist.filter(h=>h.mode===R.mode&&h.level===R.level&&h.dur===R.dur).reduce((b,h)=>Math.max(b,h.ok),-1);
  if(R.n) { hist.unshift(rec); DB.mental=hist.slice(0,300); saveDB(); }
  const rate=R.n?(R.ok/(R.dur/60)).toFixed(1):'0';
  const opRows=Object.entries(byOp).sort((x,y)=>(x[1].ok/x[1].n)-(y[1].ok/y[1].n)||(y[1].ms/y[1].n)-(x[1].ms/x[1].n));
  const weak=opRows.length?opRows[0]:null;
  const wrong=R.att.filter(a=>!a.ok);
  const slow=R.att.filter(a=>a.ok).sort((a,b)=>b.ms-a.ms).slice(0,3);
  const verdict=!R.n?'Nessuna risposta data.':R.ok/R.n<.85?'Precisione sotto l\'85%: rallenta. Nel test un errore costa più di un secondo in più.':ms/R.n>4000?'Preciso ma lento: oltre 4 secondi a risposta. Usa grandezza e ultima cifra invece del calcolo completo.':'Buon equilibrio. Prova il livello successivo o la durata più lunga.';
  app().innerHTML=header('Calcolo rapido · risultato',`${MC_MODES[R.mode].name} · livello ${R.level} · ${R.dur} secondi`)+`
  <main class="wrap stack">
    <section class="panel stack">
      <div class="cards3">
        <div class="card"><span class="eyebrow">Giuste</span><b class="big2 mono">${R.ok}/${R.n}</b><span class="muted small">${prevBest<0?'Primo tentativo con queste impostazioni.':R.ok>prevBest?`Nuovo record (prima ${prevBest}).`:`Record: ${prevBest}.`}</span></div>
        <div class="card"><span class="eyebrow">Precisione</span><b class="big2 mono">${R.n?Math.round(R.ok/R.n*100):0}%</b><span class="muted small">${rate} giuste al minuto</span></div>
        <div class="card"><span class="eyebrow">Tempo medio</span><b class="big2 mono">${R.n?(ms/R.n/1000).toFixed(1):'–'} s</b><span class="muted small">per risposta</span></div>
      </div>
      <p><b>${verdict}</b></p>
      ${opRows.length?`<div class="tblwrap"><table class="data"><thead><tr><th>Operazione</th><th>Fatte</th><th>Giuste</th><th>Tempo medio</th></tr></thead><tbody>${opRows.map(([o,v])=>`<tr><td class="mono">${MC_SYM[o]}</td><td class="mono">${v.n}</td><td class="mono">${v.ok}/${v.n}</td><td class="mono">${(v.ms/v.n/1000).toFixed(1)} s</td></tr>`).join('')}</tbody></table></div>
      ${weak&&opRows.length>1?`<p class="small">Punto debole: <b class="mono">${MC_SYM[weak[0]]}</b> (${weak[1].ok}/${weak[1].n}, ${(weak[1].ms/weak[1].n/1000).toFixed(1)} s in media).</p>`:''}`:''}
    </section>
    ${wrong.length?`<section class="panel stack"><h2>Errori</h2><ul class="mono small">${wrong.map(a=>`<li>${esc(a.txt)}</li>`).join('')}</ul></section>`:''}
    ${slow.length?`<section class="panel stack"><h2>Le più lente tra le giuste</h2><ul class="mono small">${slow.map(a=>`<li>${esc(a.txt)} · ${(a.ms/1000).toFixed(1)} s</li>`).join('')}</ul></section>`:''}
    <div class="row"><button class="primary" id="mc-again">Ripeti</button><button id="mc-menu">Cambia esercizio</button><button data-nav="stats">Statistiche</button></div>
  </main>${footer()}`;
  bindNav();
  $('#mc-again').onclick=()=>mcStart(R.mode,R.level,R.dur);
  $('#mc-menu').onclick=renderMental;
}
function mentalStatsPanel(){
  const h=DB.mental||[]; if(!h.length) return '';
  const rows=[]; Object.keys(MC_MODES).forEach(m=>[1,2,3].forEach(l=>{ const xs=h.filter(x=>x.mode===m&&x.level===l); if(!xs.length) return;
    const n=xs.reduce((s,x)=>s+x.n,0), ok=xs.reduce((s,x)=>s+x.ok,0), ms=xs.reduce((s,x)=>s+x.ms,0);
    const rpm=Math.max(...xs.map(x=>x.ok/(x.dur/60)));
    rows.push(`<tr><td>${MC_MODES[m].name}</td><td>${l}</td><td class="mono">${xs.length}</td><td class="mono">${Math.round(ok/n*100)||0}%</td><td class="mono">${n?(ms/n/1000).toFixed(1):'–'} s</td><td class="mono">${rpm.toFixed(1)}</td></tr>`); }));
  const ops={}; h.forEach(x=>Object.entries(x.byOp||{}).forEach(([o,v])=>{const t=ops[o]=ops[o]||{n:0,ok:0,ms:0}; t.n+=v.n; t.ok+=v.ok; t.ms+=v.ms;}));
  return `<section class="panel stack"><h2>Calcolo rapido</h2>
    <div class="tblwrap"><table class="data"><thead><tr><th>Esercizio</th><th>Liv.</th><th>Sessioni</th><th>Precisione</th><th>Tempo medio</th><th>Migliore (giuste/min)</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <p class="small">Per operazione: ${Object.entries(ops).map(([o,v])=>`<span class="mono">${MC_SYM[o]}</span> ${Math.round(v.ok/v.n*100)}% · ${(v.ms/v.n/1000).toFixed(1)} s`).join(' &nbsp;|&nbsp; ')}</p>
    <div class="row"><button data-nav="mental">Allenati</button></div></section>`;
}
document.addEventListener('keydown',e=>{
  if(!MC||!$('#mc-run')||e.metaKey||e.ctrlKey||e.altKey) return;
  if(e.key==='Escape'){ mcFinish(); return; }
  if(e.target.tagName==='INPUT') return;
  const k=e.key.toLowerCase();
  if(MC.mode==='op'||MC.mode==='wheel'){ const map={'1':'+','2':'-','3':'*','4':'/','+':'+','-':'-','*':'*','x':'*','/':'/',':':'/'}; if(map[k]){ e.preventDefault(); mcAnswer(map[k]); } }
  else if(MC.mode==='tf'){ if(k==='v'||e.key==='ArrowLeft'){ e.preventDefault(); mcAnswer(true); } else if(k==='f'||e.key==='ArrowRight'){ e.preventDefault(); mcAnswer(false); } }
});

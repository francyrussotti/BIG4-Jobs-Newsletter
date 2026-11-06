// ---------- "Manuale": practise on the user's own PDF, opened locally; the file never leaves the browser ----------
const MAN={url:null,name:'',run:null,blob:null,doc:null,page:1,hide:true,revealed:{},pages:[],obs:null,vis:null,index:null};
const MAN_DB='epsoManualPdf';
function manIDB(){ return new Promise((res,rej)=>{ try{ const r=indexedDB.open(MAN_DB,1); r.onupgradeneeded=()=>r.result.createObjectStore('f'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e) } }); }
async function manSave(file){ try{ const db=await manIDB(); db.transaction('f','readwrite').objectStore('f').put({blob:file,name:file.name},'pdf'); }catch(e){} }
async function manLoad(){ try{ const db=await manIDB(); return await new Promise(res=>{ const q=db.transaction('f').objectStore('f').get('pdf'); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }); }catch(e){ return null } }
async function manForget(){ try{ const db=await manIDB(); db.transaction('f','readwrite').objectStore('f').delete('pdf'); }catch(e){} }
function manSetFile(blob,name){ if(MAN.url) URL.revokeObjectURL(MAN.url); MAN.url=URL.createObjectURL(blob); MAN.blob=blob; MAN.doc=null; MAN.revealed={}; MAN.name=name||'manuale.pdf'; }

async function renderManual(){
  if(!MAN.url){ const saved=await manLoad(); if(saved&&saved.blob) manSetFile(saved.blob,saved.name); }
  if(!MAN.url) return renderManualPick();
  renderManualWork();
}
function renderManualPick(msg){
  app().innerHTML=header('Manuale','Fai gli esercizi del tuo manuale PDF con cronometro e punteggio.')+`
  <main class="wrap stack narrow">
    ${msg?`<p class="alert">${esc(msg)}</p>`:''}
    <div class="panel stack">
      <h2>Apri il PDF dal tuo computer</h2>
      <p>Scegli il file del manuale. Lo vedrai a sinistra, con le soluzioni coperte, e il foglio risposte a destra.</p>
      <p class="small muted">Il file resta solo in questo browser: non viene caricato su internet né sul sito. La prossima volta si riapre da solo su questo computer; puoi toglierlo quando vuoi.</p>
      <label class="filebtn primaryfile">Scegli il PDF<input type="file" id="man-file" accept="application/pdf,.pdf"></label>
    </div>${footer()}</main>`;
  bindNav();
  $('#man-file').onchange=e=>{ const f=e.target.files[0]; if(!f) return; if(!/pdf$/i.test(f.type)&&!/\.pdf$/i.test(f.name)) return renderManualPick('Il file scelto non è un PDF.'); manSetFile(f,f.name); manSave(f); renderManualWork(); };
}

// ---------- layout ----------
function renderManualWork(){
  app().innerHTML=`<div class="bar"><div class="in"><div class="row"><span class="secname">Manuale</span><span class="small muted">${esc(MAN.name)}</span></div>
    <div class="row"><button class="ghost" data-nav="home">Inizio</button><button class="ghost" data-nav="stats">Statistiche</button><button class="ghost" id="man-change">Cambia PDF</button></div></div></div>
  <div class="mantools"><div class="in row wrap-gap">
    <span class="mono" id="mv-pg">Pagina – / –</span>
    <label class="inl">Vai a pagina<input id="mv-goto" type="number" min="1" value="${MAN.page}"></label><button class="small" id="mv-go">Vai</button>
    <label class="chk small"><input type="checkbox" id="mv-hide" ${MAN.hide?'checked':''}><span>Nascondi le soluzioni</span></label>
    <span class="small muted" id="mv-msg"></span></div></div>
  <main class="manwrap">
    <section class="manpdf"><div id="man-view" class="manview"><p class="muted small">Caricamento del PDF…</p></div></section>
    <aside class="panel stack mansheet" id="man-side"></aside>
  </main>`;
  bindNav();
  $('#man-change').onclick=()=>{ clearInterval(TIMER); manForget(); if(MAN.url) URL.revokeObjectURL(MAN.url); MAN.url=null; MAN.run=null; MAN.doc=null; clearInterval(TIMER); renderManualPick(); };
  $('#mv-go').onclick=()=>scrollToPage(+$('#mv-goto').value||1);
  $('#mv-goto').onkeydown=e=>{ if(e.key==='Enter') scrollToPage(+e.target.value||1); };
  $('#mv-hide').onchange=e=>{ MAN.hide=e.target.checked; MAN.pages.forEach(p=>{ if(p.rendered) drawMasks(p); }); };
  MAN.run?renderManSide():renderManSetup();
  initViewer();
}

// ---------- answer key read from the PDF (in the browser) ----------
// Sections come from headings like "4.2. Esercizi di allenamento", "4.3. Test n 1"; keys from "N. Risposta corretta: X".
async function buildKeyIndex(){
  if(!MAN.doc) return null; if(MAN.index&&MAN.index.doc===MAN.doc) return MAN.index;
  const idx={doc:MAN.doc,sections:[]}; let cur=null, ansFor=null, lastSol=null;
  const findSec=name=>idx.sections.find(x=>x.name===name);
  const newSec=name=>{ let x=findSec(name); if(!x){ x={name,keys:{},q:{},sol:{},why:{}}; idx.sections.push(x); } return x; };
  for(let n=1;n<=MAN.doc.numPages;n++){
    const pg=await MAN.doc.getPage(n), v=pg.getViewport({scale:1}), L=lineGroups((await pg.getTextContent()).items,v);
    for(const l of L){
      if(l.y<v.height*0.09) continue; // running header
      const rk=l.text.match(/^\d+(\.\d+)*\.?\s+Risposte\s+del\s+test\s+n\.?\s*(\d+)/i);
      if(rk){ ansFor=newSec('Test n. '+rk[2]); lastSol=null; continue; }
      const hd=l.text.match(/^\d+\.\d+(\.\d+)?\.?\s+(Esercizi[^.]{0,40}|Test\s+n\.?\s*(\d+))/i);
      if(hd&&l.x0<v.width*0.2){ cur=newSec(hd[3]?'Test n. '+hd[3]:hd[2].trim()); ansFor=null; lastSol=null; continue; }
      const sol=l.text.match(/^(\d{1,3})\s?\.\s*Risposta\s+corretta\s*:?\s*([A-E])/);
      const target=ansFor||cur;
      if(sol&&target){ target.keys[+sol[1]]=sol[2]; target.sol[+sol[1]]={page:n,y:l.y}; lastSol={sec:target,num:+sol[1]}; target.why[+sol[1]]=''; continue; }
      const q=l.text.match(/^(\d{1,3})\s?\.\s*\S/);
      if(q&&cur&&!ansFor&&l.x0<v.width*0.25&&!/Risposta/i.test(l.text)){ if(!cur.q[+q[1]]) cur.q[+q[1]]={page:n,y:l.y}; lastSol=null; continue; }
      if(lastSol&&l.x0<v.width*0.25&&lastSol.sec.why[lastSol.num].length<1500) lastSol.sec.why[lastSol.num]+=(lastSol.sec.why[lastSol.num]?' ':'')+l.text;
    }
  }
  idx.sections=idx.sections.filter(x=>Object.keys(x.keys).length);
  idx.sections.forEach(x=>{ const ks=Object.keys(x.keys).map(Number); x.min=Math.min(...ks); x.max=Math.max(...ks); x.count=ks.length; });
  MAN.index=idx; return idx;
}

// ---------- answer sheet ----------
const SIM_DEF={abstract:{n:10,min:10,opt:5,per:60},numerical:{n:10,min:20,opt:5,per:120},verbal:{n:20,min:35,opt:4,per:105}};
async function renderManSetup(mode){
  const side=$('#man-side');
  side.innerHTML=`<h2>Nuova sessione</h2><p class="small muted">Lettura delle soluzioni dal PDF…</p>`;
  let idx=null; try{ await waitDoc(); idx=await buildKeyIndex(); }catch(e){ idx=null; }
  const secs=idx?idx.sections:[];
  mode=secs.length?(mode||'sim'):'free';
  const doneSet=x=>new Set(((DB.man||{})[MAN.name+'|'+x.name])||[]);
  side.innerHTML=`<h2>Nuova sessione</h2>
    ${secs.length?`<div class="tabs"><button class="${mode==='sim'?'on':''}" data-mode="sim">Simulazione d'esame</button><button class="${mode==='free'?'on':''}" data-mode="free">Esercizio per esercizio</button></div>`
      :`<p class="alert small">Non riesco a leggere le soluzioni da questo PDF: inserirai tu la risposta corretta dopo ogni esercizio.</p>`}
    <label>Prova<select id="ms-sec"><option value="abstract">Astratto</option><option value="numerical">Numerico</option><option value="verbal">Verbale</option></select></label>
    ${secs.length?`<label>Sezione del manuale<select id="ms-part">${secs.map((x,i)=>`<option value="${i}">${esc(x.name)} · ${x.count} esercizi · ${doneSet(x).size} già fatti</option>`).join('')}</select></label>`:''}
    ${mode==='sim'?`
      <div class="row wrap-gap"><label>Domande<input id="ms-n" type="number" min="1" max="40" value="10"></label><label>Minuti<input id="ms-min" type="number" min="1" max="120" value="10"></label></div>
      <label>Quali esercizi<select id="ms-pick"><option value="new">A caso, prima quelli non ancora fatti</option><option value="order">In ordine, dall'esercizio indicato</option></select></label>
      <label id="ms-from-l" hidden>Dall'esercizio n.<input id="ms-from" type="number" min="1" value="1"></label>
      <p class="small muted">Come all'esame: un solo cronometro per tutta la prova, puoi spostarti tra le domande e segnarle, nessuna correzione fino alla consegna. Allo scadere la prova si chiude da sola.</p>
      <button class="primary" id="ms-go">Inizia la simulazione</button>`
    :`
      <div class="row wrap-gap"><label>Dall'esercizio n.<input id="ms-first" type="number" min="1" value="1"></label><label>Secondi per domanda<input id="ms-sec-q" type="number" min="10" max="600" value="50"></label><label>Opzioni<select id="ms-opt"><option>5</option><option>4</option></select></label></div>
      ${secs.length?`<label class="chk"><input type="checkbox" id="ms-now" checked><span>Mostra subito se è giusta</span></label>`:''}
      <button class="primary" id="ms-go">Inizia</button>`}`;
  side.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>renderManSetup(b.dataset.mode));
  const part=$('#ms-part');
  if(mode==='sim'){
    const applyDef=()=>{ const d=SIM_DEF[$('#ms-sec').value]; $('#ms-n').value=d.n; $('#ms-min').value=d.min; };
    $('#ms-sec').onchange=applyDef;
    $('#ms-pick').onchange=()=>{ $('#ms-from-l').hidden=$('#ms-pick').value!=='order'; };
    if(part) part.onchange=()=>{ const x=secs[+part.value]; $('#ms-from').value=x.min; if(/^Test/.test(x.name)){ $('#ms-pick').value='order'; $('#ms-from-l').hidden=false; $('#ms-n').value=x.count; } };
    $('#ms-go').onclick=()=>{ const x=secs[+part.value], n=Math.max(1,+$('#ms-n').value||10), mins=Math.max(1,+$('#ms-min').value||10), sec=$('#ms-sec').value;
      const all=Object.keys(x.keys).map(Number).sort((a,b)=>a-b); let list;
      if($('#ms-pick').value==='order'){ const from=+$('#ms-from').value||x.min; list=all.filter(k=>k>=from).slice(0,n); }
      else { const done=doneSet(x); const fresh=R.shuffle(all.filter(k=>!done.has(k))), old=R.shuffle(all.filter(k=>done.has(k))); list=fresh.concat(old).slice(0,n).sort((a,b)=>a-b); }
      if(!list.length) return;
      startSim(sec,x,list,mins); };
  } else {
    const dflt={abstract:[50,5],numerical:[120,5],verbal:[105,4]};
    $('#ms-sec').onchange=()=>{ const d=dflt[$('#ms-sec').value]; $('#ms-sec-q').value=d[0]; $('#ms-opt').value=d[1]; };
    if(part){ const upd=()=>{ const x=secs[+part.value]; $('#ms-first').value=x.min; }; part.onchange=upd; upd(); }
    $('#ms-go').onclick=()=>{
      const x=part?secs[+part.value]:null, first=Math.max(1,+$('#ms-first').value||1);
      MAN.run={sec:$('#ms-sec').value,label:x?x.name:'',part:x,auto:!!x,now:x?$('#ms-now').checked:true,first,num:first,per:Math.max(10,+$('#ms-sec-q').value||50),opt:+$('#ms-opt').value,start:Date.now(),qStart:Date.now(),items:[],ans:null,ansMs:0,last:null};
      clearInterval(TIMER); TIMER=setInterval(manTick,250); gotoExercise(first); renderManSide(); };
  }
}

// ---------- exam simulation on the manual: N questions, one countdown, results at the end ----------
function startSim(sec,part,list,mins){
  MAN.hideBefore=MAN.hide; MAN.hide=true; const h=$('#mv-hide'); if(h){ h.checked=true; h.disabled=true; } MAN.pages.forEach(p=>{ if(p.rendered) drawMasks(p); });
  MAN.run={sim:true,sec,part,label:part.name,list,i:0,ans:{},flag:{},ms:{},opt:SIM_DEF[sec].opt,per:SIM_DEF[sec].per,start:Date.now(),last:Date.now(),deadline:Date.now()+mins*60000,secs:mins*60};
  clearInterval(TIMER); TIMER=setInterval(simTick,250); gotoExercise(list[0]); renderSimSide();
}
function simAccount(){ const R=MAN.run; if(!R||!R.sim) return; const now=Date.now(), k=R.list[R.i]; R.ms[k]=(R.ms[k]||0)+(now-R.last); R.last=now; }
function simTick(){ const R=MAN.run; if(!R||!R.sim) return; simAccount(); const left=(R.deadline-Date.now())/1000; const el=$('#sim-clock'); if(el){ el.textContent=fmtT(left); el.classList.toggle('low',left<=Math.min(120,R.secs*0.15)); } if(left<=0) simEnd(true); }
function simGo(i){ const R=MAN.run; if(i<0||i>=R.list.length) return; simAccount(); R.i=i; gotoExercise(R.list[i]); renderSimSide(); }
function renderSimSide(){
  const R=MAN.run, side=$('#man-side'); if(!side) return; const k=R.list[R.i], L=LETTERS.slice(0,R.opt).split(''), a=R.ans[k];
  const answered=R.list.filter(x=>R.ans[x]).length;
  side.innerHTML=`<div class="row spread"><span class="eyebrow">Simulazione · ${esc(SEC[R.sec].it)} · ${esc(R.label)}</span></div>
    <div class="row spread"><span class="clock mono big2" id="sim-clock">--:--</span><span class="small muted">${answered}/${R.list.length} risposte</span></div>
    <div class="qgrid">${R.list.map((x,j)=>`<button class="cell ${j===R.i?'cur':''} ${R.ans[x]?'ans':''} ${R.flag[x]?'flag':''}" data-j="${j}" title="Esercizio ${x}">${j+1}</button>`).join('')}</div>
    <div class="row spread"><h2>Domanda ${R.i+1} di ${R.list.length}</h2><button class="ghost small" id="sim-flag">${R.flag[k]?'Togli segno':'Segna'}</button></div>
    <p class="small muted">Nel manuale: <b>esercizio ${k}</b> · <a href="#" id="sim-find">mostralo</a></p>
    <div class="step active"><div class="stephead"><span class="stepn">?</span><span>La tua risposta</span>${a?`<span class="chosen">${a}</span>`:''}</div>
      <div class="seg big">${L.map(l=>`<button data-a="${l}" class="${a===l?'sel':''}" aria-pressed="${a===l}">${l}</button>`).join('')}</div></div>
    <div class="row spread"><button id="sim-prev" ${R.i===0?'disabled':''}>← Precedente</button>${R.i<R.list.length-1?'<button class="primary" id="mq-next">Successiva →</button>':'<button class="primary" id="sim-end2">Consegna</button>'}</div>
    <div class="row"><button class="ghost" id="sim-end">Consegna adesso</button></div>
    <div id="sim-confirm" class="stack" hidden><p><b>Consegnare?</b> <span id="sim-cmsg"></span></p><div class="row"><button class="primary" id="sim-yes">Consegna</button><button id="sim-no">Continua</button></div></div>
    <p class="small muted">Tastiera: A–E per rispondere, Invio per la successiva.</p>`;
  simTick();
  side.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>simGo(+b.dataset.j));
  side.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{ R.ans[k]=b.dataset.a; renderSimSide(); });
  $('#sim-flag').onclick=()=>{ R.flag[k]=!R.flag[k]; renderSimSide(); };
  $('#sim-find').onclick=e=>{ e.preventDefault(); gotoExercise(k); };
  if($('#sim-prev')) $('#sim-prev').onclick=()=>simGo(R.i-1);
  if($('#mq-next')) $('#mq-next').onclick=()=>simGo(R.i+1);
  const ask=()=>{ const blank=R.list.length-answered, fl=R.list.filter(x=>R.flag[x]).length; $('#sim-cmsg').textContent=(blank?blank+' senza risposta. ':'Tutte risposte. ')+(fl?fl+' segnate.':''); $('#sim-confirm').hidden=false; };
  $('#sim-end').onclick=ask; if($('#sim-end2')) $('#sim-end2').onclick=ask;
  $('#sim-yes').onclick=()=>simEnd(false); $('#sim-no').onclick=()=>{ $('#sim-confirm').hidden=true; };
}
function simEnd(auto){
  const R=MAN.run; if(!R||!R.sim||R.done) return; simAccount(); R.done=true; clearInterval(TIMER);
  const rows=R.list.map(k=>({num:k,ans:R.ans[k]||'',key:R.part.keys[k],ms:R.ms[k]||0,why:R.part.why[k]||''})); rows.forEach(r=>r.ok=r.ans===r.key);
  const score=rows.filter(r=>r.ok).length, used=Math.round((Math.min(Date.now(),R.deadline)-R.start)/1000);
  const att=rows.map(r=>({sec:'sheet',id:'m'+r.num,ok:r.ok,ans:r.ans?LETTERS.indexOf(r.ans):null,key:LETTERS.indexOf(r.key),ms:r.ms,ch:0,fl:!!R.flag[r.num]}));
  DB.sessions.unshift({id:Date.now(),date:R.start,kind:'sheet',label:'Manuale · simulazione · '+SEC[R.sec].it+' · '+R.label,parts:[{sec:R.sec,n:att.length,score,secs:used,limit:R.secs,auto:!!auto,att}]});
  DB.man=DB.man||{}; const key=MAN.name+'|'+R.label; DB.man[key]=Array.from(new Set((DB.man[key]||[]).concat(R.list))); saveDB();
  MAN.hide=MAN.hideBefore!==undefined?MAN.hideBefore:true; const h=$('#mv-hide'); if(h){ h.disabled=false; h.checked=MAN.hide; }
  const passNote=R.sec==='abstract'&&R.list.length===10?`<p class="small muted">All'esame l'astratto si somma al numerico: servono almeno 10/20 in totale.</p>`:R.sec==='verbal'&&R.list.length===20?`<p class="small muted">Soglia del verbale all'esame: 10/20.</p>`:'';
  const part=R.part; MAN.run=null;
  $('#man-side').innerHTML=`<h2>Risultato della simulazione</h2>
    <p><b class="mono big2">${score}/${rows.length}</b> giuste · tempo usato <span class="mono">${fmtT(used)}</span> su ${fmtT(R.secs)}${auto?' · consegna automatica allo scadere':''}</p>${passNote}
    <div class="tblwrap"><table class="times"><thead><tr><th>#</th><th>Es.</th><th>Tua</th><th>Giusta</th><th>Tempo</th><th></th></tr></thead><tbody>
    ${rows.map((r,j)=>`<tr><td class="mono">${j+1}</td><td class="mono">${r.num}</td><td class="mono">${r.ans||'–'}</td><td class="mono">${r.key}</td><td class="mono ${r.ms/1000>R.per?'badc':''}">${fmtT(r.ms/1000)}</td><td>${r.ok?'<span class="okc">✓</span>':'<span class="badc">✗</span>'}</td></tr>`).join('')}</tbody></table></div>
    <h3>Rivedi gli errori</h3>
    ${rows.filter(r=>!r.ok).map(r=>`<details class="rev1"><summary>Esercizio ${r.num}: tua ${r.ans||'–'}, corretta ${r.key}</summary><div class="row"><button class="ghost small" data-goq="${r.num}">Vai all'esercizio e scopri la soluzione</button></div>${r.why?`<p class="small">${esc(r.why)}</p>`:''}</details>`).join('')||'<p class="muted">Nessun errore.</p>'}
    <div class="row"><button class="primary" id="mq-new">Nuova simulazione</button><button class="ghost" id="mq-free">Esercizio per esercizio</button></div>`;
  document.querySelectorAll('[data-goq]').forEach(b=>b.onclick=()=>{ const n=+b.dataset.goq; const q=part.q[n]; if(q) scrollToPageY(q.page,q.y); MAN.run={part}; revealSolution(n); MAN.run=null; });
  $('#mq-new').onclick=()=>renderManSetup('sim'); $('#mq-free').onclick=()=>renderManSetup('free');
}

function waitDoc(){ return new Promise((res,rej)=>{ let t=0; const iv=setInterval(()=>{ if(MAN.doc){clearInterval(iv);res()} else if(++t>120){clearInterval(iv);rej()} },250); }); }
function gotoExercise(num){ const R=MAN.run; if(!R||!R.part) return; const q=R.part.q[num]; if(q) scrollToPageY(q.page,q.y); }
function scrollToPageY(n,y){ if(!MAN.pages.length) return; const p=MAN.pages[n-1]; if(!p) return; const sc=p.scale||1; const top=p.el.getBoundingClientRect().top+window.scrollY+y*sc-150; window.scrollTo({top:Math.max(0,top),behavior:'smooth'}); }
function revealSolution(num){ const R=MAN.run; if(!R||!R.part) return; const s=R.part.sol[num]; if(!s) return; const p=MAN.pages[s.page-1]; if(!p) return;
  const apply=()=>{ if(!p.blocks) return; const sc=p.scale; p.blocks.forEach((b,i)=>{ if(s.y*sc>=b.y0-2&&s.y*sc<=b.y1+2) MAN.revealed[s.page+':'+i]=1; }); drawMasks(p); };
  if(p.rendered&&p.blocks) apply(); else { const iv=setInterval(()=>{ if(p.blocks){ clearInterval(iv); apply(); } },300); setTimeout(()=>clearInterval(iv),8000); } }
function manTick(){ const R=MAN.run; if(!R) return; const el=$('#mq-clock'); if(!el) return; const s=(Date.now()-R.qStart)/1000; el.textContent=fmtT(s); el.classList.toggle('low',s>R.per); const tot=$('#mq-total'); if(tot) tot.textContent=fmtT((Date.now()-R.start)/1000); }
function manNext(){ const R=MAN.run; if(!R||R.ans===null) return;
  const key=R.part?R.part.keys[R.num]:null;
  if(R.auto&&!key){ R.auto=false; R.missing=true; renderManSide(); return; } // no key for this one: ask the user
  const it={num:R.num,ans:R.ans,key,ok:R.ans===key,ms:R.ansMs,why:R.part&&R.part.why[R.num]||''};
  R.items.push(it); R.last=it; if(R.now&&R.part) revealSolution(R.num);
  R.ans=null; R.qStart=Date.now(); R.num++; R.auto=!!R.part; R.missing=false;
  if(R.part&&R.num>R.part.max){ renderManSide(true); return; }
  gotoExercise(R.num); renderManSide(); }
function renderManSide(ended){
  const R=MAN.run, side=$('#man-side'); if(!side) return;
  const L=LETTERS.slice(0,R.opt).split(''), ok=R.items.filter(x=>x.ok).length, last=R.last, show=R.now;
  const lastBox=last?(show?`<div class="result ${last.ok?'ok':'bad'}"><b>Esercizio ${last.num}: ${last.ok?'giusta ✓':'sbagliata ✗'}</b><span>${last.ans?`hai risposto ${last.ans}`:'senza risposta'}, corretta ${last.key} · ${fmtT(last.ms/1000)}</span>${last.why?`<details ${last.ok?'':'open'}><summary>Spiegazione del manuale</summary><p class="small">${esc(last.why)}</p></details>`:''}</div>`
    :`<div class="result neutral"><b>Esercizio ${last.num}: risposta ${last.ans||'saltata'} registrata</b><span>L'esito lo vedi alla fine.</span></div>`):'';
  if(ended){ side.innerHTML=`${lastBox}<h2>Sezione finita</h2><p>Hai fatto tutti gli esercizi di ${esc(R.label)}.</p><div class="row"><button class="primary" id="mq-end">Vedi il risultato e salva</button></div>`; $('#mq-end').onclick=manEnd; return; }
  const manualKey=!R.auto;
  side.innerHTML=`<div class="row spread"><span class="eyebrow">${esc(SEC[R.sec].it)}${R.label?' · '+esc(R.label):''}</span><span class="small muted">totale <span class="mono" id="mq-total">--:--</span></span></div>
    <div class="row spread"><h2>Esercizio ${R.num}</h2><span class="clock mono" id="mq-clock">00:00</span></div>
    <p class="small muted">Obiettivo ${fmtT(R.per)}${show?` · finora <b>${ok}/${R.items.length}</b> giuste`:` · ${R.items.length} risposte date`}</p>
    <div class="step active">
      <div class="stephead"><span class="stepn">1</span><span>La tua risposta</span>${R.ans!==null?`<span class="chosen">${R.ans||'saltata'}</span>`:''}</div>
      <div class="seg big">${L.map(l=>`<button data-a="${l}" class="${R.ans===l?'sel':''}" aria-pressed="${R.ans===l}">${l}</button>`).join('')}<button data-a="" class="skip ${R.ans===''?'sel':''}">Salta</button></div>
    </div>
    ${manualKey?`<div class="step ${R.ans===null?'locked':'active'}"><div class="stephead"><span class="stepn">2</span><span>Risposta corretta (dal manuale)</span></div>
      ${R.missing?'<p class="small muted">Non ho trovato la soluzione di questo esercizio nel PDF: inseriscila tu.</p>':''}
      <div class="seg big keyrow">${L.map(l=>`<button data-k="${l}" ${R.ans===null?'disabled':''}>${l}</button>`).join('')}</div></div>`
      :`<button class="primary nextbtn" id="mq-next" ${R.ans===null?'disabled':''}>Avanti →</button><p class="small muted">${R.ans===null?'Scegli una lettera, poi Avanti (o tasto Invio).':'Puoi cambiare lettera prima di premere Avanti.'}</p>`}
    ${lastBox}
    ${R.items.length?`<details><summary>Esercizi fatti (${R.items.length})</summary><div class="tblwrap"><table class="times"><thead><tr><th>Es.</th><th>Tua</th>${show?'<th>Giusta</th>':''}<th>Tempo</th>${show?'<th></th>':''}</tr></thead><tbody>${R.items.map(x=>`<tr><td class="mono">${x.num}</td><td class="mono">${x.ans||'–'}</td>${show?`<td class="mono">${x.key}</td>`:''}<td class="mono ${x.ms/1000>R.per?'badc':''}">${fmtT(x.ms/1000)}</td>${show?`<td>${x.ok?'<span class="okc">✓</span>':'<span class="badc">✗</span>'}</td>`:''}</tr>`).reverse().join('')}</tbody></table></div>
      <button class="ghost small" id="mq-undo-last">Annulla l'ultimo esercizio</button></details>`:''}
    <div class="row"><button class="${R.items.length?'':'ghost'}" id="mq-end" ${R.items.length?'':'disabled'}>Termina e salva</button></div>`;
  manTick();
  side.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{ if(R.ans===null) R.ansMs=Date.now()-R.qStart; R.ans=b.dataset.a; renderManSide(); });
  side.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ if(R.ans===null) return; const key=b.dataset.k;
    const it={num:R.num,ans:R.ans,key,ok:R.ans===key,ms:R.ansMs,why:''}; R.items.push(it); R.last=it; R.ans=null; R.qStart=Date.now(); R.num++; R.auto=!!R.part; R.missing=false; gotoExercise(R.num); renderManSide(); });
  if($('#mq-next')) $('#mq-next').onclick=manNext;
  if($('#mq-undo-last')) $('#mq-undo-last').onclick=()=>{ const x=R.items.pop(); if(x) R.num=x.num; R.last=null; R.ans=null; R.qStart=Date.now(); gotoExercise(R.num); renderManSide(); };
  $('#mq-end').onclick=manEnd;
}
function manEnd(){
  const R=MAN.run; if(!R) return; clearInterval(TIMER);
  const att=R.items.map(x=>({sec:'sheet',id:'m'+x.num,ok:x.ok,ans:x.ans?LETTERS.indexOf(x.ans):null,key:LETTERS.indexOf(x.key),ms:x.ms,ch:0,fl:false}));
  const score=att.filter(a=>a.ok).length, slow=att.filter(a=>a.ms/1000>R.per).length;
  DB.sessions.unshift({id:Date.now(),date:R.start,kind:'sheet',label:'Manuale · '+SEC[R.sec].it+(R.label?' · '+R.label:''),parts:[{sec:R.sec,n:att.length,score,secs:Math.round((Date.now()-R.start)/1000),limit:null,att}]}); saveDB();
  const wrong=R.items.filter(x=>!x.ok);
  MAN.run=null;
  $('#man-side').innerHTML=`<h2>Risultato</h2><p><b class="mono big2">${score}/${att.length}</b> giuste</p><p class="muted">${slow} esercizi oltre ${fmtT(R.per)}. Salvato in Statistiche → Fogli risposte.</p>
    ${wrong.length?`<h3>Da rivedere</h3><ul class="bars">${wrong.map(x=>`<li><span>Esercizio ${x.num}: tua ${x.ans||'–'}, corretta ${x.key}</span><button class="ghost small" data-goq="${x.num}">Vai</button></li>`).join('')}</ul>`:''}
    <div class="row"><button class="primary" id="mq-new">Nuova sessione</button></div>`;
  const part=R.part; document.querySelectorAll('[data-goq]').forEach(b=>b.onclick=()=>{ const q=part&&part.q[+b.dataset.goq]; if(q) scrollToPageY(q.page,q.y); });
  $('#mq-new').onclick=()=>renderManSetup();
}
document.addEventListener('keydown',e=>{
  const R=MAN.run; if(!R||!$('#man-side')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey) return;
  const k=e.key.toUpperCase(), L=LETTERS.slice(0,R.opt);
  if(e.key==='Enter'){ const nb=$('#mq-next'); if(nb&&!nb.disabled){ nb.click(); e.preventDefault(); } return; }
  if(R.sim){ if(k.length===1&&LETTERS.slice(0,R.opt).includes(k)){ const b=document.querySelector(`[data-a="${k}"]`); if(b){ b.click(); e.preventDefault(); } } return; }
  if(k.length===1&&L.includes(k)){ const sel=(!R.auto&&R.ans!==null)?`[data-k="${k}"]`:`[data-a="${k}"]`; const b=document.querySelector(sel); if(b){ b.click(); e.preventDefault(); } }
});

// ---------- continuous PDF viewer (pdf.js); printed solutions are covered until clicked ----------
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadPdfJs(){ return new Promise((res,rej)=>{ if(window.pdfjsLib) return res(window.pdfjsLib); const sc=document.createElement('script'); sc.src=PDFJS+'pdf.min.js'; sc.onload=()=>{ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'; res(window.pdfjsLib); }catch(e){ rej(e) } }; sc.onerror=()=>rej(new Error('pdfjs')); document.head.appendChild(sc); }); }
async function initViewer(){
  const view=$('#man-view'); if(!view) return;
  try{
    const lib=await loadPdfJs();
    if(!MAN.doc){ const buf=await MAN.blob.arrayBuffer(); MAN.doc=await lib.getDocument({data:buf}).promise; }
    buildPages();
  }catch(e){
    view.innerHTML=`<iframe title="Manuale" src="${MAN.url}" class="manframe"></iframe>`;
    const m=$('#mv-msg'); if(m) m.textContent='Senza connessione il PDF si apre nel visualizzatore del browser e le soluzioni non si possono coprire.';
    const h=$('#mv-hide'); if(h) h.disabled=true;
  }
}
async function buildPages(){
  const view=$('#man-view'); if(!view||!MAN.doc) return;
  if(MAN.obs) MAN.obs.disconnect(); if(MAN.vis) MAN.vis.disconnect();
  const first=await MAN.doc.getPage(1), base=first.getViewport({scale:1});
  const width=Math.max(280,Math.min(view.clientWidth-16,960)), scale=width/base.width;
  view.innerHTML=''; MAN.pages=[];
  for(let n=1;n<=MAN.doc.numPages;n++){
    const w=document.createElement('div'); w.className='pagewrap'; w.dataset.n=n; w.style.width=width+'px'; w.style.height=Math.round(base.height*scale)+'px';
    w.innerHTML=`<span class="pnum">${n}</span>`; view.appendChild(w); MAN.pages.push({n,el:w,scale,rendered:false});
  }
  MAN.obs=new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ const p=MAN.pages[+en.target.dataset.n-1]; if(!p.rendered) renderPage(p); } }),{rootMargin:'1200px 0px'});
  MAN.vis=new IntersectionObserver(es=>{ es.forEach(en=>{ if(en.isIntersecting) setCurrent(+en.target.dataset.n); }); },{rootMargin:'-45% 0px -50% 0px'});
  MAN.pages.forEach(p=>{ MAN.obs.observe(p.el); MAN.vis.observe(p.el); });
  setCurrent(MAN.page); if(MAN.page>1) scrollToPage(MAN.page,true);
}
function setCurrent(n){ MAN.page=n; const pg=$('#mv-pg'); if(pg&&MAN.doc) pg.textContent=`Pagina ${n} / ${MAN.doc.numPages}`; const g=$('#mv-goto'); if(g&&document.activeElement!==g) g.value=n; }
function scrollToPage(n,instant){ if(!MAN.pages.length) return; n=Math.max(1,Math.min(MAN.pages.length,n)); const el=MAN.pages[n-1].el; const y=el.getBoundingClientRect().top+window.scrollY-120; window.scrollTo({top:y,behavior:instant?'auto':'smooth'}); setCurrent(n); }
async function renderPage(p){
  p.rendered=true;
  const page=await MAN.doc.getPage(p.n), vp=page.getViewport({scale:p.scale}), ratio=window.devicePixelRatio||1;
  const c=document.createElement('canvas'); c.width=Math.floor(vp.width*ratio); c.height=Math.floor(vp.height*ratio); c.style.width=vp.width+'px'; c.style.height=vp.height+'px';
  const ctx=c.getContext('2d'); ctx.setTransform(ratio,0,0,ratio,0,0);
  await page.render({canvasContext:ctx,viewport:vp}).promise;
  p.el.style.height=vp.height+'px'; p.el.prepend(c); p.vp=vp;
  p.blocks=await blocksForPage(p.n,vp); drawMasks(p);
}
function drawMasks(p){
  p.el.querySelectorAll('.mask').forEach(m=>m.remove());
  if(!MAN.hide||!p.blocks) return;
  p.blocks.forEach((b,i)=>{ const id=p.n+':'+i; if(MAN.revealed[id]) return;
    const m=document.createElement('button'); m.className='mask'; m.style.top=Math.max(0,b.y0)+'px'; m.style.height=Math.max(20,b.y1-b.y0)+'px';
    m.innerHTML=`<span>${b.all?'Soluzioni del test nascoste':'Soluzione nascosta'} · clicca per vederla</span>`;
    m.onclick=()=>{ MAN.revealed[id]=1; m.remove(); }; p.el.appendChild(m); });
}
window.addEventListener('resize',()=>{ clearTimeout(window._mvr); window._mvr=setTimeout(()=>{ if(MAN.doc&&$('#man-view')) buildPages(); },300); });

// ---- text analysis: find printed solutions ----
function lineGroups(items,vp){
  const L=[];
  items.forEach(it=>{ const t=it.transform; if(Math.abs(t[1])>0.01||Math.abs(t[2])>0.01||!it.str.trim()) return; // skip rotated text (watermark) and blanks
    const [x,y]=vp.convertToViewportPoint(t[4],t[5]); const h=Math.abs(t[3])*vp.scale;
    let ln=L.find(l=>Math.abs(l.y-y)<Math.max(3,h*0.4)); if(!ln){ ln={y,h,x0:x,parts:[]}; L.push(ln); }
    ln.parts.push({x,s:it.str}); ln.x0=Math.min(ln.x0,x); ln.h=Math.max(ln.h,h); });
  L.forEach(l=>{ l.parts.sort((a,b)=>a.x-b.x); l.text=l.parts.map(p=>p.s).join(' ').replace(/\s+/g,' ').trim(); });
  return L.sort((a,b)=>a.y-b.y);
}
function solutionBlocks(lines,vp,openTop){
  const H=vp.height, W=vp.width, top=H*0.09, bottom=H-H*0.04;
  const isQ=l=>/^\d{1,3}\s?\.\s*\S/.test(l.text)&&l.x0<W*0.25&&!/Risposta/i.test(l.text);
  const isSol=l=>/^(\d{1,3}\s?\.\s*)?Risposta\s+corretta/.test(l.text);
  const isKeyHead=l=>/Risposte\s+del\s+test/i.test(l.text);
  const B=[];
  if(openTop){ const firstQ=lines.find(l=>l.y>top&&(isQ(l)||isSol(l)||isKeyHead(l))); const first=lines.find(l=>l.y>top);
    if(first&&(!firstQ||first!==firstQ)){ const end=firstQ?firstQ.y-firstQ.h-6:bottom; if(end>first.y-first.h) B.push({y0:first.y-first.h-4,y1:end}); } }
  lines.forEach((l,i)=>{
    if(isKeyHead(l)){ B.push({y0:l.y+4,y1:bottom,all:true}); return; }
    if(!isSol(l)) return;
    const nextQ=lines.slice(i+1).find(isQ);
    B.push({y0:l.y-l.h-4,y1:nextQ?nextQ.y-nextQ.h-6:bottom});
  });
  B.sort((a,b)=>a.y0-b.y0); const M=[]; B.forEach(b=>{ const last=M[M.length-1]; if(last&&b.y0<=last.y1+4){ last.y1=Math.max(last.y1,b.y1); last.all=last.all||b.all; } else M.push(Object.assign({},b)); });
  return M;
}
async function blocksForPage(n,vp){
  const page=await MAN.doc.getPage(n); const v=vp||page.getViewport({scale:1});
  const lines=lineGroups((await page.getTextContent()).items,v);
  let openTop=false;
  if(n>1){ const pp=await MAN.doc.getPage(n-1); const pv=pp.getViewport({scale:1}); const pl=lineGroups((await pp.getTextContent()).items,pv); const pb=solutionBlocks(pl,pv,false); openTop=pb.length>0&&pb[pb.length-1].y1>=pv.height-pv.height*0.04-1; }
  return solutionBlocks(lines,v,openTop);
}

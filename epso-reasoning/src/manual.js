// ---------- "Manuale": practise on the user's own PDF, opened locally; the file never leaves the browser ----------
const MAN={url:null,name:'',run:null,blob:null,doc:null,page:1,hide:true,revealed:{},pages:[],obs:null,vis:null};
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
  $('#man-change').onclick=()=>{ manForget(); if(MAN.url) URL.revokeObjectURL(MAN.url); MAN.url=null; MAN.run=null; MAN.doc=null; clearInterval(TIMER); renderManualPick(); };
  $('#mv-go').onclick=()=>scrollToPage(+$('#mv-goto').value||1);
  $('#mv-goto').onkeydown=e=>{ if(e.key==='Enter') scrollToPage(+e.target.value||1); };
  $('#mv-hide').onchange=e=>{ MAN.hide=e.target.checked; MAN.pages.forEach(p=>{ if(p.rendered) drawMasks(p); }); };
  MAN.run?renderManSide():renderManSetup();
  initViewer();
}

// ---------- answer sheet ----------
function renderManSetup(){
  const side=$('#man-side');
  side.innerHTML=`<h2>Nuova sessione</h2>
    <label>Prova<select id="ms-sec"><option value="abstract">Astratto</option><option value="numerical">Numerico</option><option value="verbal">Verbale</option></select></label>
    <label>Etichetta (facoltativa)<input id="ms-lab" type="text" maxlength="80" placeholder="es. Cap. 4, esercizi di allenamento"></label>
    <div class="row wrap-gap"><label>Primo esercizio n.<input id="ms-first" type="number" min="1" value="1"></label><label>Secondi per domanda<input id="ms-sec-q" type="number" min="10" max="600" value="50"></label><label>Opzioni<select id="ms-opt"><option>5</option><option>4</option></select></label></div>
    <ol class="plan small"><li>Guarda l'esercizio nel PDF e clicca <b>la tua risposta</b>.</li><li>Clicca il riquadro grigio nel PDF per vedere la soluzione.</li><li>Clicca <b>la risposta corretta</b>: il programma registra l'esito e passa all'esercizio successivo.</li></ol>
    <button class="primary" id="ms-go">Inizia</button>`;
  const dflt={abstract:[50,5],numerical:[120,5],verbal:[105,4]};
  $('#ms-sec').onchange=()=>{ const d=dflt[$('#ms-sec').value]; $('#ms-sec-q').value=d[0]; $('#ms-opt').value=d[1]; };
  $('#ms-go').onclick=()=>{
    MAN.run={sec:$('#ms-sec').value,label:$('#ms-lab').value.trim(),first:Math.max(1,+$('#ms-first').value||1),per:Math.max(10,+$('#ms-sec-q').value||50),opt:+$('#ms-opt').value,start:Date.now(),qStart:Date.now(),items:[],ans:null,ansMs:0,last:null};
    clearInterval(TIMER); TIMER=setInterval(manTick,250); renderManSide(); };
}
function manTick(){ const R=MAN.run; if(!R) return; const el=$('#mq-clock'); if(!el) return; const s=(Date.now()-R.qStart)/1000; el.textContent=fmtT(s); el.classList.toggle('low',s>R.per); const tot=$('#mq-total'); if(tot) tot.textContent=fmtT((Date.now()-R.start)/1000); }
function renderManSide(){
  const R=MAN.run, side=$('#man-side'); if(!side) return;
  const L=LETTERS.slice(0,R.opt).split(''), num=R.first+R.items.length, ok=R.items.filter(x=>x.ok).length;
  const last=R.last;
  side.innerHTML=`<div class="row spread"><span class="eyebrow">${esc(SEC[R.sec].it)}${R.label?' · '+esc(R.label):''}</span><span class="small muted">totale <span class="mono" id="mq-total">--:--</span></span></div>
    ${last?`<div class="result ${last.ok?'ok':'bad'}"><b>Esercizio ${last.num}: ${last.ok?'giusta ✓':'sbagliata ✗'}</b><span>${last.ans?`hai risposto ${last.ans}`:'senza risposta'}, corretta ${last.key} · ${fmtT(last.ms/1000)}</span></div>`:''}
    <div class="row spread"><h2>Esercizio ${num}</h2><span class="clock mono" id="mq-clock">00:00</span></div>
    <p class="small muted">Obiettivo ${fmtT(R.per)} · finora <b>${ok}/${R.items.length}</b> giuste</p>
    <div class="step ${R.ans===null?'active':'done'}">
      <div class="stephead"><span class="stepn">1</span><span>La tua risposta</span>${R.ans!==null?`<span class="chosen">${R.ans||'nessuna'} ✓</span>`:''}</div>
      <div class="seg big">${L.map(l=>`<button data-a="${l}" class="${R.ans===l?'sel':''}" aria-pressed="${R.ans===l}">${l}</button>`).join('')}<button data-a="" class="skip ${R.ans===''?'sel':''}">Salta</button></div>
      ${R.ans!==null?'<p class="small muted">Puoi ancora cambiarla cliccando un\'altra lettera.</p>':''}
    </div>
    <div class="step ${R.ans===null?'locked':'active'}">
      <div class="stephead"><span class="stepn">2</span><span>Risposta corretta (dal manuale)</span></div>
      <div class="seg big keyrow">${L.map(l=>`<button data-k="${l}" ${R.ans===null?'disabled':''}>${l}</button>`).join('')}</div>
      <p class="small muted">${R.ans===null?'Prima scegli la tua risposta.':'Clicca il riquadro grigio nel PDF per vedere la soluzione, poi la lettera giusta qui.'}</p>
    </div>
    ${R.items.length?`<details ${R.items.length<=8?'open':''}><summary>Esercizi fatti (${R.items.length})</summary><div class="tblwrap"><table class="times"><thead><tr><th>Es.</th><th>Tua</th><th>Giusta</th><th>Tempo</th><th></th></tr></thead><tbody>${R.items.map(x=>`<tr><td class="mono">${x.num}</td><td class="mono">${x.ans||'–'}</td><td class="mono">${x.key}</td><td class="mono ${x.ms/1000>R.per?'badc':''}">${fmtT(x.ms/1000)}</td><td>${x.ok?'<span class="okc">✓</span>':'<span class="badc">✗</span>'}</td></tr>`).reverse().join('')}</tbody></table></div>
      <button class="ghost small" id="mq-undo-last">Annulla l'ultimo esercizio</button></details>`:''}
    <div class="row"><button class="primary" id="mq-end" ${R.items.length?'':'disabled'}>Termina e salva</button></div>`;
  manTick();
  side.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{ if(R.ans===null) R.ansMs=Date.now()-R.qStart; R.ans=b.dataset.a; renderManSide(); });
  side.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ if(R.ans===null) return; const key=b.dataset.k;
    const it={num:R.first+R.items.length,ans:R.ans,key,ok:R.ans===key,ms:R.ansMs}; R.items.push(it); R.last=it; R.ans=null; R.qStart=Date.now(); renderManSide(); });
  if($('#mq-undo-last')) $('#mq-undo-last').onclick=()=>{ R.items.pop(); R.last=null; R.ans=null; R.qStart=Date.now(); renderManSide(); };
  $('#mq-end').onclick=()=>{ clearInterval(TIMER);
    const att=R.items.map((x,i)=>({sec:'sheet',id:'m'+x.num,ok:x.ok,ans:x.ans?LETTERS.indexOf(x.ans):null,key:LETTERS.indexOf(x.key),ms:x.ms,ch:0,fl:false}));
    const score=att.filter(a=>a.ok).length, slow=att.filter(a=>a.ms/1000>R.per).length;
    DB.sessions.unshift({id:Date.now(),date:R.start,kind:'sheet',label:'Manuale · '+SEC[R.sec].it+(R.label?' · '+R.label:''),parts:[{sec:R.sec,n:att.length,score,secs:Math.round((Date.now()-R.start)/1000),limit:null,att}]}); saveDB();
    MAN.run=null;
    side.innerHTML=`<h2>Sessione salvata</h2><p><b class="mono big2">${score}/${att.length}</b> giuste</p><p class="muted">${slow} esercizi oltre ${fmtT(R.per)}. La trovi in Statistiche → Fogli risposte.</p><div class="row"><button class="primary" id="mq-new">Nuova sessione</button></div>`;
    $('#mq-new').onclick=()=>renderManSetup(); };
}
document.addEventListener('keydown',e=>{
  const R=MAN.run; if(!R||!$('#man-side')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey) return;
  const k=e.key.toUpperCase(), L=LETTERS.slice(0,R.opt);
  if(L.includes(k)&&k.length===1){ const sel=R.ans===null?`[data-a="${k}"]`:`[data-k="${k}"]`; const b=document.querySelector(sel); if(b){ b.click(); e.preventDefault(); } }
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

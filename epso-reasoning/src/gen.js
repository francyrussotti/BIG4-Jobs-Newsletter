// ---------- shared helpers ----------
const R = {
  int:(a,b)=>a+Math.floor(Math.random()*(b-a+1)),
  pick:a=>a[Math.floor(Math.random()*a.length)],
  shuffle:a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a},
  sample:(a,n)=>R.shuffle(a).slice(0,n),
  chance:p=>Math.random()<p
};
const nf=(x,dp=0)=>Number(x).toLocaleString('en-GB',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LETTERS='ABCDE';

// ---------- VERBAL ----------
const Q_CORRECT='Which of the following statements is correct?';
const Q_INCORRECT='Which of the following statements is incorrect?';

// All verbal passages as "sources". Each source can produce an item.
function verbalSources(){
  const out=[];
  VERBAL_ORIGINAL.forEach(p=>out.push({pid:p.id,origin:'orig',p}));
  VERBAL_KVIZ.forEach(p=>out.push({pid:p.id,origin:'kviz',p}));
  return out;
}

function buildVerbalItem(src,forceQ){
  if(src.origin==='orig'){
    const p=src.p;
    const opts=p.o.map((o,i)=>({kind:o[0],trap:o[1],text:o[2],why:o[3],key:i===0}));
    return finishVerbal(p.id,p.topic,p.text,p.q,opts,null,p.stem,p.title);
  }
  // EUR-Lex passage: build a 4-option item from its true / false / cannot-say statements
  const p=src.p, T=p.st.filter(s=>s.k==='true'), F=p.st.filter(s=>s.k==='false'), C=p.st.filter(s=>s.k==='cannot');
  const canC=T.length>=1&&F.length+C.length>=3, canI=F.length>=1&&T.length+C.length>=3;
  let q=(canC&&canI)?(R.chance(0.8)?'c':'i'):(canC?'c':'i');
  if(forceQ==='i'&&canI) q='i'; if(forceQ==='c'&&canC) q='c';
  let key,others;
  if(q==='c'){key=R.pick(T);others=R.sample(F.concat(C),3)}
  else{key=R.pick(F);others=R.sample(T.concat(C),3)}
  const mk=(s,isKey)=>({kind:s.k,trap:s.k==='false'?'con':(s.k==='cannot'?'nd':''),text:s.s,why:s.w,key:isKey});
  const opts=[mk(key,true)].concat(others.map(s=>mk(s,false)));
  return finishVerbal(p.id,p.topic,p.text,q,opts,{url:p.url,recital:p.recital,act:p.topic});
}

const Q_CORRECT_ALT=['Which of the following statements is correct?','Which of the following statements is correct?','Which of the following statements can be deduced from the text?','Which of the following statements is supported by the passage?','Only ONE of the following statements can be correctly deduced from the passage. Which one?'];
function finishVerbal(id,topic,text,q,opts,source,stem,title){
  const sh=R.shuffle(opts);
  const key=sh.findIndex(o=>o.key);
  return {sec:'verbal',id,topic,title:title||null,text,q,options:sh,key,source,
    question:stem||(q==='c'?R.pick(Q_CORRECT_ALT):Q_INCORRECT)};
}

// trap label for a wrong verbal choice
function verbalTrap(item,choice){
  const o=item.options[choice]; if(!o||o.key) return null;
  if(item.q==='i'){ return o.kind==='true'?'dom':'ndf'; }
  if(o.kind==='cannot') return o.trap&&o.trap!=='nd'?o.trap:'nd';
  return o.trap||'con';
}

const TRAPS={
  con:'Contraddizione con il testo non vista',
  mix:'Dettagli scambiati (numeri, soggetti, periodi)',
  qnt:'Quantificatori e portata (some / most / all / only)',
  mod:'Verbi modali e tempi (may, will, ora / prima)',
  cau:'Causa scambiata per semplice successione',
  ass:'Assunzione non presente nel testo',
  ext:'Conoscenza esterna al testo',
  gen:'Generalizzazione oltre il testo',
  cmp:'Confronto che il testo non fa',
  nd:'Affermazione non deducibile presa per vera',
  dom:"Domanda 'incorrect': scelta un'affermazione vera",
  ndf:"Domanda 'incorrect': non deducibile presa per falsa"
};

// ---------- NUMERICAL ----------
const COUNTRIES=['Austria','Belgium','Bulgaria','Croatia','Cyprus','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania','Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden'];
const fmtPct=(x,dp=1)=>(x>0?'+':'')+nf(x,dp)+'%';

// Build 5 numeric options: key + listed slips + plausible fillers. Sorted ascending like a real paper.
function numOptions(v,slips,fmt,valFilter){
  const seen=new Set(), list=[];
  const add=(x,why)=>{ if(!isFinite(x)) return false; if(valFilter&&!valFilter(x)) return false; if(why!==null&&list.some(o=>Math.abs(o.v-x)<Math.max(Math.abs(o.v),Math.abs(x))*0.02)) return false; const s=fmt(x); if(seen.has(s)) return false; seen.add(s); list.push({v:x,label:s,why}); return true; };
  if(!add(v,null)) return null;
  slips.forEach(([x,why])=>{ if(list.length<5) add(x,why); });
  let guard=0;
  while(list.length<5&&guard++<200){ const k=(0.10+Math.random()*0.28)*(R.chance(.5)?1:-1); add(v*(1+k),'valore vicino'); }
  list.sort((a,b)=>a.v-b.v);
  return {options:list.map(o=>({label:o.label,why:o.why})),key:list.findIndex(o=>o.why===null)};
}
function nameOptions(rows,keyName,trapMap){
  const names=rows.slice().sort();
  return {options:names.map(n=>({label:n,why:n===keyName?null:(trapMap[n]||'altro paese')})),key:names.indexOf(keyName)};
}

function tableHTML(caption,head,rows,note){
  return `<div class="tblwrap"><table class="data"><caption>${esc(caption)}</caption><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>i===0?`<th scope="row">${esc(c)}</th>`:`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>${note?`<p class="src">${esc(note)}</p>`:''}</div>`;
}
const FICT='Dati fittizi a scopo di esercitazione.';

function barChartSVG(title,labels,vals,unit){
  const W=520,H=260,pl=48,pb=40,pt=28,pr=12, max=Math.max(...vals), top=Math.ceil(max/ (max>100?50:10))*(max>100?50:10);
  const iw=W-pl-pr, ih=H-pt-pb, bw=iw/labels.length*0.56;
  let g='';
  for(let i=0;i<=5;i++){const y=pt+ih-ih*i/5, v=top*i/5; g+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" class="grid"/><text x="${pl-6}" y="${y+4}" text-anchor="end" class="ax">${nf(v,0)}</text>`;}
  labels.forEach((l,i)=>{const x=pl+iw*(i+0.5)/labels.length, h=ih*vals[i]/top, y=pt+ih-h;
    g+=`<rect x="${x-bw/2}" y="${y}" width="${bw}" height="${h}" class="bar"/><text x="${x}" y="${y-5}" text-anchor="middle" class="val">${nf(vals[i],0)}</text><text x="${x}" y="${H-pb+16}" text-anchor="middle" class="ax">${esc(l)}</text>`;});
  return `<figure class="chart"><figcaption>${esc(title)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${g}</svg><p class="src">${FICT}${unit?' Unità: '+esc(unit)+'.':''}</p></figure>`;
}
function pieChartSVG(title,labels,pcts){
  const cx=130,cy=120,r=95; let a0=-Math.PI/2, g='';
  const tones=['p1','p2','p3','p4','p5','p6'];
  labels.forEach((l,i)=>{const a1=a0+2*Math.PI*pcts[i]/100, large=(a1-a0)>Math.PI?1:0;
    const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    g+=`<path d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" class="${tones[i%6]}"/>`;
    const am=(a0+a1)/2; g+=`<text x="${(cx+(r*0.66)*Math.cos(am)).toFixed(1)}" y="${(cy+(r*0.66)*Math.sin(am)+4).toFixed(1)}" text-anchor="middle" class="pl">${pcts[i]}%</text>`;
    a0=a1;});
  const leg=labels.map((l,i)=>`<rect x="260" y="${30+i*26}" width="14" height="14" class="${tones[i%6]}"/><text x="282" y="${42+i*26}" class="ax">${esc(l)}</text>`).join('');
  return `<figure class="chart"><figcaption>${esc(title)}</figcaption><svg viewBox="0 0 480 240" role="img" aria-label="${esc(title)}">${g}${leg}</svg></figure>`;
}

const METRICS=[
  {n:'Tourist arrivals',u:'thousands',lo:900,hi:9000},
  {n:'New passenger cars registered',u:'thousands',lo:40,hi:900},
  {n:'Exports of machinery',u:'€ million',lo:1200,hi:24000},
  {n:'Renewable electricity generated',u:'GWh',lo:2000,hi:60000},
  {n:'Rail freight transported',u:'million tonne-km',lo:800,hi:18000}
];

function series3(lo,hi){ const a=R.int(lo,hi); const g1=1+(R.int(-80,160)/1000), g2=1+(R.int(-80,160)/1000); const b=Math.round(a*g1), c=Math.round(b*g2); return [a,b,c]; }

const NUM_T={
pct:{label:'Variazione percentuale',make(){
  const m=R.pick(METRICS), rows=R.sample(COUNTRIES,5), y0=R.int(2019,2022), Y=[y0,y0+1,y0+2];
  const data=rows.map(()=>series3(m.lo,m.hi)); const r=R.int(0,4), A=data[r][0], B=data[r][2], M=data[r][1];
  const v=(B-A)/A*100; if(Math.abs(v)<3) return NUM_T.pct.make();
  const o=numOptions(v,[[(B-A)/B*100,'base sbagliata (diviso per il valore finale)'],[(M-A)/A*100,'anno sbagliato'],[-v,'segno invertito']],x=>fmtPct(x));
  return {stim:tableHTML(`${m.n} (${m.u})`,['Country',...Y.map(String)],rows.map((c,i)=>[c,...data[i].map(x=>nf(x))]),FICT),
    question:`By approximately what percentage did ${m.n.toLowerCase()} in ${rows[r]} change between ${Y[0]} and ${Y[2]}?`,...o,
    explain:`(${nf(B)} − ${nf(A)}) ÷ ${nf(A)} × 100 = ${fmtPct(v)}. La base è sempre il valore iniziale (${Y[0]}).`};
}},
share:{label:'Quota sul totale',make(){
  const m=R.pick(METRICS), rows=R.sample(COUNTRIES,5), y0=R.int(2019,2022), Y=[y0,y0+1,y0+2];
  const data=rows.map(()=>series3(m.lo,m.hi)); const r=R.int(0,4), yi=R.int(1,2);
  const col=data.map(d=>d[yi]), tot=col.reduce((a,b)=>a+b,0), X=col[r], v=X/tot*100;
  const other=data.map(d=>d[yi===1?2:1]).reduce((a,b)=>a+b,0);
  const o=numOptions(v,[[X/(tot-X)*100,'diviso per il totale degli altri paesi'],[X/other*100,'totale dell\'anno sbagliato'],[X/Math.max(...col.filter((_,i)=>i!==r))*100,'diviso per il valore massimo']],x=>nf(x,1)+'%');
  return {stim:tableHTML(`${m.n} (${m.u})`,['Country',...Y.map(String)],rows.map((c,i)=>[c,...data[i].map(x=>nf(x))]),FICT),
    question:`In ${Y[yi]}, approximately what share of the combined total of the five countries did ${rows[r]} account for?`,...o,
    explain:`Totale ${Y[yi]} = ${nf(tot)}. Quota = ${nf(X)} ÷ ${nf(tot)} × 100 = ${nf(v,1)}%.`};
}},
percap:{label:'Valore pro capite',make(){
  const rows=R.sample(COUNTRIES,5); const pop=rows.map(()=>R.int(15,400)/10), gdp=pop.map(p=>Math.round(p*R.int(14,60))/1);
  const r=R.int(0,4), v=gdp[r]/pop[r]*1000, o2=(r+1)%5;
  const o=numOptions(v,[[v*10,'errore di unità (×10)'],[v/10,'errore di unità (÷10)'],[gdp[o2]/pop[o2]*1000,'riga sbagliata']],x=>'€'+nf(Math.round(x/10)*10));
  return {stim:tableHTML('Population and gross domestic product, 2024',['Country','Population (million)','GDP (€ billion)'],rows.map((c,i)=>[c,nf(pop[i],1),nf(gdp[i])]),FICT),
    question:`Approximately what was GDP per inhabitant in ${rows[r]} in 2024?`,...o,
    explain:`€${nf(gdp[r])} miliardi ÷ ${nf(pop[r],1)} milioni = ${nf(gdp[r]/pop[r],3)} migliaia di € ≈ €${nf(Math.round(v/10)*10)}. Miliardi ÷ milioni = migliaia.`};
}},
maxratio:{label:'Rapporto massimo (gruppo)',make(){
  for(let t=0;t<80;t++){
    const rows=R.sample(COUNTRIES,5), staff=rows.map(()=>R.int(120,980)), cases=staff.map(s=>Math.round(s*R.int(30,95)/10));
    const ratio=cases.map((c,i)=>c/staff[i]); const k=ratio.indexOf(Math.max(...ratio)), ka=cases.indexOf(Math.max(...cases)), ks=staff.indexOf(Math.min(...staff));
    if(k===ka) continue; const rs=ratio.slice().sort((x,y)=>y-x); if(rs[0]<rs[1]*1.04) continue;
    const tm={}; tm[rows[ka]]='valore assoluto più alto, non per addetto'; if(ks!==k&&ks!==ka) tm[rows[ks]]='meno personale, non più casi per addetto';
    return {stim:tableHTML('Customs offices: staff and cases handled, 2024',['Country','Staff','Cases handled'],rows.map((c,i)=>[c,nf(staff[i]),nf(cases[i])]),FICT),
      question:'Which country handled the highest number of cases per member of staff?',...nameOptions(rows,rows[k],tm),
      explain:rows.map((c,i)=>`${c}: ${nf(ratio[i],2)}`).join(' · ')+`. Il massimo è ${rows[k]}; ${rows[ka]} ha più casi in assoluto ma non per addetto.`};
  }
}},
maxgrowth:{label:'Crescita relativa massima (gruppo)',make(){
  for(let t=0;t<80;t++){
    const m=R.pick(METRICS), rows=R.sample(COUNTRIES,5), a=rows.map(()=>R.int(m.lo,m.hi)), b=a.map(x=>Math.round(x*(1+R.int(-40,260)/1000)));
    const rel=b.map((x,i)=>(x-a[i])/a[i]), abs=b.map((x,i)=>x-a[i]); const k=rel.indexOf(Math.max(...rel)), ka=abs.indexOf(Math.max(...abs));
    if(k===ka) continue; const rr=rel.slice().sort((x,y)=>y-x); if(rr[0]-rr[1]<0.02) continue;
    const tm={}; tm[rows[ka]]='aumento assoluto più alto, non percentuale';
    return {stim:tableHTML(`${m.n} (${m.u})`,['Country','2023','2024'],rows.map((c,i)=>[c,nf(a[i]),nf(b[i])]),FICT),
      question:`Which country recorded the largest percentage increase in ${m.n.toLowerCase()} between 2023 and 2024?`,...nameOptions(rows,rows[k],tm),
      explain:rows.map((c,i)=>`${c}: ${fmtPct(rel[i]*100)}`).join(' · ')+`. ${rows[ka]} ha l'aumento assoluto più alto (${nf(abs[ka])}), ma non il più alto in percentuale.`};
  }
}},
fx:{label:'Conversione valutaria',make(){
  const cur=R.sample([['Czechia','CZK',25],['Denmark','DKK',7.46],['Hungary','HUF',395],['Poland','PLN',4.3],['Romania','RON',4.98],['Sweden','SEK',11.3]],4);
  const rate=cur.map(c=>+(c[2]*(1+R.int(-30,30)/1000)).toFixed(c[2]>100?0:2));
  const eur=cur.map(()=>R.int(1800,5200)/100), price=eur.map((e,i)=>Math.round(e*rate[i]*(rate[i]>100?1:10))/(rate[i]>100?1:10));
  const inE=price.map((p,i)=>p/rate[i]); let a=0,b=1; inE.forEach((x,i)=>{if(x>inE[a])a=i}); b=a===0?1:0; inE.forEach((x,i)=>{if(i!==a&&x<inE[b])b=i});
  const v=inE[a]-inE[b];
  const o=numOptions(v,[[(price[a]-price[b])/rate[a],'differenza in valuta locale convertita con un solo tasso'],[inE[a],'solo il prezzo più alto'],[(price[a]-price[b])/rate[b],'differenza in valuta locale convertita con un solo tasso']],x=>'€'+nf(x,2),x=>x>0);
  return {stim:tableHTML('Price of the same monthly public transport pass, 2024',['Country','Currency','Price (local currency)','Exchange rate (units per €1)'],cur.map((c,i)=>[c[0],c[1],nf(price[i],price[i]%1?1:0),nf(rate[i],rate[i]>100?0:2)]),FICT),
    question:`Approximately how much more, in euro, did the pass cost in ${cur[a][0]} than in ${cur[b][0]}?`,...o,
    explain:`${cur[a][0]}: ${nf(price[a],price[a]%1?1:0)} ÷ ${rate[a]} = €${nf(inE[a],2)}. ${cur[b][0]}: ${nf(price[b],price[b]%1?1:0)} ÷ ${rate[b]} = €${nf(inE[b],2)}. Differenza = €${nf(v,2)}. Converti prima, poi sottrai.`};
}},
reverse:{label:'Percentuale inversa',make(){
  const rows=R.sample(COUNTRIES,5), now=rows.map(()=>R.int(1200,9800)), ch=rows.map(()=>R.int(-12,28)); const r=ch.findIndex(c=>c!==0)>=0?R.pick(rows.map((_,i)=>i).filter(i=>ch[i]!==0)):0;
  const V=now[r], p=ch[r]/100, v=V/(1+p);
  const o=numOptions(v,[[V*(1-p),'tolta la percentuale dal valore finale'],[V/(1-p),'segno della variazione invertito'],[V*(1+p),'percentuale applicata in avanti']],x=>nf(Math.round(x)));
  return {stim:tableHTML('Number of start-ups registered',['Country','2024','Change vs 2023'],rows.map((c,i)=>[c,nf(now[i]),fmtPct(ch[i],0)]),FICT),
    question:`Approximately how many start-ups were registered in ${rows[r]} in 2023?`,...o,
    explain:`2024 = 2023 × (1 ${p>=0?'+':'−'} ${nf(Math.abs(p),2)}). Quindi 2023 = ${nf(V)} ÷ ${nf(1+p,2)} = ${nf(Math.round(v))}. Non togliere la percentuale dal valore finale.`};
}},
compound:{label:'Proiezione a tasso costante',make(){
  const m=R.pick(METRICS), rows=R.sample(COUNTRIES,4), a=rows.map(()=>R.int(m.lo,m.hi)), b=a.map(x=>Math.round(x*(1+R.int(40,180)/1000)));
  const r=R.int(0,3), g=b[r]/a[r], v=b[r]*g*g;
  const o=numOptions(v,[[b[r]+2*(b[r]-a[r]),'crescita lineare invece che composta'],[b[r]*(1+2*(g-1)),'tasso raddoppiato invece che composto'],[b[r]*g,'un solo anno di crescita']],x=>nf(Math.round(x)));
  return {stim:tableHTML(`${m.n} (${m.u})`,['Country','2023','2024'],rows.map((c,i)=>[c,nf(a[i]),nf(b[i])]),FICT),
    question:`If ${m.n.toLowerCase()} in ${rows[r]} continues to grow at the same annual percentage rate as between 2023 and 2024, approximately what will the value be in 2026?`,...o,
    explain:`Tasso annuo = ${nf(b[r])} ÷ ${nf(a[r])} = ${nf(g,4)}. 2026 = ${nf(b[r])} × ${nf(g,4)}² ≈ ${nf(Math.round(v))}.`};
}},
pp:{label:'Punti percentuali vs %',make(){
  const rows=R.sample(COUNTRIES,5); const y=[2022,2023,2024]; const d=rows.map(()=>{let a=R.int(30,140)/10; return [a,+(a+R.int(-20,25)/10).toFixed(1),+(a+R.int(-25,30)/10).toFixed(1)].map(x=>Math.max(1.5,x))});
  let r=R.int(0,4); if(d[r][2]===d[r][0]) d[r][2]=+(d[r][0]+0.8).toFixed(1);
  const A=d[r][0],B=d[r][2],pp=+(B-A).toFixed(1),rel=(B-A)/A*100;
  const lab=x=>(x>0?'+':'')+nf(x,1)+' percentage points';
  const cand=[[lab(pp),null],[fmtPct(rel),'variazione relativa, non in punti'],[fmtPct(pp),'confusi punti e percentuale'],[lab(-pp),'segno invertito'],[lab(+(d[r][1]-A).toFixed(1)),'anno sbagliato']];
  const seen=new Set(), list=[]; cand.forEach(([l,w])=>{if(!seen.has(l)){seen.add(l);list.push({label:l,why:w})}});
  while(list.length<5){const l=lab(+(pp+R.pick([-0.6,-0.3,0.4,0.7,1.1])).toFixed(1)); if(!seen.has(l)){seen.add(l);list.push({label:l,why:'valore vicino'})}}
  const sh=R.shuffle(list);
  return {stim:tableHTML('Unemployment rate (% of labour force)',['Country',...y.map(String)],rows.map((c,i)=>[c,...d[i].map(x=>nf(x,1))]),FICT),
    question:`How did the unemployment rate in ${rows[r]} change between 2022 and 2024?`,options:sh,key:sh.findIndex(o=>o.why===null),
    explain:`${nf(B,1)}% − ${nf(A,1)}% = ${lab(pp)}. La variazione relativa (${fmtPct(rel)}) è un'altra grandezza: tra due percentuali la differenza si esprime in punti percentuali.`};
}},
pie:{label:'Grafico a torta',make(){
  const cats=R.sample(['Research','Infrastructure','Training','Administration','Digital services','Communication','Evaluation'],5);
  let p=[R.int(14,34),R.int(10,28),R.int(8,22),R.int(6,18)]; const rest=100-p.reduce((a,b)=>a+b,0); if(rest<4) return NUM_T.pie.make(); p.push(rest);
  const total=R.int(24,96)*10; const i=p.indexOf(Math.max(...p)); let j=R.pick([0,1,2,3,4].filter(x=>p[x]<p[i])); if(j===undefined) return NUM_T.pie.make();
  const v=total*(p[i]-p[j])/100;
  const o=numOptions(v,[[p[i]-p[j],'differenza in punti, non in €'],[total*p[i]/100,'solo la categoria maggiore'],[total*(p[i]+p[j])/100,'somma invece della differenza']],x=>'€'+nf(x,1)+' million',x=>x>0);
  return {stim:`<p class="lead">Total programme budget for 2025: <b>€${nf(total)} million</b>.</p>`+pieChartSVG('Allocation of the 2025 programme budget (%)',cats,p),
    question:`How much more, in € million, was allocated to ${cats[i]} than to ${cats[j]}?`,...o,
    explain:`(${p[i]}% − ${p[j]}%) × €${nf(total)} milioni = ${p[i]-p[j]}% × ${nf(total)} = €${nf(v,1)} milioni.`};
}},
bar:{label:'Grafico a barre',make(){
  const rows=R.sample(COUNTRIES,5), vals=rows.map(()=>R.int(18,96));
  const hi=Math.max(...vals), lo=Math.min(...vals); if(hi===lo) return NUM_T.bar.make();
  const v=(hi-lo)/lo*100;
  const o=numOptions(v,[[(hi-lo)/hi*100,'base sbagliata (diviso per il più alto)'],[hi-lo,'differenza assoluta'],[hi/lo*100,'rapporto invece della differenza']],x=>nf(x,0)+'%');
  return {stim:barChartSVG('Households with fibre broadband, per 100 households, 2024',rows,vals,'per 100 households'),
    question:`By approximately what percentage did the highest value shown exceed the lowest?`,...o,
    explain:`(${hi} − ${lo}) ÷ ${lo} × 100 = ${nf(v,0)}%. "Exceed" si calcola sulla base del valore più basso.`};
}},
weighted:{label:'Media ponderata',make(){
  const g=R.pick([['Women','Men'],['Under 35','35 and over'],['Headquarters','Regional offices']]);
  const n=[R.int(12,60)*100,R.int(12,60)*100], p=[R.int(5,45),R.int(5,45)]; if(n[0]===n[1]) n[1]+=700; if(p[0]===p[1]) p[1]+=6;
  const v=(n[0]*p[0]+n[1]*p[1])/(n[0]+n[1]);
  const o=numOptions(v,[[(p[0]+p[1])/2,'media semplice, non ponderata'],[n[0]*p[0]/(n[0]+n[1]),'solo il primo gruppo'],[p[0]+p[1],'somma delle percentuali']],x=>nf(x,1)+'%');
  return {stim:tableHTML('Staff of a public agency, 2024',['Group','Number of staff','Working part-time (%)'],[[g[0],nf(n[0]),p[0]+'%'],[g[1],nf(n[1]),p[1]+'%']],FICT),
    question:'Approximately what percentage of all staff work part-time?',...o,
    explain:`(${nf(n[0])} × ${p[0]}% + ${nf(n[1])} × ${p[1]}%) ÷ ${nf(n[0]+n[1])} = ${nf(n[0]*p[0]/100)} + ${nf(n[1]*p[1]/100)} su ${nf(n[0]+n[1])} = ${nf(v,1)}%. I gruppi hanno dimensioni diverse: la media semplice è sbagliata.`};
}}
};

function buildNumericalItem(tpl){
  const t=tpl||R.pick(Object.keys(NUM_T));
  let x=null; for(let g=0;g<30&&!(x&&x.options&&x.options.length===5&&x.key>=0);g++) x=NUM_T[t].make();
  return {sec:'numerical',id:'n-'+t+'-'+Math.random().toString(36).slice(2,8),tpl:t,stim:x.stim,question:x.question,options:x.options,key:x.key,explain:x.explain};
}

// ---------- ABSTRACT ----------
const SHAPES=['circle','square','triangle','hexagon','diamond'];
const SHAPE_IT={circle:'cerchio',square:'quadrato',triangle:'triangolo',hexagon:'esagono',diamond:'rombo'};
const FILLS=['white','black','grey','hatch'];
const FILL_IT={white:'bianco',black:'nero',grey:'grigio',hatch:'tratteggiato'};
const mod=(a,n)=>((a%n)+n)%n;

const AB_RULES={
  rot:{label:'Rotazione della lancetta',init(){const step=R.pick([45,90,135,-45,-90,-135]);return {step,start:R.pick([0,45,90,135,180,225,270,315])}},
    at(p,k){return mod(p.start+p.step*k,360)}, slip(p,k){const v=this.at(p,k);return R.pick([mod(v+p.step,360),mod(v-p.step,360),mod(-v,360),mod(v+180,360)]).toString()},
    desc(p){return `La lancetta ruota di ${Math.abs(p.step)}° in senso ${p.step>0?'orario':'antiorario'} a ogni passaggio.`}},
  cnt:{label:'Numero di punti',init(){const alt=R.chance(.35); if(alt) return {alt:true,start:R.int(1,3)}; const d=R.pick([1,-1]); return {alt:false,d,start:d>0?R.int(1,2):R.int(6,7)}},
    at(p,k){ if(p.alt){ return p.start+Math.ceil(k/2)*2-Math.floor(k/2); } return p.start+p.d*k },
    slip(p,k){const v=this.at(p,k); const c=[v+1,v-1,this.at(p,k-1)].filter(x=>x>=1&&x<=8&&x!==v); return R.pick(c)},
    desc(p){return p.alt?'I punti seguono lo schema +2, −1, +2, −1…':`I punti ${p.d>0?'aumentano':'diminuiscono'} di uno a ogni passaggio.`}},
  pos:{label:'Posizione del quadratino',init(){return {s:R.pick([1,2,3,-1,-2,-3]),start:R.int(0,7)}},
    at(p,k){return mod(p.start+p.s*k,8)}, slip(p,k){const v=this.at(p,k);return R.pick([mod(v+1,8),mod(v-1,8),this.at(p,k-1),mod(v+p.s,8)].filter(x=>x!==v))},
    desc(p){const a=Math.abs(p.s);return `Il quadratino si sposta di ${a} posizion${a>1?'i':'e'} in senso ${p.s>0?'orario':'antiorario'} lungo il bordo.`}},
  fill:{label:'Riempimento',init(){const per=R.pick([2,3]);return {cyc:R.sample(FILLS,per)}},
    at(p,k){return p.cyc[mod(k,p.cyc.length)]}, slip(p,k){const v=this.at(p,k);return R.pick(FILLS.filter(f=>f!==v))},
    desc(p){return `Il riempimento della figura segue il ciclo ${p.cyc.map(f=>FILL_IT[f]).join(' → ')}.`}},
  shape:{label:'Forma centrale',init(){const per=R.pick([2,3]);return {cyc:R.sample(SHAPES,per)}},
    at(p,k){return p.cyc[mod(k,p.cyc.length)]}, slip(p,k){const v=this.at(p,k);return R.pick(SHAPES.filter(s=>s!==v))},
    desc(p){return `La figura centrale segue il ciclo ${p.cyc.map(s=>SHAPE_IT[s]).join(' → ')}.`}}
};
const ATTR={rot:'rot',cnt:'cnt',pos:'pos',fill:'fill',shape:'shape'};

function buildRulesItem(hard,force){
  const n=hard?3:2;
  let names=R.sample(['rot','cnt','pos','fill','shape'],n);
  if(force&&!names.includes(force)) names=[force].concat(names.slice(0,n-1));
  const P={}; names.forEach(r=>P[r]=AB_RULES[r].init());
  // constant attributes for the rest
  const base={shape:R.pick(SHAPES),fill:R.pick(FILLS),rot:null,cnt:null,pos:null};
  // elements not in rules: sometimes shown as constants (noise)
  if(!P.rot&&R.chance(.4)) base.rot=R.pick([0,90,180,270]);
  if(!P.cnt&&R.chance(.4)) base.cnt=R.int(1,5);
  if(!P.pos&&R.chance(.3)) base.pos=R.int(0,7);
  const frame=k=>{const f=Object.assign({},base); names.forEach(r=>{f[r]=AB_RULES[r].at(P[r],k)}); return f};
  const series=[0,1,2,3,4].map(frame), ans=frame(5);
  const sig=f=>JSON.stringify([f.shape,f.fill,f.rot,f.cnt,f.pos]);
  const opts=[{f:ans,broken:[]}], seen=new Set([sig(ans)]);
  let guard=0;
  while(opts.length<5&&guard++<300){
    const nb=guard>120?2:1; const br=R.sample(names,Math.min(nb,names.length)); const f=Object.assign({},ans);
    br.forEach(r=>{let v=AB_RULES[r].slip(P[r],5); if(r==='rot'||r==='cnt'||r==='pos') v=Number(v); f[r]=v});
    const s=sig(f); if(seen.has(s)) continue; seen.add(s); opts.push({f,broken:br});
  }
  const sh=R.shuffle(opts);
  return {sec:'abstract',id:'a-'+Math.random().toString(36).slice(2,8),rules:names,hard:!!hard,series,options:sh.map(o=>({frame:o.f,broken:o.broken})),key:sh.findIndex(o=>o.broken.length===0),
    explain:names.map(r=>AB_RULES[r].desc(P[r])).join(' ')};
}

const MARK=[[3,3],[46.5,3],[90,3],[90,46.5],[90,90],[46.5,90],[3,90],[3,46.5]];
function frameRulesSVG(f,label){
  const cx=50,cy=44, fill=f.fill==='white'?'#ffffff':f.fill==='black'?'#111111':f.fill==='grey'?'#9aa0a6':'url(#hatch)';
  let s='';
  const st=`fill="${fill}" stroke="#111" stroke-width="2.2"`;
  if(f.shape==='circle') s+=`<circle cx="${cx}" cy="${cy}" r="20" ${st}/>`;
  if(f.shape==='square') s+=`<rect x="${cx-18}" y="${cy-18}" width="36" height="36" ${st}/>`;
  if(f.shape==='triangle') s+=`<polygon points="${cx},${cy-22} ${cx+21},${cy+15} ${cx-21},${cy+15}" ${st}/>`;
  if(f.shape==='diamond') s+=`<polygon points="${cx},${cy-22} ${cx+20},${cy} ${cx},${cy+22} ${cx-20},${cy}" ${st}/>`;
  if(f.shape==='hexagon'){const pts=[0,1,2,3,4,5].map(i=>{const a=Math.PI/3*i;return (cx+20*Math.cos(a)).toFixed(1)+','+(cy+20*Math.sin(a)).toFixed(1)}).join(' ');s+=`<polygon points="${pts}" ${st}/>`;}
  if(f.rot!==null&&f.rot!==undefined){const a=(f.rot-90)*Math.PI/180, x=cx+27*Math.cos(a), y=cy+27*Math.sin(a);
    s+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#fff" stroke-width="6" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#111" stroke-width="2.6" stroke-linecap="round"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="#111" stroke="#fff" stroke-width="1.2"/>`;}
  if(f.cnt){const n=f.cnt, w=(n-1)*9; for(let i=0;i<n;i++) s+=`<circle cx="${(50-w/2+i*9).toFixed(1)}" cy="78" r="3.2" fill="#111"/>`;}
  if(f.pos!==null&&f.pos!==undefined){const [x,y]=MARK[f.pos]; s+=`<rect x="${x}" y="${y}" width="7" height="7" fill="#111"/>`;}
  return `<svg class="fig" viewBox="0 0 100 100" role="img" aria-label="${esc(label||'figura')}"><rect x="0.5" y="0.5" width="99" height="99" fill="#fff" stroke="#8a929c"/>${s}</svg>`;
}

// ---------- more abstract rule families: wheel, grid, overlay, sides ----------
Object.assign(AB_RULES,{
  wheel:{label:'Settori di una ruota che ruotano'},
  grid:{label:'Caselle che si spostano in una griglia'},
  union:{label:'Sovrapposizione (1 + 2 = 3)'},
  xor:{label:'Sovrapposizione senza parti comuni'},
  sides:{label:'Conteggio dei lati'}
});
const TOKF=['black','hatch','grey'];
const sigOf=f=>JSON.stringify(f);
function finishAbstract(code,series,ans,wrongs,explain){
  const opts=[{f:ans,broken:[]}], seen=new Set([sigOf(ans)]);
  for(const w of wrongs){ if(opts.length>=5) break; const s=sigOf(w.f); if(seen.has(s)) continue; seen.add(s); opts.push({f:w.f,broken:[w.code||code]}); }
  if(opts.length<5) return null;
  const sh=R.shuffle(opts);
  return {sec:'abstract',id:'a-'+code+'-'+Math.random().toString(36).slice(2,8),rules:[code],hard:true,series,options:sh.map(o=>({frame:o.f,broken:o.broken})),key:sh.findIndex(o=>o.broken.length===0),explain};
}
function moving(cells,k){ // k tokens moving on a ring of `cells` positions with distinct steps, never colliding over 7 frames
  for(let t=0;t<200;t++){
    const steps=R.sample([1,2,3,-1,-2,-3].filter(x=>Math.abs(x)<cells/2),k), starts=R.sample([...Array(cells).keys()],k);
    let ok=true; const at=(i,j)=>mod(starts[i]+steps[i]*j,cells);
    for(let j=0;j<7&&ok;j++){ const set=new Set(); for(let i=0;i<k;i++) set.add(at(i,j)); if(set.size<k) ok=false; }
    if(ok) return {steps,starts,at};
  }
  return null;
}
function buildMovingItem(kind){
  const cells=kind==='wheel'?8:9, k=R.pick([2,3]);
  const m=moving(cells,k); if(!m) return null;
  const fills=R.sample(TOKF,k);
  const fr=j=>({kind,cells,tok:fills.map((f,i)=>({f,p:m.at(i,j)}))});
  const series=[0,1,2,3,4].map(fr), ans=fr(5);
  const wrongs=[];
  const valid=f=>new Set(f.tok.map(t=>t.p)).size===f.tok.length;
  for(let g=0;g<60&&wrongs.length<8;g++){
    const f=JSON.parse(JSON.stringify(ans)), i=R.int(0,k-1), how=R.int(0,3);
    if(how===0) f.tok[i].p=mod(f.tok[i].p+m.steps[i],cells);       // one step too far
    else if(how===1) f.tok[i].p=mod(f.tok[i].p-m.steps[i],cells);  // stayed in place
    else if(how===2) f.tok[i].p=mod(f.tok[i].p+(R.chance(.5)?1:-1),cells);
    else { const j=(i+1)%k; const tmp=f.tok[i].f; f.tok[i].f=f.tok[j].f; f.tok[j].f=tmp; } // fills swapped
    if(valid(f)) wrongs.push({f});
  }
  const FN=kind==='wheel'?{black:'nero',hatch:'tratteggiato',grey:'grigio'}:{black:'nera',hatch:'tratteggiata',grey:'grigia'};
  const one=(f,st)=>{const n=Math.abs(st), pos=n===1?'posizione':'posizioni'; return kind==='wheel'?`settore ${FN[f]}: ${n} ${pos} in senso ${st>0?'orario':'antiorario'}`:`casella ${FN[f]}: ${n} ${pos} ${st>0?'in avanti':'all\'indietro'}`;};
  const explain=(kind==='wheel'?'Ogni settore colorato ruota con un passo proprio. ':'Ogni casella colorata si sposta nella griglia letta riga per riga (dopo l\'ultima casella si riparte dalla prima), con un passo proprio. ')+
    fills.map((f,i)=>one(f,m.steps[i])).join('; ')+'. Segui un elemento alla volta.';
  return finishAbstract(kind,series,ans,wrongs,explain);
}
const STROKES={t:[20,20,80,20],r:[80,20,80,80],b:[20,80,80,80],l:[20,20,20,80],d1:[20,20,80,80],d2:[80,20,20,80],v:[50,20,50,80],h:[20,50,80,50],c:'circle'};
const SK=Object.keys(STROKES);
function buildOverlayItem(forceMode){
  const mode=forceMode||R.pick(['union','xor']);
  const pair=()=>{ for(let t=0;t<100;t++){ const a=R.sample(SK,R.int(2,3)), b=R.sample(SK,R.int(2,3)); const common=a.filter(x=>b.includes(x)); if(common.length>=1&&common.length<Math.min(a.length,b.length)) return [a,b]; } return null; };
  const comb=(a,b,md)=>md==='union'?SK.filter(x=>a.includes(x)||b.includes(x)):SK.filter(x=>a.includes(x)!==b.includes(x));
  const p1=pair(), p2=pair(); if(!p1||!p2) return null;
  const F=e=>({kind:'lines',e:SK.filter(x=>e.includes(x))});
  const series=[F(p1[0]),F(p1[1]),F(comb(p1[0],p1[1],mode)),F(p2[0]),F(p2[1])];
  const ans=F(comb(p2[0],p2[1],mode));
  const other=mode==='union'?'xor':'union';
  const inter=SK.filter(x=>p2[0].includes(x)&&p2[1].includes(x));
  const wrongs=[{f:F(comb(p2[0],p2[1],other)),code:mode},{f:F(p2[0])},{f:F(p2[1])},{f:F(inter)}];
  for(let g=0;g<20;g++){ const e=ans.e.slice(); const x=R.pick(SK); const i=e.indexOf(x); if(i>=0) e.splice(i,1); else e.push(x); if(e.length) wrongs.push({f:F(e)}); }
  const explain=mode==='union'?'La terza figura è la sovrapposizione della prima e della seconda; allo stesso modo la sesta è la sovrapposizione della quarta e della quinta.':'La terza figura sovrappone la prima e la seconda ed elimina gli elementi in comune; allo stesso modo la sesta si ottiene da quarta e quinta.';
  return finishAbstract(mode,series,ans,wrongs.filter(w=>w.f.e.length>0),explain);
}
function buildSidesItem(){
  const rule=R.pick(['same','minus']);
  const ok=(o,i)=>rule==='same'?i===o:i===o-1;
  const pairOK=()=>{ const o=rule==='same'?R.int(3,6):R.int(4,7); return [o,rule==='same'?o:o-1]; };
  const F=(o,i)=>({kind:'sides',o,i,ro:R.int(0,11)*30,ri:R.int(0,11)*30,inv:R.chance(.5)});
  let series;
  for(let t=0;t<50;t++){ series=[]; let prev=null; for(let j=0;j<5;j++){ let pr; do{pr=pairOK()}while(prev&&pr[0]===prev); prev=pr[0]; series.push(F(pr[0],pr[1])); }
    const os=series.map(f=>f.o), d=os.slice(1).map((x,i)=>x-os[i]); if(!(d.every(x=>x>0)||d.every(x=>x<0)||d.every(x=>x===d[0]))) break; }
  const a=pairOK(), ans=F(a[0],a[1]);
  const wrongs=[];
  const used=new Set([a[0]+':'+a[1]]);
  for(let g=0;g<120&&wrongs.length<6;g++){ const o=R.int(3,7), i=R.int(3,6), key=o+':'+i; if(!ok(o,i)&&!used.has(key)&&Math.abs(o-a[0])<=2){ used.add(key); wrongs.push({f:F(o,i)}); } }
  const explain=rule==='same'?'In ogni figura la forma interna ha lo stesso numero di lati di quella esterna. Solo la risposta corretta rispetta questa relazione.':'In ogni figura la forma interna ha un lato in meno di quella esterna. Solo la risposta corretta rispetta questa relazione.';
  // compare by side counts only, so a distractor never has the same counts as the key
  const it=finishAbstract('sides',series,ans,wrongs.filter(w=>!(w.f.o===ans.o&&w.f.i===ans.i)),explain);
  return it;
}
function buildAbstractItem(hard){
  const kinds=hard?['rules','rules','wheel','grid','union','sides']:['rules','rules','rules','wheel','sides'];
  for(let t=0;t<20;t++){
    const k=R.pick(kinds); let it=null;
    if(k==='rules') it=buildRulesItem(hard); else if(k==='wheel'||k==='grid') it=buildMovingItem(k); else if(k==='union') it=buildOverlayItem(); else it=buildSidesItem();
    if(it&&it.options.length===5&&it.key>=0){ it.hard=!!hard; return it; }
  }
  return buildRulesItem(hard);
}
function polyPts(cx,cy,r,n,rot){ return [...Array(n).keys()].map(k=>{const a=(rot-90+360*k/n)*Math.PI/180;return (cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1)}).join(' '); }
const FILLC={black:'#111111',grey:'#9aa0a6',hatch:'url(#hatch)',white:'#ffffff'};
function frameSVG(f,label){
  if(!f.kind) return frameRulesSVG(f,label);
  let s='';
  if(f.kind==='wheel'){
    const cx=50,cy=50,r=40;
    const sect=(i,fill)=>{const a0=(-90+45*i)*Math.PI/180,a1=(-90+45*(i+1))*Math.PI/180;return `<path d="M${cx},${cy} L${(cx+r*Math.cos(a0)).toFixed(1)},${(cy+r*Math.sin(a0)).toFixed(1)} A${r},${r} 0 0 1 ${(cx+r*Math.cos(a1)).toFixed(1)},${(cy+r*Math.sin(a1)).toFixed(1)} Z" fill="${fill}" stroke="#111" stroke-width="1.6"/>`};
    for(let i=0;i<8;i++) s+=sect(i,'#ffffff');
    f.tok.forEach(t=>s+=sect(t.p,FILLC[t.f]));
    s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#111" stroke-width="2.2"/>`;
  } else if(f.kind==='grid'){
    const x0=14,w=24;
    f.tok.forEach(t=>{const r=Math.floor(t.p/3),c=t.p%3;s+=`<rect x="${x0+c*w}" y="${x0+r*w}" width="${w}" height="${w}" fill="${FILLC[t.f]}"/>`;});
    for(let i=0;i<=3;i++) s+=`<line x1="${x0}" y1="${x0+i*w}" x2="${x0+3*w}" y2="${x0+i*w}" stroke="#111" stroke-width="2"/><line x1="${x0+i*w}" y1="${x0}" x2="${x0+i*w}" y2="${x0+3*w}" stroke="#111" stroke-width="2"/>`;
  } else if(f.kind==='lines'){
    f.e.forEach(k=>{const v=STROKES[k]; s+= v==='circle'?`<circle cx="50" cy="50" r="16" fill="none" stroke="#111" stroke-width="3"/>`:`<line x1="${v[0]}" y1="${v[1]}" x2="${v[2]}" y2="${v[3]}" stroke="#111" stroke-width="3.2" stroke-linecap="round"/>`;});
  } else if(f.kind==='mcell'){ s+=mcellSVG(f);
  } else if(f.kind==='sides'){
    const oFill=f.inv?'#111111':'#ffffff', iFill=f.inv?'#ffffff':'#111111';
    s+=`<polygon points="${polyPts(50,50,38,f.o,f.ro)}" fill="${oFill}" stroke="#111" stroke-width="2.2"/><polygon points="${polyPts(50,50,15,f.i,f.ri)}" fill="${iFill}" stroke="${f.inv?'#fff':'#111'}" stroke-width="1.6"/>`;
  }
  return `<svg class="fig" viewBox="0 0 100 100" role="img" aria-label="${esc(label||'figura')}"><rect x="0.5" y="0.5" width="99" height="99" fill="#fff" stroke="#8a929c"/>${s}</svg>`;
}

// ---------- more numerical templates (table-heavy, modelled on the manual's question types; data are random) ----------
const REGIONS=['North-West','North-East','Centre','South','Islands','Alpine','Coastal','Lowlands','Highlands','Capital region'];
Object.assign(NUM_T,{
cumul:{label:'Totale cumulato',make(){
  const lines=R.sample(['Software licences','Consulting','Training','Maintenance','Hardware'],3), yrs=[2021,2022,2023,2024];
  const data=lines.map(()=>yrs.map(()=>R.int(120,980)));
  const c=R.int(0,2), upto=R.int(2,3), v=data[c].slice(0,upto+1).reduce((a,b)=>a+b,0);
  const o=numOptions(v,[[data[c][upto],'solo il valore dell\'ultimo anno, non il totale'],[data[c].reduce((a,b)=>a+b,0),'sommati tutti gli anni'],[data[c].slice(1,upto+1).reduce((a,b)=>a+b,0),'escluso il primo anno']],x=>'€'+nf(Math.round(x))+'k');
  return {stim:tableHTML('Revenue of a company by business line (€ thousand)',['Business line',...yrs.map(String)],lines.map((l,i)=>[l,...data[i].map(x=>nf(x))]),FICT),
    question:`What was the total revenue from ${lines[c].toLowerCase()} from ${yrs[0]} up to and including ${yrs[upto]}?`,...o,
    explain:`Totale cumulato = ${data[c].slice(0,upto+1).map(x=>nf(x)).join(' + ')} = €${nf(v)}k. "Up to and including ${yrs[upto]}" significa la somma degli anni fino al ${yrs[upto]}, non il solo ${yrs[upto]}.`};
}},
netbal:{label:'Saldo (entrate − uscite)',make(){
  const rows=R.sample(REGIONS,4), reg=rows.map(()=>R.int(800,4800)), can=reg.map(x=>Math.max(300,Math.round(x*(R.int(70,135)/100))));
  const nets=reg.map((x,i)=>x-can[i]), v=nets.reduce((a,b)=>a+b,0); if(Math.abs(v)<150) return NUM_T.netbal.make();
  const om=R.int(0,3);
  const o=numOptions(v,[[-v,'cancellazioni meno iscrizioni'],[v-nets[om],'una regione dimenticata'],[nets.reduce((a,b)=>a+Math.abs(b),0)*(v<0?-1:1),'saldi presi tutti con lo stesso segno']],x=>(x>0?'+':'')+nf(Math.round(x)));
  return {stim:tableHTML('Registrations and cancellations in municipal population registers, 2024',['Region','Registrations','Cancellations'],rows.map((r,i)=>[r,nf(reg[i]),nf(can[i])]),FICT),
    question:'What was the combined net balance (registrations minus cancellations) of the four regions in 2024?',...o,
    explain:`Saldi: ${rows.map((r,i)=>`${r} ${nets[i]>0?'+':''}${nf(nets[i])}`).join(' · ')}. Somma = ${v>0?'+':''}${nf(v)}. In alternativa: totale iscrizioni ${nf(reg.reduce((a,b)=>a+b,0))} − totale cancellazioni ${nf(can.reduce((a,b)=>a+b,0))}.`};
}},
yearboth:{label:'Anno che supera entrambi (gruppo)',make(){
  for(let t=0;t<200;t++){
    const types=['Whole milk','Semi-skimmed milk','Skimmed milk'], yrs=[2019,2020,2021,2022,2023,2024];
    const d=types.map(()=>yrs.map(()=>R.int(40,95)*1000));
    const x=R.int(0,2), y=(x+1)%3, z=(x+2)%3;
    const both=yrs.map((_,i)=>d[x][i]>d[y][i]&&d[x][i]>d[z][i]); if(both.filter(Boolean).length!==1) continue;
    const k=both.indexOf(true); const one=yrs.map((_,i)=>!both[i]&&(d[x][i]>d[y][i]||d[x][i]>d[z][i]));
    const pool=yrs.map((yy,i)=>i).filter(i=>i!==k); const pickd=R.sample(pool,4).concat([k]).sort((a,b)=>a-b);
    const tm={}; pickd.forEach(i=>{ if(one[i]) tm[String(yrs[i])]='supera solo uno dei due'; });
    const names=pickd.map(i=>String(yrs[i]));
    return {stim:tableHTML('Milk consumption by type (thousand litres)',['Type',...yrs.map(String)],types.map((ty,i)=>[ty,...d[i].map(v=>nf(v/1000))]),FICT+' Valori in migliaia di litri.'),
      question:`In which year was consumption of ${types[x].toLowerCase()} higher than that of both ${types[y].toLowerCase()} and ${types[z].toLowerCase()}?`,
      options:names.map(n=>({label:n,why:n===String(yrs[k])?null:(tm[n]||'non supera nessuno dei due')})),key:names.indexOf(String(yrs[k])),
      explain:`Solo nel ${yrs[k]} il valore di ${types[x].toLowerCase()} (${nf(d[x][k]/1000)}) è più alto di entrambi gli altri (${nf(d[y][k]/1000)} e ${nf(d[z][k]/1000)}). Controlla anno per anno entrambe le condizioni.`};
  }
}},
inverse:{label:'Ricerca inversa (gruppo)',make(){
  for(let t=0;t<200;t++){
    const rows=R.sample(REGIONS,5), area=rows.map(()=>R.int(40,420)), out=area.map(a=>Math.round(a*R.int(18,95)/10));
    const per=out.map((o,i)=>o/area[i]*1000); const k=R.int(0,4); const V=Math.round(per[k]/10)*10;
    const okGap=per.every((p,i)=>i===k||Math.abs(p-V)/V>0.08); if(!okGap) continue;
    const tm={}; const ka=out.indexOf(Math.max(...out)); if(ka!==k) tm[rows[ka]]='produzione totale più alta, non per ettaro';
    return {stim:tableHTML('Agricultural output and farmed area, 2024',['Region','Output (€ million)','Farmed area (thousand ha)'],rows.map((r,i)=>[r,nf(out[i]),nf(area[i])]),FICT),
      question:`In which region was agricultural output per hectare closest to €${nf(V)}?`,...nameOptions(rows,rows[k],tm),
      explain:rows.map((r,i)=>`${r}: €${nf(Math.round(per[i]))}`).join(' · ')+`. € milioni ÷ migliaia di ettari × 1.000 = € per ettaro. Il più vicino a €${nf(V)} è ${rows[k]}.`};
  }
}},
twocol:{label:'Valore medio da due colonne',make(){
  const models=R.sample(['Model A','Model B','Model C','Model D','Model E'],4), units=models.map(()=>R.int(12,95)*100), price=models.map(()=>R.int(18,62)*1000);
  const value=units.map((u,i)=>Math.round(u*price[i]/1e5)/10); // € million, 1 decimal
  const r=R.int(0,3), v=value[r]*1e6/units[r], o2=(r+1)%4;
  const o=numOptions(v,[[value[o2]*1e6/units[o2],'riga sbagliata'],[v*10,'errore di unità (×10)'],[v/10,'errore di unità (÷10)']],x=>'€'+nf(Math.round(x/10)*10));
  return {stim:tableHTML('Sales of electric cars by model, 2024',['Model','Cars sold','Sales value (€ million)'],models.map((m,i)=>[m,nf(units[i]),nf(value[i],1)]),FICT),
    question:`What was the average sales value per car of ${models[r]}?`,...o,
    explain:`€${nf(value[r],1)} milioni ÷ ${nf(units[r])} auto = €${nf(Math.round(v/10)*10)}. Non confondere la colonna del valore con quella delle unità vendute.`};
}},
rowpct:{label:'Quota % di un totale di riga',make(){
  const yrs=[2021,2022,2023,2024], types=['Rail','Road','Inland waterways'];
  const tot=yrs.map(()=>R.int(120,480)*1000);
  const pct=yrs.map(()=>{const a=R.int(15,40), b=R.int(35,65); const c=100-a-b; return c<5?[30,60,10]:[a,b,c];});
  const yi=R.int(0,3), ti=R.int(0,2), v=tot[yi]*pct[yi][ti]/100;
  const oy=(yi+1)%4;
  const o=numOptions(v,[[tot[oy]*pct[yi][ti]/100,'totale dell\'anno sbagliato'],[tot[yi]*pct[yi][(ti+1)%3]/100,'modalità sbagliata'],[tot[yi]*(100-pct[yi][ti])/100,'complemento invece della quota']],x=>nf(Math.round(x))+' t');
  return {stim:tableHTML('Freight transported: total and share by mode',['Year','Total (tonnes)',...types.map(t=>t+' (%)')],yrs.map((y,i)=>[String(y),nf(tot[i]),...pct[i].map(p=>p+'%')]),FICT),
    question:`Approximately how many tonnes of freight were transported by ${types[ti].toLowerCase()} in ${yrs[yi]}?`,...o,
    explain:`${nf(tot[yi])} × ${pct[yi][ti]}% = ${nf(Math.round(v))} tonnellate. Usa il totale della stessa riga (${yrs[yi]}).`};
}},
split:{label:'Ripartizione di una quota',make(){
  const names=R.sample(['Anna','Bruno','Carla','Davide','Elena'],4); let sh=[R.int(15,35),R.int(15,35),R.int(10,25)]; sh.push(100-sh.reduce((a,b)=>a+b,0)); if(sh[3]<5) return NUM_T.split.make();
  const profit=R.int(12,90)*1000, k=R.int(0,3), n=R.int(2,4), v=profit*sh[k]/100/n;
  const o=numOptions(v,[[profit/n,'diviso tutto l\'utile invece della quota'],[profit*sh[k]/100,'quota non divisa'],[profit*sh[k]/100/(n+1),'diviso per una persona in più']],x=>'€'+nf(Math.round(x)));
  return {stim:tableHTML('Shares in a family business',['Partner','Share of profit'],names.map((p,i)=>[p,sh[i]+'%']),FICT)+`<p class="lead">Profit distributed in 2024: <b>€${nf(profit)}</b>.</p>`,
    question:`If ${names[k]}'s share is divided equally among ${['','','two','three','four'][n]} children, how much does each child receive?`,...o,
    explain:`€${nf(profit)} × ${sh[k]}% = €${nf(profit*sh[k]/100)}; diviso per ${n} = €${nf(Math.round(v))}.`};
}}
});

function buildAbstractFamily(fam){
  for(let t=0;t<20;t++){ let it=null;
    if(['rot','cnt','pos','fill','shape'].includes(fam)) it=buildRulesItem(R.chance(.5),fam);
    else if(fam==='sides') it=buildSidesItem();
    else if(fam==='wheel'||fam==='grid') it=buildMovingItem(fam);
    else if(fam==='union'||fam==='xor') it=buildOverlayItem(fam);
    if(it&&it.options.length===5&&it.key>=0) return it; }
  return buildAbstractItem(true);
}

// ---------- line chart (two series over time) ----------
function lineChartSVG(title,years,series,unit){
  const W=540,H=280,pl=50,pr=16,pt=30,pb=44, all=series.flatMap(s=>s.vals), max=Math.max(...all), min=Math.min(...all);
  const step=max-min>60?20:10, lo=Math.max(0,Math.floor((min-step)/step)*step), hi=Math.ceil((max+step/2)/step)*step;
  const iw=W-pl-pr, ih=H-pt-pb, X=i=>pl+iw*i/(years.length-1), Y=v=>pt+ih-ih*(v-lo)/(hi-lo);
  let g='';
  for(let v=lo;v<=hi;v+=step){ g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="grid"/><text x="${pl-6}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end" class="ax">${nf(v)}</text>`; }
  years.forEach((y,i)=>{ g+=`<text x="${X(i).toFixed(1)}" y="${H-pb+18}" text-anchor="middle" class="ax">${y}</text>`; });
  const cls=['ln1','ln2'];
  series.forEach((s,k)=>{ g+=`<polyline points="${s.vals.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')}" class="${cls[k]}"/>`;
    s.vals.forEach((v,i)=>{ g+=`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.5" class="${cls[k]}d"/><text x="${X(i).toFixed(1)}" y="${(Y(v)+(k===0?-8:15)).toFixed(1)}" text-anchor="middle" class="val">${nf(v)}</text>`; }); });
  const leg=series.map((s,k)=>`<span class="lg"><i class="${cls[k]}k"></i>${esc(s.name)}</span>`).join('');
  return `<figure class="chart"><figcaption>${esc(title)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${g}</svg><div class="legend">${leg}</div><p class="src">${FICT}${unit?' Unità: '+esc(unit)+'.':''}</p></figure>`;
}
NUM_T.line={label:'Grafico a linee',make(){
  const pair=R.pick([['Exports','Imports','€ billion'],['Applications received','Applications approved','thousands'],['Public spending','Tax revenue','€ billion']]);
  const y0=R.int(2017,2019), years=[0,1,2,3,4,5].map(i=>y0+i);
  const a=[R.int(40,90)]; const b=[a[0]-R.int(5,25)]; for(let i=1;i<6;i++){ a.push(Math.max(10,a[i-1]+R.int(-8,14))); b.push(Math.max(5,b[i-1]+R.int(-10,12))); }
  const stim=lineChartSVG(`${pair[0]} and ${pair[1].toLowerCase()}, ${years[0]}-${years[5]} (${pair[2]})`,years,[{name:pair[0],vals:a},{name:pair[1],vals:b}],pair[2]);
  if(R.chance(.5)){
    const gaps=a.map((v,i)=>v-b[i]); const mx=Math.max(...gaps); if(gaps.filter(x=>x===mx).length>1) return NUM_T.line.make();
    const k=gaps.indexOf(mx), big=a.indexOf(Math.max(...a)); const tm={}; if(big!==k) tm[String(years[big])]='valore più alto di una sola serie, non differenza più grande';
    const pick=R.sample(years.map((_,i)=>i).filter(i=>i!==k),4).concat([k]).sort((x,y)=>x-y), names=pick.map(i=>String(years[i]));
    return {stim,question:`In which year was the difference between ${pair[0].toLowerCase()} and ${pair[1].toLowerCase()} the largest?`,options:names.map(n=>({label:n,why:n===String(years[k])?null:(tm[n]||'differenza calcolata male')})),key:names.indexOf(String(years[k])),
      explain:`Differenze: ${years.map((y,i)=>`${y}: ${gaps[i]}`).join(' · ')}. La più grande è nel ${years[k]}.`};
  }
  const i0=0, i1=5, s=R.chance(.5)?{n:pair[0],v:a}:{n:pair[1],v:b}; const v=(s.v[i1]-s.v[i0])/s.v[i0]*100; if(Math.abs(v)<8) return NUM_T.line.make();
  const o=numOptions(v,[[(s.v[i1]-s.v[i0])/s.v[i1]*100,'base sbagliata (diviso per il valore finale)'],[s.v[i1]-s.v[i0],'differenza assoluta, non percentuale'],[-v,'segno invertito']],x=>fmtPct(x,0));
  if(!o) return NUM_T.line.make();
  return {stim,question:`By approximately what percentage did ${s.n.toLowerCase()} change between ${years[i0]} and ${years[i1]}?`,...o,explain:`(${s.v[i1]} − ${s.v[i0]}) ÷ ${s.v[i0]} × 100 = ${fmtPct(v,0)}.`};
}};


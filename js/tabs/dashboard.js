import {getJSON,getText,parseCSV,toCSV,download,loadScript,esc,badge,srcLinks,confOn,css} from '../core.js';
let C,root,rows=[],norc,charts={};
const PAL=['#2f6fb8','#d9822b','#2ea36b','#7a5bb5','#c0392b','#8a7a5c','#16a0a8'];
const COLS="dataset,year,hs_code,product,origin_country,value_usd,quantity_kg,shipments,importer,source_url,date_accessed,confidence,note".split(',');
const HS={'1801':'Cocoa beans','1803':'Cocoa paste','1804':'Cocoa butter'};
let shown={};

export async function mount(el){
  root=el;
  el.innerHTML=`<h1>Data dashboard</h1><p class="note">Charts read <code>data/imports.csv</code> and <code>data/norc.json</code>. Empty charts mean the data has not been added yet; nothing is invented.</p>
  <div class="grid g2 charts">
   ${card('c1','US cocoa imports by origin and product (USITC DataWeb)','HS 1801 beans, 1803 paste, 1804 butter; USD by year.','<select id="hs" aria-label="HS code filter"><option value="">All HS codes</option>'+Object.entries(HS).map(([k,v])=>`<option value="${k}">${k} ${v}</option>`).join('')+'</select>')}
   ${card('c2','Lindt-group US import shipments by origin (ImportYeti)','Shipment counts in public bill-of-lading summaries; not a full picture of trade.','')}
   ${card('c3','NORC child-labor figures','Children in cocoa child labor, Ghana and Côte d\'Ivoire, 2018/19.','')}</div>`;
  const [csv,n]=await Promise.all([getText('imports.csv'),getJSON('norc.json'),loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js')]);
  rows=parseCSV(csv); norc=n; C=window.Chart;
  el.querySelector('#hs').onchange=draw;
  el.querySelectorAll('[data-dl]').forEach(b=>b.onclick=()=>{ const k=b.dataset.dl; const s=shown[k]; download(`${k}.csv`,toCSV(s.rows,s.cols)); });
  draw();
}
function card(id,title,sub,ctl){ return `<div class="card chartcard"><h3>${title}</h3><p class="note">${sub}</p><div class="controls">${ctl}<button class="btn small" data-dl="${id}">⬇ Download data (CSV)</button></div><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas><div class="ov" id="${id}o" hidden></div></div>`; }
function mk(id,cfg,empty){
  charts[id]?.destroy(); const ov=root.querySelector('#'+id+'o'); ov.hidden=!empty; if(empty){ ov.textContent=empty; root.querySelector('#'+id).style.visibility='hidden'; return; }
  root.querySelector('#'+id).style.visibility='visible';
  const ink=css('--ink'),line=css('--line'); C.defaults.color=ink; C.defaults.borderColor=line;
  cfg.options={responsive:true,maintainAspectRatio:true,plugins:{tooltip:{enabled:true},legend:{position:'bottom'}},...cfg.options};
  charts[id]=new C(root.querySelector('#'+id),cfg);
}
function draw(){
  const hs=root.querySelector('#hs').value;
  // chart 1
  const r1=rows.filter(r=>r.dataset==='usitc_dataweb'&&confOn(r.confidence||'Unverified')&&(!hs||r.hs_code===hs));
  const yrs=[...new Set(r1.map(r=>r.year))].sort(), orig=[...new Set(r1.map(r=>r.origin_country))];
  shown.c1={rows:r1,cols:COLS};
  mk('c1',{type:'bar',data:{labels:yrs,datasets:orig.map((o,i)=>({label:o,backgroundColor:PAL[i%PAL.length],data:yrs.map(y=>r1.filter(r=>r.year===y&&r.origin_country===o).reduce((a,r)=>a+(+r.value_usd||0),0))}))},
    options:{scales:{x:{stacked:true},y:{stacked:true,title:{display:true,text:'USD'}}}}},r1.length?'':'No USITC DataWeb rows yet. Add rows with dataset=usitc_dataweb to data/imports.csv.');
  // chart 2
  const r2=rows.filter(r=>r.dataset==='importyeti'&&confOn(r.confidence||'Unverified'));
  const o2=[...new Set(r2.map(r=>r.origin_country))], prods=[...new Set(r2.map(r=>r.product))];
  shown.c2={rows:r2,cols:COLS};
  mk('c2',{type:'bar',data:{labels:o2,datasets:prods.map((p,i)=>({label:p||'Unspecified',backgroundColor:PAL[i%PAL.length],data:o2.map(o=>r2.filter(r=>r.origin_country===o&&r.product===p).reduce((a,r)=>a+(+r.shipments||0),0))}))},
    options:{indexAxis:'y',scales:{x:{stacked:true,title:{display:true,text:'Shipments'}},y:{stacked:true}}}},r2.length?'':'No ImportYeti rows yet. Add rows with dataset=importyeti to data/imports.csv.');
  // chart 3
  const r3=norc.rows.filter(r=>r.value!=null&&confOn(r.confidence));
  shown.c3={rows:norc.rows.map(r=>({metric:r.metric,country:r.country,value:r.value??'',unit:r.unit,confidence:r.confidence,source:r.sources.map(s=>s.url).join(' | ')})),cols:['metric','country','value','unit','confidence','source']};
  mk('c3',{type:'bar',data:{labels:r3.map(r=>r.metric.replace(', 2018/19','').replace(' (Ghana + Côte d\'Ivoire)','')+' ('+r.country+')'),datasets:[{label:'Children',backgroundColor:['#a64b00','#c0392b','#7a5bb5','#2f6fb8'],data:r3.map(r=>r.value)}]},options:{plugins:{legend:{display:false}},scales:{y:{title:{display:true,text:'Children'}}}}},r3.length?'':'No NORC rows pass the current confidence filter.');
}
export function update(){ if(C)draw(); }
export function theme(){ if(C)draw(); }

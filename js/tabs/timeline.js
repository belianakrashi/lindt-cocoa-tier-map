import {getJSON,esc,badge,srcLinks,confOn} from '../core.js';
let T=[],root,selId=null;
const Y0=2000,Y1=2027,PXY=110,CY=280,CW=168;
const xOf=e=>{ const [y,m='06',d='15']=e.date.split('-'); const f=e.precision==='year'?.5:e.precision==='month'?(+m-.5)/12:((+m-1)+(+d)/31)/12; return 40+((+y+f)-Y0)*PXY; };
export async function mount(el){
  root=el; T=await getJSON('timeline.json');
  el.innerHTML=`<h1>Promises vs. reality</h1><p class="note">Company and industry <strong>promises</strong> sit above the line; <strong>documented findings, missed deadlines and legal events</strong> sit below. Click or press Enter on an event. Scroll sideways on small screens.</p>
  <div class="tl-scroll" tabindex="0" aria-label="Timeline, scrollable"><div class="tl" id="tl" style="width:${(Y1-Y0)*PXY+80}px"></div></div>
  <div class="card" id="td" style="margin-top:14px" aria-live="polite"><h3>Select an event</h3><p>Details and sources appear here. Lawsuit events are allegations; Lindt denies them.</p></div>`;
  draw();
}
function draw(){
  const tl=root.querySelector('#tl'); tl.innerHTML='<div class="tl-axis"></div><div class="tl-side" style="top:8px">Promises &amp; commitments ↑</div><div class="tl-side" style="top:540px">Findings, missed deadlines &amp; legal events ↓</div>';
  for(let y=Y0;y<=Y1;y+=1){ if(y%2===0||y>2018)tl.insertAdjacentHTML('beforeend',`<span class="tl-tick" style="left:${40+(y-Y0)*PXY}px">${y}</span>`); }
  const vis=T.filter(e=>confOn(e.confidence));
  ['promise','finding'].forEach(track=>{
    const lanes=[]; // right edge per lane
    vis.filter(e=>e.track===track).sort((a,b)=>xOf(a)-xOf(b)).forEach(e=>{
      const x=xOf(e); let lane=lanes.findIndex(r=>r<x-CW/2-6); if(lane<0){lane=lanes.length} lanes[lane]=x+CW/2;
      const h=40+lane*66, up=track==='promise', top=up?CY-h-52:CY+h;
      tl.insertAdjacentHTML('beforeend',`<div class="tl-stem" style="--cc:var(--c-${e.confidence});left:${x}px;top:${up?top+52:CY}px;height:${up?h-0:h}px"></div>
       <div class="tl-dot" style="--cc:var(--c-${e.confidence});left:${x}px"></div>
       <button class="tl-ev" data-id="${e.id}" aria-pressed="${e.id===selId}" style="--cc:var(--c-${e.confidence});left:${Math.max(4,x-CW/2)}px;top:${top}px" data-tip="${esc(e.confidence)} · ${esc(e.date)}"><b>${esc(e.date.slice(0,4))}</b> ${esc(e.title)}</button>`);
    });
  });
  tl.querySelectorAll('.tl-ev').forEach(b=>b.onclick=()=>pick(b.dataset.id));
}
function pick(id){
  selId=id; const e=T.find(x=>x.id===id);
  root.querySelectorAll('.tl-ev').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===id));
  root.querySelector('#td').innerHTML=`<div class="eyebrow">${esc(e.date)} · ${e.track==='promise'?'Promise / commitment':'Documented finding or event'}</div><h2>${esc(e.title)}</h2>${badge(e.confidence)}<p>${esc(e.summary)}</p>${srcLinks(e.sources)}`;
}
export function update(){ if(root)draw(); }
export function show(){ const s=root.querySelector('.tl-scroll'); if(!s.dataset.init){ s.dataset.init=1; s.scrollLeft=(2018-Y0)*PXY; } }

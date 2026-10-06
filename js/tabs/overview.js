import {getJSON,getText,parseCSV,esc,badge,srcLinks,CONF,CONF_HELP,ICON} from '../core.js';

function fmt(v,f){ if(f==='compact') return v>=1e6?(v/1e6).toFixed(2)+'M':Math.round(v).toLocaleString(); if(f==='usd') return v>=1e9?'$'+(v/1e9).toFixed(2)+'B':'$'+Math.round(v/1e6)+'M'; return Math.round(v).toLocaleString(); }
function count(el,to,f,suffix){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=fmt(to,f)+suffix;return}
  const t0=performance.now(),d=1400;
  const step=t=>{const p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);el.textContent=fmt(to*e,f)+suffix; if(p<1)requestAnimationFrame(step)};
  requestAnimationFrame(step);
}
export async function mount(el){
  const [site,csv]=await Promise.all([getJSON('site.json'),getText('imports.csv')]);
  const rows=parseCSV(csv).filter(r=>r.dataset==='usitc_dataweb');
  const years=[...new Set(rows.map(r=>+r.year))].sort();
  if(years.length){ const y=years.at(-1); site.stats.find(s=>s.id==='imports').value=rows.filter(r=>+r.year===y).reduce((a,r)=>a+(+r.value_usd||0),0); }
  const now=new Date().getFullYear();
  el.innerHTML=`
  <div class="hero"><div class="eyebrow">Open-source intelligence · Cocoa supply chains</div>
   <h1>${esc(site.headline)}</h1>
   <p class="warn"><strong>Read this first:</strong> the lawsuit's claims are allegations and Lindt denies them. This project maps sector-level risk and the gap between public claims and documented conditions. It does not say any specific product was made with child labor.</p></div>
  <div class="grid g4" id="stats">${site.stats.map(s=>`<div class="card stat" data-tip="${esc(CONF_HELP[s.confidence])}">
     <div class="num" data-id="${s.id}">${s.value==null?'—':'0'}</div><div class="lbl">${esc(s.label)}</div>
     ${s.value==null?`<div class="note">${esc(s.pending||'No data yet')}</div>`:''}${badge(s.confidence)}${srcLinks(s.sources)}</div>`).join('')}</div>
  <div class="grid g2" style="margin-top:16px;align-items:start">
   <div class="card"><h2>Summary</h2><p>${esc(site.summary)}</p></div>
   <div class="card"><h2>Start exploring</h2><div class="btnrow">
     <a class="btn primary" href="#map">Supply chain map</a><a class="btn" href="#tiers">Tier explorer</a><a class="btn" href="#timeline">Promises vs. reality</a>
     <a class="btn" href="#dashboard">Data dashboard</a><a class="btn" href="#lawsuit">The lawsuit</a><a class="btn" href="#evidence">Evidence locker</a><a class="btn" href="#method">Methodology &amp; gaps</a></div>
     <h3>How to read confidence labels</h3>
     ${CONF.map(c=>`<p style="margin:.3em 0">${badge(c)} ${esc(CONF_HELP[c])}</p>`).join('')}</div></div>`;
  site.stats.forEach(s=>{
    const n=el.querySelector(`.num[data-id=${s.id}]`); if(s.value==null)return;
    const v=typeof s.value==='string'&&s.value.startsWith('auto:')?now-(+s.value.slice(5)):s.value;
    new IntersectionObserver((e,o)=>{ if(e[0].isIntersecting){count(n,v,s.format,s.suffix);o.disconnect()} }).observe(n);
  });
}

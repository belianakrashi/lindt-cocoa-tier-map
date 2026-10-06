import {getJSON,esc,badge,srcLinks} from '../core.js';
export async function mount(el){
  const L=(await getJSON('site.json')).lawsuit;
  el.innerHTML=`<h1>The lawsuit</h1>
  <p class="warn">Everything on the left of each pair is an <strong>allegation</strong> in a complaint. It is unproven. Lindt denies the allegations, and its response sits alongside.</p>
  <div class="card" style="margin:16px 0"><h2>Case card</h2><dl class="kv">
   <dt>Court</dt><dd>${esc(L.court)}</dd><dt>Case no.</dt><dd>${esc(L.case)}</dd>
   <dt>Plaintiff</dt><dd>${esc(L.plaintiff)}</dd><dt>Defendant</dt><dd>${esc(L.defendant)}</dd>
   <dt>Filed</dt><dd>${esc(L.filed)}</dd><dt>Status</dt><dd>${esc(L.status)}</dd><dt>Relief sought</dt><dd>${esc(L.relief)}</dd>
   <dt>Links</dt><dd>${L.links.map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join(' · ')}</dd></dl></div>
  <h2>Allegations and Lindt's response</h2>
  ${L.pairs.map(p=>`<div class="pair" style="margin-bottom:14px"><div class="card a"><h3>${badge('Alleged')} The complaint alleges</h3><p>${esc(p.allegation)}</p>${srcLinks(p.allegation_sources)}</div>
   <div class="card r"><h3>Lindt's response</h3><p>${esc(p.response)}</p>${srcLinks(p.response_sources)}</div></div>`).join('')}`;
}

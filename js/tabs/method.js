import {getJSON,esc,badge} from '../core.js';
export async function mount(el){
  const M=(await getJSON('site.json')).method;
  el.innerHTML=`<h1>Methodology &amp; gaps</h1><div class="grid g2" style="align-items:start">
  <div class="card"><h2>How the research was done</h2><ol>${M.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
   <h3>Confidence labels</h3>${M.confidence.map(([c,d])=>`<p style="margin:.3em 0">${badge(c)} ${esc(d)}</p>`).join('')}
   <p class="note">Full write-up: <a href="https://github.com/belianakrashi/lindt-cocoa-tier-map/blob/main/METHODOLOGY.md">METHODOLOGY.md</a></p></div>
  <div class="card"><h2>What we could not confirm</h2><ul>${M.gaps.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>
  <div class="card" style="grid-column:1/-1"><h2>Where a platform like Sayari would close the gaps</h2><ul>${M.sayari.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></div>`;
}

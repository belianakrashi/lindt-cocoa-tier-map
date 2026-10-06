import {getJSON,esc} from '../core.js';
export async function mount(el){
  const A=(await getJSON('site.json')).about;
  el.innerHTML=`<h1>About</h1><div class="card" style="max-width:760px"><p>${esc(A.text)}</p>
  <p>${A.links.map(l=>`<a class="btn small" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join(' ')}</p>
  <p class="note">Found an error or have a source to add? Open a GitHub issue or edit the files in <code>data/</code>; the site reads them directly.</p></div>`;
}

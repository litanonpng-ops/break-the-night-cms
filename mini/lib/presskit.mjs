import { readFile, writeFile, mkdir, cp, access, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs = v => String(v || '').split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
function url(v) {
  if (typeof v !== 'string' || !v.trim()) throw new Error('A link or image URL is empty');
  if (/^\/(?!\/)[^\\\s]*$/.test(v) || /^(https?:\/\/|mailto:)/i.test(v)) return esc(v);
  throw new Error(`Unsupported URL: ${v}`);
}
const link = x => `<a href="${url(x.url)}">${esc(x.name)}</a>`;
const contact = x => {
  const value = String(x.url || '');
  if (/^(https?:\/\/|mailto:|\/press\/media\/)/i.test(value)) return link({name:value.replace(/^mailto:/,''),url:value});
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return link({name:value,url:'mailto:'+value});
  return esc(value);
};
const facts = (label, value) => value ? `<p><strong>${label}:</strong><br>${value}</p>` : '';
const imageGrid = items => `<div class="uk-grid images">${(items || []).map(x => `<div class="uk-width-medium-1-2"><a href="${url(x.src)}"><img src="${url(x.src)}" alt="${esc(x.alt)}" loading="lazy"></a></div>`).join('')}</div>`;

// Static rendition of official presskit() sheet.php, retaining its markup and CSS.
export function renderPresskit(d) {
  if (!d.title?.trim() || !d.developer?.trim() || !d.description?.trim()) throw new Error('Title, developer and description are required');
  const sections = [
    ['factsheet','Factsheet',true], ['description','Description',true], ['history','History',d.history],
    ['trailers','Videos',d.videos?.length], ['images','Images',d.screenshots?.length], ['logo','Logo & Icon',d.logos?.length],
    ['links','Additional Links',d.links?.length || d.downloads?.length], ['about',`About ${d.developer}`,d.about],
    ['credits','Team',d.credits?.length], ['contact','Contact',d.contacts?.length]
  ];
  const section = (id, heading, body) => body ? `<hr><h2 id="${id}">${esc(heading)}</h2>${body}` : '';
  const videos = (d.videos || []).map(v => {
    if (!/^[\w-]{11}$/.test(v.youtube)) throw new Error('YouTube IDs must contain 11 letters, digits, dashes or underscores');
    return `<p><strong>${esc(v.name)}</strong> <a href="https://www.youtube.com/watch?v=${v.youtube}">YouTube</a></p><div class="uk-responsive-width iframe-container"><iframe title="${esc(v.name)}" src="https://www.youtube-nocookie.com/embed/${v.youtube}" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" style="border:0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>${v.downloadUrl ? `<p class="video-download">${link({name:v.downloadLabel || 'Download video',url:v.downloadUrl})}</p>` : ''}`;
  }).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.title)} — Press Kit</title><meta name="description" content="${esc(d.description)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Advent+Pro:wght@600;700&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="canonical" href="https://breakthenight.com/press/">
<link rel="icon" href="/assets/favicon.webp"><link rel="stylesheet" href="vendor/uikit.gradient.min.css"><link rel="stylesheet" href="vendor/style.css">
</head><body><div class="uk-container uk-container-center"><div class="uk-grid">
<div id="navigation" class="uk-width-medium-1-4"><h1 class="nav-header">${esc(d.developer)}</h1><a class="nav-header" href="/press/">press kit</a><ul class="uk-nav uk-nav-side">${sections.filter(s=>s[2]).map(([id,label])=>`<li><a href="#${id}">${esc(label)}</a></li>`).join('')}</ul></div>
<div id="content" class="uk-width-medium-3-4">
${d.header ? `<img src="${url(d.header)}" class="header" alt="${esc(d.title)}">` : ''}
<div class="uk-grid"><div class="uk-width-medium-2-6"><h2 id="factsheet">Factsheet</h2>
${facts('Developer', link({name:d.developer,url:d.developerWebsite}) + (d.basedIn ? `<br>${esc(d.basedIn)}` : ''))}
${facts('Release date', esc(d.releaseDate))}${facts('Platforms', (d.platforms || []).map(link).join('<br>'))}
${facts('Website', link({name:d.website,url:d.website}))}${facts('Regular Price', esc(d.price))}
</div><div class="uk-width-medium-4-6"><h2 id="description">Description</h2>${paragraphs(d.description)}
${d.history ? `<h2 id="history">History</h2>${paragraphs(d.history)}` : ''}
${d.features?.length ? `<h2>Features</h2><ul>${d.features.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>
${section('trailers','Videos',videos)}
${section('images','Images',d.screenshots?.length ? imageGrid(d.screenshots) : '')}
${section('logo','Logo & Icon',d.logos?.length ? imageGrid(d.logos) : '')}
${section('links','Additional Links', [...(d.downloads || []),...(d.links || [])].map(x=>`<p>${link(x)}</p>`).join(''))}
${section('about',`About ${d.developer}`,paragraphs(d.about))}
<hr><div class="uk-grid"><div class="uk-width-medium-1-2">${d.credits?.length ? `<h2 id="credits">${esc(d.title)} Credits</h2>${d.credits.map(x=>`<p><strong>${esc(x.name)}</strong><br>${esc(x.role)}</p>`).join('')}` : ''}</div>
<div class="uk-width-medium-1-2">${d.contacts?.length ? `<h2 id="contact">Contact</h2>${d.contacts.map(x=>`<p><strong>${esc(x.name)}</strong><br>${contact(x)}</p>`).join('')}` : ''}</div></div>
<hr><p><a href="https://dopresskit.com/">presskit()</a> by Rami Ismail (<a href="https://www.vlambeer.com/">Vlambeer</a>) — also thanks to <a href="https://dopresskit.com/#credits">these fine folks</a>.</p>
</div></div></div></body></html>`;
}

export async function build() {
  const d = JSON.parse(await readFile(path.join(root, 'content/presskit.json'), 'utf8'));
  const html = renderPresskit(d);
  for (const asset of [d.header, ...(d.screenshots || []).map(x=>x.src), ...(d.logos || []).map(x=>x.src), ...(d.downloads || []).map(x=>x.url)]) {
    if (asset?.startsWith('/')) {
      const local = path.resolve(root, 'website', '.' + decodeURIComponent(asset));
      if (!local.startsWith(path.join(root,'website') + path.sep)) throw new Error('Asset escapes website directory');
      await access(local);
    }
  }
  await mkdir(path.join(root,'website/press'), {recursive:true});
  await writeFile(path.join(root,'website/press/index.html'),html);
  // Clean only this build's known output directory so deleted CMS uploads disappear.
  const out = path.join(root,'dist');
  async function cleanFiles(dir) {
    for (const e of await readdir(dir,{withFileTypes:true}).catch(()=>[])) {
      const p = path.join(dir,e.name);
      if(e.isDirectory()) await cleanFiles(p); else await unlink(p);
    }
  }
  await cleanFiles(out);
  await cp(path.join(root,'website'), out, {recursive:true,filter:src => !path.relative(path.join(root,'website'),src).split(path.sep).some(s=>s.startsWith('.')) && !src.endsWith('.php')});
  console.log('Built dist/: landing page + static presskit. No deployment performed.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();

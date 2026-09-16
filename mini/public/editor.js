const $ = id => document.getElementById(id);
let data, sha, fields, dirty = false, busy = false;
const status = text => { $('status').textContent = text; };
const changed = () => { dirty = true; $('save').disabled = busy; };
async function api(action, body) {
  const response = await fetch('/api/cms?action=' + action, body === undefined ? {} : { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) { if (response.status === 401) { $('login').hidden = false; $('editor').hidden = true; } throw new Error(result.error || 'Request failed'); }
  return result;
}
const title = f => (f.label || f.name).replace(/^./, s => s.toUpperCase());
const button = (text, action) => { const b = document.createElement('button'); b.type='button'; b.textContent=text; b.onclick=action; return b; };
function preview(img, src) {
  img.hidden = !src;
  if (src) img.src = src.startsWith('/press/media/') ? '/api/cms?action=image&name=' + encodeURIComponent(src.slice(13)) : src;
}
async function upload(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 20000000) throw new Error('Choose an image under 20 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 3200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .9));
  if (!blob || blob.type !== 'image/webp' || blob.size > 2500000) throw new Error('Image is too large after conversion. Please use a smaller image.');
  const content = await new Promise((resolve, reject) => { const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob); });
  return api('upload', { name:file.name, content });
}
function input(f, value, update) {
  const label = document.createElement('label'); label.append(title(f) + (f.required ? ' *' : ''));
  const control = document.createElement(f.type === 'text' ? 'textarea' : 'input');
  control.value = value || ''; control.required = !!f.required;
  if (f.pattern) control.pattern = f.pattern;
  control.oninput = () => { update(control.value); changed(); if (img) preview(img, control.value); };
  label.append(control);
  let img;
  if (f.type === 'image') {
    img = document.createElement('img'); img.className='image-preview'; img.alt='Selected image'; preview(img, value); label.append(img);
    const picker = document.createElement('input'); picker.type='file'; picker.accept='image/png,image/jpeg,image/webp'; picker.setAttribute('aria-label', 'Upload '+title(f));
    picker.onchange = async () => {
      if (!picker.files[0] || busy) return;
      busy = true; $('save').disabled = true; picker.disabled = true; status('Uploading image…');
      try { const result=await upload(picker.files[0]); control.value=result.src; update(result.src); preview(img,result.src); changed(); status('Image uploaded. Save changes to use it on the page.'); }
      catch(e) { status(e.message); }
      finally { busy=false; picker.disabled=false; $('save').disabled=!dirty; picker.value=''; }
    };
    label.append(picker);
  }
  if (f.description) { const help=document.createElement('small'); help.textContent=f.description; label.append(help); }
  return label;
}
function list(f, section) {
  const rows=document.createElement('div'); section.append(rows);
  function render() {
    rows.replaceChildren();
    data[f.name].forEach((value,i) => {
      const row=document.createElement('div'); row.className='row';
      if (f.type==='object') f.fields.forEach(child => row.append(input(child,value[child.name], v=>value[child.name]=v)));
      else row.append(input({...f,list:false,label:'Item '+(i+1)},value,v=>data[f.name][i]=v));
      const tools=document.createElement('div'); tools.className='row-tools';
      const up=button('↑',()=>{[data[f.name][i-1],data[f.name][i]]=[data[f.name][i],data[f.name][i-1]];changed();render();}); up.disabled=i===0;up.setAttribute('aria-label','Move item up');
      const down=button('↓',()=>{[data[f.name][i+1],data[f.name][i]]=[data[f.name][i],data[f.name][i+1]];changed();render();});down.disabled=i===data[f.name].length-1;down.setAttribute('aria-label','Move item down');
      tools.append(up,down,button('Remove',()=>{data[f.name].splice(i,1);changed();render();}));row.append(tools);rows.append(row);
    });
  }
  section.append(button('+ Add item',()=>{data[f.name].push(f.type==='object'?Object.fromEntries(f.fields.map(c=>[c.name,''])):'');changed();render();}));render();
}
async function load() {
  const result=await api('load'); data=result.data; sha=result.sha;fields=result.fields;
  $('content').replaceChildren();
  const basics=document.createElement('div');basics.className='section';$('content').append(basics);
  fields.forEach(f=>{
    if (!f.list) basics.append(input(f,data[f.name],v=>data[f.name]=v));
    else { data[f.name] ||= [];const section=document.createElement('section');section.className='section';const h=document.createElement('h2');h.textContent=title(f);section.append(h);list(f,section);$('content').append(section); }
  });
  $('login').hidden=true; $('editor').hidden=false; dirty=false;$('save').disabled=true;status('Ready.');
}
$('login').onsubmit=async e=>{e.preventDefault();const b=$('login').querySelector('button');b.disabled=true;try{await api('login',{password:e.target.password.value});e.target.reset();await load();}catch(e){status(e.message);}finally{b.disabled=false;}};
$('content').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$('save').disabled=true;status('Saving to GitHub…');const snapshot=JSON.stringify(data);try{const result=await api('save',{data:JSON.parse(snapshot),sha});sha=result.sha;dirty=JSON.stringify(data)!==snapshot;status(dirty?'Saved. You have additional unsaved changes.':'Saved to GitHub. The presskit build will run; live deployment remains disabled.');}catch(e){status(e.message);}finally{busy=false;$('save').disabled=!dirty;}};
$('logout').onclick=async()=>{if(dirty&&!confirm('Discard unsaved changes?'))return;try{await api('logout',{});dirty=false;location.reload();}catch(e){status(e.message);}};
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
load().catch(e=>status(e.message));

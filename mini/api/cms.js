import { createSign, randomBytes } from 'node:crypto';
import { fields, passwordMatches, session, validSession, mediaName, validate } from '../lib/core.js';
import { renderPresskit } from '../lib/presskit.mjs';

const repo = '/repos/litanonpng-ops/break-the-night-website';
const branch = 'main';
const contentPath = 'content/presskit.json';
let cachedToken;
const failures = new Map();
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
async function github(path, options = {}, token) {
  const response = await fetch('https://api.github.com' + path, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'break-the-night-presskit', Authorization: 'Bearer ' + (token || await installationToken()), ...options.headers }
  });
  if (!response.ok) throw fail(response.status === 409 || response.status === 422 ? 'The file changed on GitHub. Reload before saving again.' : 'GitHub could not complete this request. Please try again.', response.status === 409 || response.status === 422 ? 409 : 502);
  return response.json();
}
async function installationToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const payload = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({ iat: now - 60, exp: now + 540, iss: process.env.GITHUB_APP_ID });
  const signed = createSign('RSA-SHA256').update(payload).sign(process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'), 'base64url');
  const jwt = payload + '.' + signed;
  const install = await github(repo + '/installation', {}, jwt);
  const token = await github(`/app/installations/${install.id}/access_tokens`, { method: 'POST', body: JSON.stringify({ repositories: ['break-the-night-website'], permissions: { contents: 'write' } }) }, jwt);
  cachedToken = { value: token.token, expires: Date.parse(token.expires_at) };
  return token.token;
}
const read = path => github(`${repo}/contents/${path}?ref=${branch}`);
async function document() {
  const file = await read(contentPath);
  return { data: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')), sha: file.sha };
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const json = (status, data) => res.status(status).json(data);
  try {
    const secret = process.env.CMS_SESSION_SECRET, hash = process.env.CMS_PASSWORD_HASH;
    if (!secret || !hash) throw fail('Editor password has not been configured.', 503);
    const url = new URL(req.url, 'https://' + req.headers.host);
    const action = url.searchParams.get('action') || 'load';
    if (!['GET','POST'].includes(req.method)) throw fail('Method not allowed', 405);
    if (req.method === 'POST') {
      if (req.headers.origin !== 'https://' + req.headers.host) throw fail('Invalid request origin', 403);
      if (!req.headers['content-type']?.startsWith('application/json')) throw fail('JSON required', 415);
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (JSON.stringify(body).length > 3800000) throw fail('Image is too large. Maximum upload: 2.5 MB.', 413);
    const cookie = (value, age) => res.setHeader('Set-Cookie', `btn_editor=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`);
    if (action === 'login' && req.method === 'POST') {
      const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown');
      const now = Date.now();
      for (const [key, entry] of failures) if (entry.until < now) failures.delete(key);
      if (failures.size > 2000) throw fail('Please wait before trying again.', 429);
      const entry = failures.get(ip) || { count: 0, until: now + 10 * 60000 };
      if (entry.count >= 8) throw fail('Too many attempts. Try again in ten minutes.', 429);
      if (!passwordMatches(body.password, hash)) {
        entry.count++; failures.set(ip, entry);
        throw fail('Incorrect password.', 401);
      }
      failures.delete(ip);
      cookie(session(secret, hash), 8 * 3600);
      return json(200, { ok: true });
    }
    const token = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('btn_editor='))?.slice(11);
    if (!validSession(token, secret, hash)) throw fail('Please enter the editor password.', 401);
    if (action === 'logout' && req.method === 'POST') { cookie('', 0); return json(200, { ok: true }); }
    if (action === 'load' && req.method === 'GET') return json(200, { ...await document(), fields });
    if (action === 'save' && req.method === 'POST') {
      const data = validate(body.data);
      renderPresskit(data);
      if (!/^[a-f0-9]{40}$/.test(body.sha)) throw fail('Reload the presskit before saving.');
      const result = await github(`${repo}/contents/${contentPath}`, { method: 'PUT', body: JSON.stringify({ message: 'Update presskit content', branch, sha: body.sha, content: Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64') }) });
      return json(200, { sha: result.content.sha, commit: result.commit.html_url });
    }
    if (action === 'upload' && req.method === 'POST') {
      if (typeof body.content !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.content)) throw fail('Invalid image');
      const bytes = Buffer.from(body.content, 'base64');
      if (bytes.length > 2500000 || bytes.length < 12) throw fail('Image must be under 2.5 MB.');
      const isWebp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (!isWebp) throw fail('Please upload a supported image.');
      const stem = String(body.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'image';
      const name = mediaName(`${stem}-${randomBytes(6).toString('hex')}.webp`);
      await github(`${repo}/contents/website/press/media/${name}`, { method: 'PUT', body: JSON.stringify({ message: 'Add presskit image', branch, content: body.content }) });
      return json(200, { src: '/press/media/' + name });
    }
    if (action === 'image' && req.method === 'GET') {
      const name = mediaName(url.searchParams.get('name'));
      const file = await fetch(`https://api.github.com${repo}/contents/website/press/media/${name}?ref=${branch}`, { headers: { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'break-the-night-presskit', Authorization: 'Bearer ' + await installationToken() } });
      if (!file.ok) throw fail('Image not found', 404);
      const types = { webp:'image/webp', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg' };
      res.setHeader('Content-Type', types[name.split('.').pop().toLowerCase()]);
      return res.status(200).send(Buffer.from(await file.arrayBuffer()));
    }
    if (action === 'preview' && req.method === 'GET') {
      const { data } = await document();
      const html = renderPresskit(data).replaceAll('href="vendor/', 'href="/press/vendor/').replace(/(?:src|href)="\/press\/media\/([^"/]+)"/g, (match, name) => match.slice(0, match.indexOf('=') + 1) + '"/api/cms?action=image&amp;name=' + encodeURIComponent(name) + '"');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }
    throw fail('Not found', 404);
  } catch (error) {
    const status = error.status || 400;
    return json(status, { error: status >= 500 ? 'The editor could not reach GitHub. Please try again.' : error.message });
  }
}

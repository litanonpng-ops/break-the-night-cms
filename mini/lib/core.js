import { createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
import schema from '../schema.json' with { type: 'json' };

export const fields = schema.content[0].fields;
export const equal = (a, b) => {
  const x = Buffer.from(a || ''), y = Buffer.from(b || '');
  return x.length === y.length && timingSafeEqual(x, y);
};
export function passwordMatches(password, hash) {
  const [salt, digest] = (hash || '').split(':');
  return !!salt && !!digest && typeof password === 'string' && password.length <= 200 && equal(scryptSync(password, salt, 32).toString('hex'), digest);
}
const signature = (body, secret, hash) => createHmac('sha256', secret).update(body + ':' + hash).digest('base64url');
export function session(secret, hash, now = Date.now()) {
  const expires = String(now + 8 * 60 * 60 * 1000);
  return expires + '.' + signature(expires, secret, hash);
}
export function validSession(token, secret, hash, now = Date.now()) {
  const [expires, sig, extra] = (token || '').split('.');
  return !extra && /^\d+$/.test(expires) && Number(expires) > now && Number(expires) <= now + 8 * 60 * 60 * 1000 && equal(sig, signature(expires, secret, hash));
}
export function mediaName(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,130}\.(webp|png|jpe?g)$/i.test(value)) throw new Error('Invalid image filename');
  return value;
}
function link(value) {
  if (/^\/press\/media\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) return true;
  try { return ['https:', 'http:', 'mailto:'].includes(new URL(value).protocol); } catch { return false; }
}
export function validate(data) {
  function field(f, value, listItem = false) {
    if (f.list && !listItem) {
      if (!Array.isArray(value) || value.length > 100) throw new Error(`${f.name}: expected a list of at most 100 items`);
      return value.map(v => field(f, v, true));
    }
    if (f.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${f.name}`);
      return Object.fromEntries(f.fields.map(child => [child.name, field(child, value[child.name] ?? '')]));
    }
    if (typeof value !== 'string' || value.length > 30000 || (f.required && !value.trim())) throw new Error(`Check ${f.label || f.name}`);
    if (value && f.format !== 'contact' && (f.type === 'image' || ['url','website','developerWebsite','downloadUrl'].includes(f.name)) && !link(value)) throw new Error(`Invalid URL in ${f.name}`);
    if (value && f.pattern && !new RegExp(f.pattern).test(value)) throw new Error(`Invalid ${f.label || f.name}`);
    return value;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid presskit');
  return Object.fromEntries(fields.map(f => [f.name, field(f, data[f.name] ?? (f.list ? [] : ''))]));
}

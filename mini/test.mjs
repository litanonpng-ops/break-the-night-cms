import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { passwordMatches, session, validSession, mediaName, validate } from './lib/core.js';
test('Password, signed expiry, and password changes',()=>{
  const hash='salt:'+scryptSync('example-pass','salt',32).toString('hex');
  assert.ok(passwordMatches('example-pass',hash));assert.ok(!passwordMatches('wrong',hash));
  const token=session('secret',hash,1000);
  assert.ok(validSession(token,'secret',hash,1001));assert.ok(!validSession(token+'x','secret',hash,1001));
  assert.ok(!validSession(token,'secret',hash,30000000));assert.ok(!validSession(token,'secret','changed',1001));
});
test('Presskit input and restricted media paths',()=>{
  const fields=JSON.parse(readFileSync(new URL('./schema.json',import.meta.url))).content[0].fields;
  const d=Object.fromEntries(fields.map(f=>[f.name,f.list?[]:'']));Object.assign(d,{title:'Game',developer:'Studio',description:'About',website:'https://example.com',developerWebsite:'https://example.com'});
  assert.equal(validate(d).title,'Game');assert.throws(()=>validate({...d,website:'javascript:alert(1)'}));
  assert.throws(()=>validate({...d,videos:[{name:'video',youtube:'bad'}]}));
  assert.equal(mediaName('logo-1.webp'),'logo-1.webp');assert.throws(()=>mediaName('../secret'));assert.throws(()=>mediaName('image.svg'));
});

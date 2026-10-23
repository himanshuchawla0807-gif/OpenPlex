import test from 'node:test'
import assert from 'node:assert/strict'
import {defaultProfile,parseProfile,profileError} from './employees.ts'
test('old employee profiles migrate to Codex and explicit harness choice survives',()=>{
 const old={...defaultProfile(0)};delete old.harness
 assert.equal(parseProfile(old,0).harness,'codex')
 assert.equal(parseProfile({...old,harness:'claude'},0).harness,'claude')
 assert.equal(parseProfile({...old,harness:'unknown'},0).harness,'codex')
 assert.equal(defaultProfile(0).harness,'codex')
 assert.equal(profileError({...defaultProfile(0),harness:'claude'}),null)
 assert.match(profileError({...defaultProfile(0),harness:'unknown'}),/Choose an employee harness/)
})

import {harnesses} from './harnesses.ts'
test('all requested harness choices survive storage with clear capability levels',()=>{
 for(const h of harnesses){const profile={...defaultProfile(0),harness:h.id};assert.equal(parseProfile(profile,0).harness,h.id);assert.equal(profileError(profile),null)}
 assert.equal(harnesses.length,13)
 assert.equal(harnesses.filter(h=>h.mode==='integrated').length,2)
})

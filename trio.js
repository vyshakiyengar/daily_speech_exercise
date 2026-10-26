'use strict';
/* Speech On — the daily three: Speak, Read, Think.
   Reads each module's own localStorage key to show today's ticks.
   Nothing leaves the browser. */
(() => {
 const KEYS = {speak:'voiceOn.clarity.v1', read:'speechOn.read.v1', think:'speechOn.think.v1'};
 const readStore = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
 const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

 const doneOn = (mod, key = dateKey()) => !!readStore(KEYS[mod]).days?.[key]?.complete;

 const MODULES = [
  {id:'speak', href:'/', name:'Speak', sub:'Clear speech'},
  {id:'read',  href:'/read', name:'Read', sub:'Reading focus'},
  {id:'think', href:'/think', name:'Think', sub:'Quick thinking'}
 ];

 /* Theme and text size follow the speech app's settings, so all three look the same. */
 function applyDisplay(){
  const s = readStore(KEYS.speak), root = document.documentElement;
  if (!s.theme || s.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', s.theme);
  if (!s.text || s.text === 'normal') root.removeAttribute('data-text'); else root.setAttribute('data-text', s.text);
 }
 function setDisplay(patch){
  const s = readStore(KEYS.speak);
  try { localStorage.setItem(KEYS.speak, JSON.stringify({...s, ...patch})); } catch {}
  applyDisplay();
 }

 /* A streak counts a day when all three were done. */
 function allThree(key){ return MODULES.every(m => doneOn(m.id, key)); }
 function fullDayStreak(){
  let n = 0; const d = new Date();
  if (!allThree(dateKey(d))) d.setDate(d.getDate() - 1);
  while (allThree(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
 }

 function renderStrip(el, current){
  if (!el) return;
  el.replaceChildren();
  const count = MODULES.filter(m => doneOn(m.id)).length;
  const head = document.createElement('p');
  head.className = 'trio-head';
  const streak = fullDayStreak();
  head.textContent = count === 3
   ? `All three done today${streak > 1 ? ` · ${streak} full days in a row` : ''}`
   : `Today: ${count} of 3 done`;
  const list = document.createElement('div');
  list.className = 'trio-list';
  for (const m of MODULES) {
   const done = doneOn(m.id);
   const a = document.createElement('a');
   a.href = m.href;
   a.className = 'trio-item' + (done ? ' done' : '') + (m.id === current ? ' current' : '');
   if (m.id === current) a.setAttribute('aria-current', 'page');
   a.setAttribute('aria-label', `${m.name}: ${m.sub}${done ? ', done today' : ''}`);
   const mark = document.createElement('span'); mark.className = 'trio-mark'; mark.setAttribute('aria-hidden','true');
   mark.textContent = done ? '✓' : String(MODULES.indexOf(m) + 1);
   const txt = document.createElement('span'); txt.className = 'trio-text';
   const b = document.createElement('b'); b.textContent = m.name;
   const small = document.createElement('small'); small.textContent = m.sub;
   txt.append(b, small);
   a.append(mark, txt);
   list.append(a);
  }
  el.append(head, list);
 }

 /* The next module not yet done today, after the given one. */
 function next(after){
  const order = MODULES.map(m => m.id);
  const start = order.indexOf(after);
  for (let i = 1; i <= 3; i++) {
   const id = order[(start + i) % 3];
   if (!doneOn(id)) return MODULES.find(m => m.id === id);
  }
  return null;
 }

 /* iPhone and iPad: Safari has no install prompt, so show the steps once.
    Progress in Safari and in the home-screen app is stored separately on iOS,
    which is why the hint says to practise from the icon. */
 function installHint(){
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  let dismissed = false; try { dismissed = localStorage.getItem('speechOn.installHint') === 'no'; } catch {}
  if (!iOS || standalone || dismissed) return;
  const host = document.getElementById('trio'); if (!host) return;
  const box = document.createElement('div'); box.className = 'install-hint'; box.setAttribute('role', 'note');
  const p = document.createElement('p');
  p.innerHTML = '<b>Use Speech On like an app.</b> Tap <span aria-label="Share">Share ⬆︎</span>, then <b>Add to Home Screen</b>. It opens full screen and works offline. Practise from the icon: on iPhone, progress made in Safari stays in Safari.';
  const x = document.createElement('button'); x.className = 'quiet'; x.type = 'button'; x.textContent = 'Got it';
  x.onclick = () => { try { localStorage.setItem('speechOn.installHint', 'no'); } catch {} box.remove(); };
  box.append(p, x); host.after(box);
 }
 /* Ask the browser not to clear this site's storage under pressure. */
 try { navigator.storage?.persist?.(); } catch {}
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installHint); else installHint();

 window.Trio = {KEYS, dateKey, doneOn, renderStrip, next, applyDisplay, setDisplay, readStore, fullDayStreak, MODULES};
 applyDisplay();
})();

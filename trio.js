'use strict';
/* Speech On — the daily three: Speak, Read, Think.
   Reads each module's own localStorage key to show today's ticks.
   Nothing leaves the browser. */
(() => {
 const KEYS = {speak:'voiceOn.clarity.v1', read:'speechOn.read.v1', think:'speechOn.think.v1'};
 const readStore = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
 const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

 const LEGACY_SPEAK = 'voiceOn.v1';
 const doneOn = (mod, key = dateKey()) => {
  if (readStore(KEYS[mod]).days?.[key]?.complete) return true;
  if (mod !== 'speak') return false;
  const l = readStore(LEGACY_SPEAK).days?.[key];
  return !!l?.complete || (Array.isArray(l?.done) && l.done.length >= 5);
 };

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
  el.dataset.current = current || '';
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


 /* ---------------- progress: streaks, calendar, calendar files ---------------- */

 const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
 const dayNo = k => Math.round(parseKey(k).getTime() / 86400000);
 function historyKeys(){
  const keys = new Set();
  for (const k of [...Object.values(KEYS), LEGACY_SPEAK]) for (const d of Object.keys(readStore(k).days || {})) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) keys.add(d);
  return [...keys].sort();
 }
 const status = key => { const s = {}; let n = 0; for (const m of MODULES) { s[m.id] = doneOn(m.id, key); if (s[m.id]) n++; } s.count = n; return s; };

 /* Current streak: today counts if done, otherwise the run ending yesterday is still alive. */
 function streakOf(test){
  let n = 0; const d = new Date();
  if (!test(dateKey(d))) d.setDate(d.getDate() - 1);
  while (test(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
 }
 function bestOf(test, keys){
  let best = 0, run = 0, last = null;
  for (const k of keys) {
   if (!test(k)) { run = 0; last = null; continue; }
   const n = dayNo(k); run = last !== null && n === last + 1 ? run + 1 : 1; best = Math.max(best, run); last = n;
  }
  return best;
 }
 function stats(){
  const keys = historyKeys();
  const full = k => status(k).count === 3, any = k => status(k).count > 0;
  const now = new Date(), monthPrefix = dateKey(now).slice(0, 7);
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dateKey(d); });
  const last30 = [...Array(30)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dateKey(d); });
  const per = {};
  for (const m of MODULES) {
   const t = k => doneOn(m.id, k);
   per[m.id] = {current: streakOf(t), best: bestOf(t, keys), total: keys.filter(t).length, last30: last30.filter(t).length};
  }
  return {
   fullCurrent: streakOf(full), fullBest: bestOf(full, keys), fullTotal: keys.filter(full).length,
   anyCurrent: streakOf(any), daysPractised: keys.filter(any).length,
   monthFull: keys.filter(k => k.startsWith(monthPrefix) && full(k)).length, monthSoFar: now.getDate(),
   week: last7.reduce((a, k) => a + status(k).count, 0),
   last30Full: last30.filter(full).length,
   per, first: keys.find(any) || null
  };
 }

 const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
 const tile = (big, small) => { const t = h('div', 'kpi'); t.append(h('b', null, big), h('span', null, small)); return t; };

 function renderCalendar(host, year, month){
  host.replaceChildren();
  const first = new Date(year, month, 1), days = new Date(year, month + 1, 0).getDate();
  const head = h('div', 'cal-head');
  const prev = h('button', 'quiet', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous month');
  const next = h('button', 'quiet', '›'); next.type = 'button'; next.setAttribute('aria-label', 'Next month');
  const title = h('h3', 'cal-title', first.toLocaleDateString('en-GB', {month:'long', year:'numeric'}));
  const today = new Date();
  next.disabled = year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth());
  prev.onclick = () => renderCalendar(host, month ? year : year - 1, month ? month - 1 : 11);
  next.onclick = () => renderCalendar(host, month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  head.append(prev, title, next);
  const grid = h('div', 'cal-grid'); grid.setAttribute('role', 'grid'); grid.setAttribute('aria-label', title.textContent);
  for (const d of ['Mo','Tu','We','Th','Fr','Sa','Su']) grid.append(h('span', 'cal-dow', d));
  const offset = (first.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) grid.append(h('span', 'cal-pad'));
  const todayKey = dateKey();
  for (let d = 1; d <= days; d++) {
   const key = dateKey(new Date(year, month, d)), s = status(key);
   const cell = h('div', `cal-day c${s.count}${key === todayKey ? ' is-today' : ''}${key > todayKey ? ' future' : ''}`);
   cell.setAttribute('role', 'gridcell');
   const done = MODULES.filter(m => s[m.id]).map(m => m.name);
   cell.setAttribute('aria-label', `${d} ${title.textContent}: ${s.count === 3 ? 'all three done' : done.length ? done.join(', ') + ' done' : 'nothing done'}`);
   cell.append(h('span', 'cal-num', String(d)));
   const dots = h('span', 'cal-dots'); dots.setAttribute('aria-hidden', 'true');
   for (const m of MODULES) dots.append(h('i', s[m.id] ? 'on ' + m.id : ''));
   cell.append(dots);
   grid.append(cell);
  }
  const legend = h('p', 'cal-legend');
  legend.innerHTML = '<span><i class="on speak"></i>Speak</span><span><i class="on read"></i>Read</span><span><i class="on think"></i>Think</span><span><b class="cal-full-key"></b>All three</span>';
  host.append(head, grid, legend);
 }

 function download(name, lines){
  const blob = new Blob([lines.join('\r\n') + '\r\n'], {type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 const esc = v => String(v).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\;');
 const stampNow = () => new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');

 /* One recurring daily event covering all three, with links back into the app. */
 function reminderICS(time){
  const [hh, mm] = time.split(':').map(Number), at = new Date(); at.setHours(hh, mm, 0, 0);
  if (at <= new Date()) at.setDate(at.getDate() + 1);
  const start = dateKey(at).replaceAll('-','') + 'T' + time.replace(':','') + '00';
  const base = location.origin;
  const desc = `Your daily three, about 30 minutes:\n1. Speak: ${base}/\n2. Read: ${base}/read\n3. Think: ${base}/think`;
  download('speech-on-daily-three.ics', ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Speech On//Daily Three//EN','BEGIN:VEVENT',
   'UID:speech-on-daily-three@speechon.app','DTSTAMP:' + stampNow(),'DTSTART:' + start,'DURATION:PT30M','RRULE:FREQ=DAILY',
   'SUMMARY:' + esc('Speech On: Speak · Read · Think'),'DESCRIPTION:' + esc(desc),'URL:' + base + '/',
   'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:' + esc('Time for your daily three'),'END:VALARM','END:VEVENT','END:VCALENDAR']);
 }
 /* Every practised day as an all-day event. Stable UIDs, so re-importing updates rather than duplicates where the calendar supports it. */
 function logICS(){
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Speech On//Practice Log//EN','X-WR-CALNAME:Speech On practice'];
  let n = 0;
  for (const k of historyKeys()) {
   const s = status(k); if (!s.count) continue; n++;
   const done = MODULES.filter(m => s[m.id]).map(m => m.name);
   const end = parseKey(k); end.setDate(end.getDate() + 1);
   lines.push('BEGIN:VEVENT', `UID:speech-on-${k}@speechon.app`, 'DTSTAMP:' + stampNow(),
    'DTSTART;VALUE=DATE:' + k.replaceAll('-',''), 'DTEND;VALUE=DATE:' + dateKey(end).replaceAll('-',''),
    'SUMMARY:' + esc(s.count === 3 ? 'Speech On ✓ all three' : `Speech On ${s.count}/3: ${done.join(', ')}`),
    'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  if (n) download('speech-on-practice-log.ics', lines);
  return n;
 }

 function renderProgress(host){
  if (!host) return;
  const s = stats();
  host.replaceChildren();
  const top = h('div', 'progress-head');
  const title = h('h2', null, 'Your daily three');
  const lead = h('p', 'meta', s.fullCurrent
   ? `${s.fullCurrent} full day${s.fullCurrent === 1 ? '' : 's'} in a row. ${status(dateKey()).count === 3 ? 'Today is done.' : 'Finish all three today to keep it going.'}`
   : s.anyCurrent ? `${s.anyCurrent} day${s.anyCurrent === 1 ? '' : 's'} in a row with at least one. A full day is all three.` : 'A full day is all three: Speak, Read and Think. Start one today.');
  top.append(title, lead);
  const kpis = h('div', 'kpis');
  kpis.append(tile(String(s.fullCurrent), 'full-day streak'), tile(String(s.fullBest), 'best full-day streak'),
   tile(String(s.fullTotal), 'full days in total'), tile(`${s.monthFull}/${s.monthSoFar}`, 'full days this month'),
   tile(`${s.week}/21`, 'exercises in the last 7 days'), tile(String(s.daysPractised), 'days practised'));
  const per = h('div', 'per-mod');
  for (const m of MODULES) {
   const p = s.per[m.id], row = h('a', 'per-row'); row.href = m.href;
   const name = h('b', null, m.name);
   const bar = h('span', 'per-bar'); const fill = h('i', m.id); fill.style.width = Math.round(100 * p.last30 / 30) + '%'; bar.append(fill);
   bar.setAttribute('aria-hidden', 'true');
   const txt = h('span', 'per-txt', `${p.current}-day streak · best ${p.best} · ${p.last30}/30 days`);
   row.append(name, bar, txt);
   row.setAttribute('aria-label', `${m.name}: ${p.current}-day streak, best ${p.best}, ${p.last30} of the last 30 days, ${p.total} in total`);
   per.append(row);
  }
  const cal = h('div', 'cal'); const now = new Date(); renderCalendar(cal, now.getFullYear(), now.getMonth());
  const tools = h('div', 'cal-tools');
  const timeLbl = h('label', 'label', 'Daily reminder time'); timeLbl.htmlFor = 'trio-time';
  const time = document.createElement('input'); time.type = 'time'; time.id = 'trio-time'; time.className = 'field';
  try { time.value = localStorage.getItem('speechOn.trioTime') || '08:00'; } catch { time.value = '08:00'; }
  const msg = h('p', 'gentle-note'); msg.setAttribute('role', 'status');
  const r = h('button', 'btn-ghost', 'Add a daily reminder for all three ↓'); r.type = 'button';
  r.onclick = () => { if (!time.value) return; try { localStorage.setItem('speechOn.trioTime', time.value); } catch {} reminderICS(time.value);
   msg.textContent = 'Open the downloaded file to add a repeating 30-minute event to your calendar, with links to each exercise.'; };
  const l = h('button', 'btn-ghost', 'Add my practised days to my calendar ↓'); l.type = 'button';
  l.onclick = () => { const n = logICS(); msg.textContent = n
   ? `${n} practised day${n === 1 ? '' : 's'} saved as all-day events. Open the file to import them; do it again any time to bring the calendar up to date.`
   : 'Nothing to add yet. Finish an exercise first.'; };
  const note = h('p', 'gentle-note', 'Your history stays on this device. The calendar files are created here and only go where you open them.');
  tools.append(timeLbl, time, r, l, msg, note);
  host.append(top, kpis, per, cal, tools);
 }

 window.addEventListener('storage', () => { const p = document.getElementById('trio-progress'); if (p) renderProgress(p); renderStrip(document.getElementById('trio'), document.getElementById('trio')?.dataset.current); });

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

 window.Trio = {KEYS, dateKey, doneOn, renderStrip, renderProgress, stats, next, applyDisplay, setDisplay, readStore, fullDayStreak, MODULES};
 applyDisplay();
})();

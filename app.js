'use strict';
/* Speech On — session engine.
   No account, no backend, no microphone. Everything lives in this browser. */
(() => {
const C = window.SpeechContent;
const $ = id => document.getElementById(id);
const track = (name, props) => window.voiceTrack?.(name, props);

const KEY = 'voiceOn.clarity.v1';
const LEGACY = 'voiceOn.v1';

const readStore = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
const stored = readStore(KEY);
const legacy = readStore(LEGACY);

const state = {
 minutes:  [5,8,12,20].includes(stored.minutes) ? stored.minutes : 5,
 context:  stored.context in C.english.contexts ? stored.context : 'meeting',
 lang:     C.meta[stored.lang]?.ready ? stored.lang : pickLang(),
 goal:     [3,5,7].includes(stored.goal) ? stored.goal : 3,
 theme:    ['auto','light','dark'].includes(stored.theme) ? stored.theme : 'auto',
 text:     ['normal','large','larger'].includes(stored.text) ? stored.text : 'normal',
 pacer:    stored.pacer === true,
 reminderTime: /^\d{2}:\d{2}$/.test(stored.reminderTime || '') ? stored.reminderTime : '08:00',
 days:     stored.days && typeof stored.days === 'object' ? stored.days : {},
 session:  stored.session || null
};

let pack = C.english, storageWorks = true, lastCompleted = null, artNode = null;
let pacerId = null, pacerLeft = 0;

function pickLang(){
 const want = (navigator.languages || [navigator.language || 'en']).map(l => String(l).toLowerCase());
 for (const w of want) {
  const base = w.split('-')[0];
  if (C.meta[base]?.ready) return base;
 }
 return 'en';
}

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageWorks = false; } };
const dateKey = (d = new Date()) =>
 `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const daySeed = key => Math.floor(Date.parse(key + 'T12:00:00Z') / 86400000);
const t = (key, vars) => {
 let s = pack.ui[key] ?? C.english.ui[key] ?? '';
 if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
 return s;
};

/* ---------------- steps ---------------- */

function steps(session){
 const ids = C.ROUTES[session.minutes] || C.ROUTES[5];
 const seed = daySeed(session.date);
 return ids.map(id => {
  const shape = C.SHAPE[id];
  const copy  = pack.steps[id] || C.english.steps[id];
  const step  = {id, ...shape, ...copy};
  if (id === 'sentences') {
   const sets = pack.phraseSets || C.english.phraseSets;
   step.phrases = sets[((seed % sets.length) + sets.length) % sets.length];
  }
  if (id === 'emphasis') {
   const sets = pack.emphasisSets || C.english.emphasisSets;
   const set = sets[((seed % sets.length) + sets.length) % sets.length];
   step.phrases = set.lines; step.emphasis = set.words;
  }
  if (id === 'transfer') {
   const ctx = pack.contexts[session.context] || C.english.contexts.meeting;
   step.prompt = ctx.prompts[((seed % ctx.prompts.length) + ctx.prompts.length) % ctx.prompts.length];
  }
  return step;
 });
}

const validSession = s => s && s.version === 4 && C.ROUTES[s.minutes]
 && typeof s.date === 'string' && Number.isInteger(s.index)
 && s.index >= 0 && s.index < C.ROUTES[s.minutes].length;

/* Older saved sessions are migrated by exercise id where possible. */
if (state.session && state.session.version !== 4) {
 const old = state.session;
 const mins = [5,8,12,20].includes(old.minutes) ? old.minutes : 5;
 state.session = {version:4, date: typeof old.date === 'string' ? old.date : dateKey(),
  minutes: mins, context: state.context, index: 0};
}
if (!validSession(state.session)) state.session = null;

/* ---------------- chrome ---------------- */

function applyDisplay(){
 const root = document.documentElement;
 if (state.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', state.theme);
 if (state.text === 'normal') root.removeAttribute('data-text'); else root.setAttribute('data-text', state.text);
 for (const b of document.querySelectorAll('[data-theme-btn],#theme-seg button'))
  b.setAttribute('aria-pressed', String(b.dataset.theme === state.theme));
 for (const b of document.querySelectorAll('#text-seg button'))
  b.setAttribute('aria-pressed', String(b.dataset.text === state.text));
 for (const b of document.querySelectorAll('#pacer-seg button'))
  b.setAttribute('aria-pressed', String((b.dataset.pacer === 'on') === state.pacer));
}

function applyLanguage(){
 const meta = C.meta[state.lang];
 document.documentElement.lang = state.lang;
 document.documentElement.dir = meta.dir;
 const set = (id, key) => { const n = $(id); if (n) n.textContent = t(key); };

 set('hook','hook'); set('headline1','headline1'); set('headline2','headline2'); set('intro','intro');
 set('choose-time','chooseTime'); set('full-label','full'); set('full-min','fullMin');
 set('occasion-label','occasion'); set('language-label','language');
 set('reassurance','free'); set('hiw-title','howItWorks'); set('about','about');
 set('evidence-stamp','evidence'); set('open-habits','progressReminders');
 set('see-routine','seeRoutine'); set('restart','chooseNewSession');
 set('habits-title','yourPractice'); set('small-steps','smallSteps'); set('saved-here','savedHere');
 set('rhythm','rhythm'); set('streak-label','dayStreak'); set('best-label','personalBest');
 set('streak-note','streakNote'); set('goal-label','myGoal'); set('reminder','setReminder');
 set('export','exportProgress'); set('import','importProgress'); set('erase','eraseProgress');
 set('settings-title','settings'); set('appearance-label','appearance'); set('textsize-label','textSize');
 set('pacer-label','pacer'); set('pacer-note','pacerOptional');
 set('reminder-title','reminderTitle'); set('pick-time','pickTime'); set('daily-time-label','myDailyTime');
 set('reminder-note','reminderNote'); set('download-reminder','downloadReminder');
 set('exit','saveExit'); set('listen','hearInstructions'); set('exercise-tip','howToDoIt');
 set('your-session','yourSession'); set('back','back'); set('keyboard-hint','keyboard');
 set('feel-title','howDidItFeel'); set('takeaway','takeaway'); set('home-button','done');
 set('done-reminder','remindTomorrow'); set('share','share'); set('save-untimed','saveToday');
 set('done-eyebrow','yourPractice');

 for (const n of document.querySelectorAll('.min-label')) n.textContent = t('min');
 const themes = ['themeAuto','themeLight','themeDark'];
 [...document.querySelectorAll('#theme-seg button')].forEach((b,i) => b.textContent = t(themes[i]));
 const sizes = ['textNormal','textLarge','textLarger'];
 [...document.querySelectorAll('#text-seg button')].forEach((b,i) => b.textContent = t(sizes[i]));
 const pacers = ['pacerOff','pacerOn'];
 [...document.querySelectorAll('#pacer-seg button')].forEach((b,i) => b.textContent = t(pacers[i]));
 const feelings = ['easier','same','harder'];
 [...document.querySelectorAll('[data-feeling]')].forEach(b => b.textContent = t(b.dataset.feeling));
 $('feedback').textContent = t('feelingDefault');

 const hiw = $('hiw-list'); hiw.replaceChildren();
 for (const line of (pack.ui.hiw || C.english.ui.hiw)) {
  const li = document.createElement('li'); li.textContent = line; hiw.append(li);
 }

 $('disclaimer-text').firstChild.textContent = ' ' + t('disclaimer') + ' ';
 $('safety-link').textContent = t('safetyLink');
 $('terms-link').textContent = t('termsLink');

 const goal = $('weekly-goal'); const prev = state.goal; goal.replaceChildren();
 for (const [v,k] of [[3,'goal3'],[5,'goal5'],[7,'goal7']]) {
  const o = document.createElement('option'); o.value = String(v); o.textContent = t(k); goal.append(o);
 }
 goal.value = String(prev);

 const ctx = $('context'); ctx.replaceChildren();
 for (const [id, def] of Object.entries(pack.contexts)) {
  const o = document.createElement('option'); o.value = id; o.textContent = def.label; ctx.append(o);
 }
 ctx.value = state.context;

 const note = $('lang-note');
 if (state.lang !== 'en' && !C.meta[state.lang].reviewed) { note.hidden = false; note.textContent = t('langNote'); }
 else note.hidden = true;
}

function buildLanguageSelect(){
 const sel = $('language'); sel.replaceChildren();
 const groups = {world:'Worldwide', india:'India'};
 for (const g of ['world','india']) {
  const og = document.createElement('optgroup'); og.label = groups[g];
  for (const l of C.LANGUAGES.filter(x => x.group === g && x.ready)) {
   const o = document.createElement('option'); o.value = l.code;
   o.textContent = l.native === l.name ? l.native : `${l.native} · ${l.name}`;
   og.append(o);
  }
  sel.append(og);
 }
 sel.value = state.lang;
}

async function setLanguage(code){
 const sel = $('language');
 try {
  sel.disabled = true;
  pack = await C.load(code);
  state.lang = code; save();
  applyLanguage(); renderHome();
  if (!$('player').hidden) renderStep();
 } catch {
  state.lang = 'en'; pack = C.english; sel.value = 'en';
  applyLanguage(); renderHome();
  const note = $('lang-note'); note.hidden = false; note.textContent = t('langFailed');
 } finally { sel.disabled = false; }
}

/* ---------------- home ---------------- */

function show(screen){
 document.querySelector('.site-header').inert = screen === 'player';
 document.body.classList.toggle('practicing', screen === 'player');
 for (const id of ['home','player','done']) $(id).hidden = id !== screen;
 document.querySelector('footer').hidden = screen === 'player';
 window.scrollTo(0,0);
}

const completed = key => !!state.days[key]?.complete || !!legacy.days?.[key]?.complete
 || (Array.isArray(legacy.days?.[key]?.done) && legacy.days[key].done.length >= 5);

function habitStats(){
 const keys = [...new Set([...Object.keys(legacy.days || {}), ...Object.keys(state.days)])]
  .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && completed(k)).sort();
 let best = 0, run = 0, last = null;
 for (const k of keys) { const d = daySeed(k); run = last !== null && d === last + 1 ? run + 1 : 1; best = Math.max(best, run); last = d; }
 let current = 0, date = new Date();
 if (!completed(dateKey(date))) date.setDate(date.getDate() - 1);
 while (completed(dateKey(date))) { current++; date.setDate(date.getDate() - 1); }
 return {current, best};
}

function renderHandoff(){
 const next = window.Trio?.next('speak'), a = $('handoff');
 if (!a) return;
 if (!next || !completed(dateKey())) { a.hidden = true; return; }
 a.href = next.href; a.hidden = false;
 a.querySelector('b').textContent = `Next: ${next.name} →`;
 a.querySelector('span').textContent = next.id === 'read' ? 'Ten minutes of reading focus' : 'Ten minutes of quick thinking';
}

function renderHome(){
 window.Trio?.renderStrip($('trio'), 'speak');
 const mins = state.session?.minutes || state.minutes;
 for (const b of document.querySelectorAll('[data-minutes]')) {
  b.setAttribute('aria-pressed', String(Number(b.dataset.minutes) === mins));
  b.disabled = !!state.session;
 }
 $('context').disabled = !!state.session;
 $('routine-detail').textContent = t('routine' + mins);

 $('start').replaceChildren();
 const word = document.createElement('strong');
 word.textContent = state.session ? t('resume') : t('go');
 const label = document.createElement('span');
 label.textContent = state.session
  ? t('stepOf', {n: state.session.index + 1, total: C.ROUTES[state.session.minutes].length})
  : t('startPractice');
 $('start').append(word, label);
 $('restart').hidden = !state.session;

 const week = $('week'); week.replaceChildren(); let count = 0;
 for (let i = 6; i >= 0; i--) {
  const d = new Date(); d.setDate(d.getDate() - i);
  const key = dateKey(d), done = completed(key); if (done) count++;
  const cell = document.createElement('div');
  cell.className = `day${i === 0 ? ' today' : ''}${done ? ' complete' : ''}`;
  cell.setAttribute('aria-label',
   `${d.toLocaleDateString(state.lang, {weekday:'long', month:'short', day:'numeric'})}: ${done ? t('practised') : t('notPractised')}`);
  const wd = document.createElement('span');
  wd.textContent = d.toLocaleDateString(state.lang, {weekday:'short'}).slice(0,2);
  const mark = document.createElement('b'); mark.textContent = done ? '✓' : i === 0 ? '·' : '–';
  cell.append(wd, mark); week.append(cell);
 }
 week.setAttribute('aria-label', t('weekAria'));

 const s = habitStats();
 $('current-streak').textContent = s.current; $('best-streak').textContent = s.best;
 $('weekly-goal').value = String(state.goal);
 $('goal-progress').max = state.goal; $('goal-progress').value = Math.min(count, state.goal);
 $('goal-copy').textContent = count >= state.goal ? t('goalMet') : t('goalProgress', {n: count, goal: state.goal});
 $('habit-title').textContent = count
  ? t(count === 1 ? 'weekSoFar' : 'weekSoFarPlural', {n: count}) : t('firstPractice');
 $('habit-copy').textContent = completed(dateKey()) ? t('todayDone') : t('noCatchUp');
}

/* ---------------- player ---------------- */

function stopSpeech(){ if ('speechSynthesis' in window) speechSynthesis.cancel(); }
function stopPacer(){ if (pacerId) { clearInterval(pacerId); pacerId = null; } }

function start(fresh = false){
 const resuming = !fresh && !!state.session;
 if (fresh && state.session) track('session_exit', {step: state.session.index + 1, minutes: state.session.minutes});
 if (fresh || !state.session)
  state.session = {version:4, date: dateKey(), minutes: state.minutes, context: state.context, index: 0};
 track(resuming ? 'session_resume' : 'session_start',
  {minutes: state.session.minutes, step: state.session.index + 1});
 save(); show('player'); renderStep();
}

function renderStep(){
 stopSpeech(); stopPacer();
 if (artNode) { window.SpeechArt.stop(artNode); artNode = null; }

 const session = state.session, list = steps(session), step = list[session.index];
 const total = list.length, pct = Math.round(session.index / total * 100);

 $('step-count').textContent = t('stepCount', {n: session.index + 1, total, pct});
 $('session-percent').textContent = t('percentComplete', {n: pct});

 const bar = $('progress');
 bar.setAttribute('role','progressbar');
 bar.setAttribute('aria-valuemin','0'); bar.setAttribute('aria-valuemax','100');
 bar.setAttribute('aria-valuenow', String(pct));
 bar.replaceChildren(); $('journey').replaceChildren();
 $('journey').classList.toggle('long-journey', total > 10);

 list.forEach((item, i) => {
  const seg = document.createElement('span');
  seg.className = i < session.index ? 'complete' : i === session.index ? 'current' : '';
  bar.append(seg);
  const li = document.createElement('li');
  if (i === session.index) li.setAttribute('aria-current','step');
  const n = document.createElement('span'); n.textContent = i < session.index ? '✓' : String(i + 1);
  li.append(n, document.createTextNode(item.short));
  $('journey').append(li);
 });

 $('phase').textContent = step.short.toUpperCase();
 $('exercise-title').textContent = step.title;
 $('instruction').textContent = step.instruction;

 const note = $('step-note');
 if (step.note) {
  note.hidden = false; note.replaceChildren();
  const b = document.createElement('b'); b.textContent = t('noteLabel') + ': ';
  note.append(b, document.createTextNode(step.note));
 } else note.hidden = true;

 renderMaterial(step);
 $('back').disabled = session.index === 0;
 $('next').textContent = session.index === total - 1 ? t('finish') : t('next');
 $('listen').disabled = !('speechSynthesis' in window);
 $('listen').setAttribute('aria-pressed','false');
 $('exercise-title').focus({preventScroll:true});
}

function renderMaterial(step){
 const box = $('material'); box.replaceChildren();
 const wrap = document.createElement('div'); wrap.className = 'material';

 const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 artNode = window.SpeechArt.build(step.art, C.ART_LABELS[step.art] || '', still);
 wrap.append(artNode);

 if (step.kind === 'pairs' && step.pairs) {
  const table = document.createElement('table'); table.className = 'sound-words';
  const head = document.createElement('thead'); const hr = document.createElement('tr');
  for (const label of ['Sounds','Words']) { const th = document.createElement('th'); th.textContent = label; hr.append(th); }
  head.append(hr); table.append(head);
  const body = document.createElement('tbody');
  for (const pair of step.pairs) {
   const row = document.createElement('tr');
   for (const cell of pair) { const td = document.createElement('td'); td.textContent = cell; row.append(td); }
   body.append(row);
  }
  table.append(body); wrap.append(table);
 } else if (step.kind === 'context') {
  const p = document.createElement('p'); p.className = 'context-prompt'; p.textContent = step.prompt;
  wrap.append(p);
 } else if (step.phrases) {
  const ul = document.createElement('ul'); ul.className = 'all-phrases';
  step.phrases.forEach((phrase, i) => {
   const li = document.createElement('li');
   if (step.emphasis) {
    const word = step.emphasis[i], at = phrase.indexOf(word);
    if (at < 0) li.textContent = phrase;
    else {
     li.append(document.createTextNode(phrase.slice(0, at)));
     const strong = document.createElement('strong'); strong.textContent = word;
     li.append(strong, document.createTextNode(phrase.slice(at + word.length)));
    }
   } else if (step.pauseMarks) {
    phrase.split('/').forEach((part, j) => {
     if (j) { const m = document.createElement('strong'); m.className = 'pause-mark'; m.textContent = '/'; li.append(m); }
     li.append(document.createTextNode(part));
    });
   } else li.textContent = phrase;
   ul.append(li);
  });
  wrap.append(ul);
 } else if (step.quote) {
  const q = document.createElement('blockquote'); q.id = 'card-text'; q.textContent = step.quote;
  wrap.append(q);
 }

 if (step.tones) {
  const row = document.createElement('div'); row.className = 'delivery-tones';
  step.tones.forEach((tone, i) => { const s = document.createElement('span'); s.textContent = `${i+1}. ${tone}`; row.append(s); });
  wrap.append(row);
 }

 if (state.pacer && step.secs) wrap.append(buildPacer(step.secs));
 else if (step.secs) {
  const hint = document.createElement('p'); hint.className = 'pacer-note';
  hint.textContent = t('pacerHint', {n: step.secs});
  wrap.append(hint);
 }
 box.append(wrap);
}

function buildPacer(secs){
 const row = document.createElement('div'); row.className = 'pacer';
 const btn = document.createElement('button'); btn.type = 'button';
 btn.setAttribute('aria-pressed','false');
 btn.textContent = t('pacerStart', {n: secs});
 const ring = document.createElement('span'); ring.className = 'pacer-ring'; ring.setAttribute('role','status');
 const note = document.createElement('span'); note.className = 'pacer-note'; note.textContent = t('pacerOptional');
 const fmt = s => `${Math.floor(s/60)}:${String(s % 60).padStart(2,'0')}`;

 btn.onclick = () => {
  if (pacerId) { stopPacer(); btn.setAttribute('aria-pressed','false'); btn.textContent = t('pacerStart',{n:secs}); ring.textContent = ''; return; }
  pacerLeft = secs; ring.textContent = fmt(pacerLeft);
  btn.setAttribute('aria-pressed','true'); btn.textContent = t('pacerStop');
  pacerId = setInterval(() => {
   pacerLeft--;
   if (pacerLeft <= 0) { stopPacer(); ring.textContent = ''; note.textContent = t('pacerDone');
    btn.setAttribute('aria-pressed','false'); btn.textContent = t('pacerStart',{n:secs}); return; }
   ring.textContent = fmt(pacerLeft);
  }, 1000);
 };
 row.append(btn, ring, note);
 return row;
}

function advance(){
 stopSpeech(); stopPacer();
 track('exercise_complete', {step: state.session.index + 1, minutes: state.session.minutes});
 if (state.session.index === steps(state.session).length - 1) return finish();
 state.session.index++; save(); renderStep();
}

function finish(){
 const mins = state.session.minutes;
 track('session_complete', {minutes: mins, step: steps(state.session).length});
 lastCompleted = dateKey(); state.session = null; save(); show('done');
 $('done-summary').textContent = t('practisedOutLoud');
 $('done-title').replaceChildren(document.createTextNode(t('takeItWith') + ' '));
 const em = document.createElement('em'); em.textContent = t('takeItEm'); $('done-title').append(em);
 $('save-untimed').hidden = false;
 $('home-button').className = 'quiet';
 document.querySelector('.reflection').hidden = true;
 $('share-status').textContent = '';
 renderHandoff();
 $('done-title').setAttribute('tabindex','-1'); $('done-title').focus({preventScroll:true});
}

function renderFeeling(){
 const feeling = state.days[lastCompleted]?.feeling;
 for (const b of document.querySelectorAll('[data-feeling]'))
  b.setAttribute('aria-pressed', String(b.dataset.feeling === feeling));
 $('feedback').textContent = feeling
  ? t({easier:'feelingEasier', same:'feelingSame', harder:'feelingHarder'}[feeling])
  : t('feelingDefault');
}

function exit(){
 stopSpeech(); stopPacer();
 if (state.session) track('session_exit', {step: state.session.index + 1, minutes: state.session.minutes});
 save(); show('home'); renderHome();
 if (!storageWorks) { $('resume').hidden = false; $('resume').textContent = t('storageGone'); }
 $('start').focus({preventScroll:true});
}

/* ---------------- dialogs ---------------- */

function info(title, nodes){
 $('info-title').textContent = title;
 $('info-body').replaceChildren(...nodes);
 $('info').showModal();
}
const para = (text, cls) => { const p = document.createElement('p'); if (cls) p.className = cls; p.textContent = text; return p; };
const head = text => { const h = document.createElement('h3'); h.textContent = text; return h; };
function link(href, text){ const a = document.createElement('a'); a.href = href; a.textContent = text; a.rel = 'noopener'; return a; }

/* About and evidence text stays in English deliberately: a mistranslated
   caution is worse than an untranslated one. */
function openAbout(){
 const body = [
  para('Speech On is a free speech warm-up for practising clear sounds, steady pacing and natural speech. It does not assess your speech, does not promise results, and does not replace speech and language therapy. It is not a medical device.'),
  head('Your privacy'),
  para('Your practice history, preferences and unfinished session stay in this browser. There is no account, no microphone and no voice recording. Site statistics are anonymous and can be switched off on the privacy page. Fonts are served from this domain, so nothing is requested from any third party.'),
  head('Why these exercises?'),
  para('Deliberately clearer articulation, rate control and pausing are techniques used in speech therapy, and the speech steps here are built on them. The face massage is a relaxation step and the lip trill is a voice warm-up; neither is proven to improve articulation, and the app says so on those screens. Nothing here is a muscle-strengthening exercise.'),
  para('The cited guidance describes clinical techniques, mainly for people with diagnosed speech disorders. It does not validate this app or this routine. These routines have not been clinically validated and are not a treatment for stuttering, dysarthria, apraxia or any other condition.'),
  head('Safety'),
  para('Practise at a comfortable volume and stop if speaking hurts or feels strained. Rest a hoarse or tired voice. Sudden slurred speech or one-sided weakness needs emergency medical help, not practice.')
 ];
 const links = document.createElement('p');
 links.append(document.createTextNode('More: '),
  link('/safety','Practising safely'), document.createTextNode(' · '),
  link('/routine','Every exercise'), document.createTextNode(' · '),
  link('/for-clinicians','For clinicians'), document.createTextNode(' · '),
  link('/privacy','Privacy'), document.createTextNode(' · '),
  link('/terms','Terms'));
 body.push(links);
 const sources = document.createElement('p');
 sources.append(document.createTextNode('Sources: '),
  link('https://www.asha.org/practice-portal/clinical-topics/dysarthria-in-adults/','ASHA on clear speech'),
  document.createTextNode(' · '),
  link('https://pubs.asha.org/doi/10.1044/1058-0360(2009/09-0006)','ASHA review of non-speech oral motor exercises'),
  document.createTextNode(' · '),
  link('https://www.nidcd.nih.gov/health/taking-care-your-voice','NIDCD on voice care'));
 body.push(sources);
 info('How this was built', body);
}

/* ---------------- data tools ---------------- */

function exportData(){
 const blob = new Blob([JSON.stringify({app:'speech-on', version:1, exported:new Date().toISOString(),
  days:state.days, goal:state.goal, lang:state.lang}, null, 1)], {type:'application/json'});
 const url = URL.createObjectURL(blob), a = document.createElement('a');
 a.href = url; a.download = 'speech-on-progress.json';
 document.body.append(a); a.click(); a.remove();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
 $('data-status').textContent = t('exported');
}

function importData(file){
 const reader = new FileReader();
 reader.onload = () => {
  try {
   const data = JSON.parse(String(reader.result));
   if (!data || typeof data.days !== 'object') throw new Error('bad');
   for (const [k, v] of Object.entries(data.days))
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') state.days[k] = {...state.days[k], ...v};
   if ([3,5,7].includes(data.goal)) state.goal = data.goal;
   save(); renderHome(); $('data-status').textContent = t('imported');
  } catch { $('data-status').textContent = t('importFailed'); }
 };
 reader.onerror = () => { $('data-status').textContent = t('importFailed'); };
 reader.readAsText(file);
}

function eraseData(){
 if (!confirm(t('eraseConfirm'))) return;
 state.days = {}; state.session = null; lastCompleted = null;
 try { localStorage.removeItem(LEGACY); } catch {}
 save(); renderHome(); $('data-status').textContent = t('erased');
}

/* ---------------- reminder ---------------- */

function downloadReminder(){
 const input = $('reminder-time');
 if (!input.reportValidity()) return;
 state.reminderTime = input.value; save();
 const now = new Date(), [h, m] = input.value.split(':').map(Number);
 const at = new Date(); at.setHours(h, m, 0, 0);
 if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
 const stamp = dateKey(at).replaceAll('-','') + 'T' + input.value.replace(':','') + '00';
 const esc = v => v.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\;');
 const url = new URL('./', location.href).href;
 const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Speech On//Daily Practice//EN','BEGIN:VEVENT',
  'UID:speech-on-daily-practice@speechon.app',
  'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
  'DTSTART:' + stamp, 'DURATION:PT' + state.minutes + 'M', 'RRULE:FREQ=DAILY',
  'SUMMARY:' + esc(t('reminderSummary')),
  'DESCRIPTION:' + esc(t('reminderSummary') + ' — ' + url),
  'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:' + esc(t('reminderSummary')),
  'END:VALARM','END:VEVENT','END:VCALENDAR'];
 const blob = new Blob([lines.join('\r\n') + '\r\n'], {type:'text/calendar;charset=utf-8'});
 const objectURL = URL.createObjectURL(blob), a = document.createElement('a');
 a.href = objectURL; a.download = 'speech-on-daily-reminder.ics';
 document.body.append(a); a.click(); a.remove();
 setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
 track('reminder_download', {minutes: state.minutes});
 $('reminder-status').textContent = t('reminderDone');
}

/* ---------------- wiring ---------------- */

$('start').onclick = () => start();
$('restart').onclick = () => { state.session = null; save(); renderHome(); document.querySelector('[data-minutes]').focus(); };
$('next').onclick = advance;
$('exit').onclick = exit;
$('back').onclick = () => { if (state.session.index === 0) return; stopSpeech(); stopPacer(); state.session.index--; save(); renderStep(); };

$('listen').onclick = () => {
 if (!('speechSynthesis' in window)) return;
 speechSynthesis.cancel();
 const step = steps(state.session)[state.session.index];
 const u = new SpeechSynthesisUtterance(`${step.title}. ${step.instruction}`);
 u.lang = document.documentElement.lang || 'en';
 u.rate = 0.9;
 $('listen').setAttribute('aria-pressed','true');
 u.onend = u.onerror = () => $('listen').setAttribute('aria-pressed','false');
 speechSynthesis.speak(u);
};

$('exercise-tip').onclick = () => {
 const step = steps(state.session)[state.session.index];
 const nodes = [para(step.instruction)];
 if (step.note) nodes.push(para(step.note));
 nodes.push(para(step.tip));
 nodes.push((() => { const p = document.createElement('p'); p.className = 'gentle-note';
  p.append(link('/safety','Practising safely ↗')); return p; })());
 info(t('howToTitle'), nodes);
};

$('about').onclick = openAbout;
$('evidence-stamp').onclick = openAbout;
$('close-info').onclick = () => $('info').close();
$('open-habits').onclick = () => { $('data-status').textContent = ''; $('habits').showModal(); };
$('close-habits').onclick = () => $('habits').close();
$('open-settings').onclick = () => $('settings').showModal();
$('close-settings').onclick = () => $('settings').close();
$('reminder').onclick = $('done-reminder').onclick = () => {
 $('reminder-time').value = state.reminderTime; $('reminder-status').textContent = ''; $('reminder-dialog').showModal();
};
$('close-reminder').onclick = () => $('reminder-dialog').close();
$('download-reminder').onclick = downloadReminder;

$('export').onclick = exportData;
$('import').onclick = () => $('import-file').click();
$('import-file').onchange = e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ''; };
$('erase').onclick = eraseData;

$('save-untimed').onclick = () => {
 const key = dateKey(), prev = state.days[key] || {};
 state.days[key] = {...prev, complete:true, count:(prev.count || 0) + 1};
 lastCompleted = key; save(); track('practice_confirm');
 $('save-untimed').hidden = true; $('home-button').className = 'primary';
 $('done-summary').textContent = storageWorks ? t('savedToday') : t('savedNoStorage');
 $('done-title').replaceChildren(document.createTextNode(t('practiceDone') + ' '));
 const em = document.createElement('em'); em.textContent = t('doneEm'); $('done-title').append(em);
 document.querySelector('.reflection').hidden = false; renderFeeling();
 renderHandoff();
};
$('home-button').onclick = () => { show('home'); renderHome(); $('start').focus({preventScroll:true}); };

$('share').onclick = async () => {
 track('share_click');
 const url = new URL('./', location.href).href;
 try {
  if (navigator.share) { await navigator.share({title:'Speech On', text:t('shareText'), url}); $('share-status').textContent = t('shared'); }
  else { await navigator.clipboard.writeText(url); $('share-status').textContent = t('linkCopied'); }
 } catch (err) { if (err.name !== 'AbortError') $('share-status').textContent = t('shareFallback', {url}); }
};

for (const b of document.querySelectorAll('[data-minutes]'))
 b.onclick = () => { state.minutes = Number(b.dataset.minutes); save(); renderHome(); };
for (const b of document.querySelectorAll('[data-feeling]'))
 b.onclick = () => { if (!state.days[lastCompleted]) return; state.days[lastCompleted].feeling = b.dataset.feeling; save(); renderFeeling(); };
for (const b of document.querySelectorAll('#theme-seg button'))
 b.onclick = () => { state.theme = b.dataset.theme; save(); applyDisplay(); };
for (const b of document.querySelectorAll('#text-seg button'))
 b.onclick = () => { state.text = b.dataset.text; save(); applyDisplay(); };
for (const b of document.querySelectorAll('#pacer-seg button'))
 b.onclick = () => { state.pacer = b.dataset.pacer === 'on'; save(); applyDisplay(); if (!$('player').hidden) renderStep(); };

$('weekly-goal').onchange = e => { state.goal = Number(e.target.value); track('weekly_goal_change',{goal:state.goal}); save(); renderHome(); };
$('context').onchange = e => { state.context = e.target.value; save(); };
$('language').onchange = e => setLanguage(e.target.value);

document.addEventListener('keydown', event => {
 if ($('player').hidden) return;
 if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
 if (document.querySelector('dialog[open]')) return;
 if (event.target.closest('button,a,summary,input,textarea,select,[contenteditable]')) return;
 const rtl = document.documentElement.dir === 'rtl';
 const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
 const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
 if (event.key === forward) { event.preventDefault(); advance(); }
 else if (event.key === backward) { event.preventDefault(); $('back').click(); }
 else if (event.key === 'Escape') { event.preventDefault(); exit(); }
});

window.addEventListener('pagehide', () => { stopSpeech(); stopPacer(); save(); });

let shownDay = dateKey();
setInterval(() => {
 if (dateKey() !== shownDay) { shownDay = dateKey(); if (!$('home').hidden) renderHome(); }
}, 30000);

/* ---------------- boot ---------------- */

applyDisplay();
buildLanguageSelect();
applyLanguage();
renderHome();
if (state.lang !== 'en') setLanguage(state.lang);

if ('serviceWorker' in navigator)
 window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();

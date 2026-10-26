'use strict';
/* Speech On — Read. Guided reading practice, one paragraph at a time.
   No account, no backend. Your answers and progress stay in this browser. */
(() => {
const $ = id => document.getElementById(id);
const T = window.Trio;
const track = (name, props) => window.voiceTrack?.(name, props);
const KEY = T.KEYS.read;
const dateKey = T.dateKey;

/* ---------------- state ---------------- */

const stored = T.readStore(KEY);
const state = {
 done:  stored.done && typeof stored.done === 'object' ? stored.done : {},
 days:  stored.days && typeof stored.days === 'object' ? stored.days : {},
 deck:  stored.deck && typeof stored.deck === 'object' ? stored.deck : {},
 obstacles: {word:0, sentence:0, wander:0, logic:0, rushed:0, ...(stored.obstacles || {})},
 drift: {with:0, drifted:0, unsure:0, ...(stored.drift || {})},
 totals: {paras:0, got:0, partly:0, missed:0, mc:0, mcRight:0, v:0, vRight:0, ...(stored.totals || {})},
 session: stored.session || null,
 mix: stored.mix === 'hard' ? 'hard' : 'mixed'
};
let storageWorks = true;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageWorks = false; } };

let INDEX = null;            // reading/index.json: {total, files:[{f, from, to}], titles:[[title, topic]]}
const fileCache = {};

/* ---------------- content ---------------- */

async function loadIndex(){
 if (INDEX) return INDEX;
 const r = await fetch('reading/index.json');
 if (!r.ok) throw new Error('index');
 INDEX = await r.json();
 return INDEX;
}
async function getPassage(n){
 const idx = await loadIndex();
 const file = idx.files.find(f => n >= f.from && n <= f.to);
 if (!file) return null;
 if (!fileCache[file.f]) {
  const r = await fetch('reading/' + file.f);
  if (!r.ok) throw new Error('file');
  fileCache[file.f] = await r.json();
 }
 const p = fileCache[file.f].passages[n - file.from];
 return p ? {...p, n} : null;
}
/* Reading order mixes levels from day one (dense, argument, dense, clear…).
   “Hardest only” skips the clearer passages. */
const LEVEL_NAMES = {1:'Clear', 2:'Argument', 3:'Dense'};
const level = n => INDEX?.levels?.[n - 1] || 3;
const sequence = () => (INDEX.order || [...Array(INDEX.total)].map((_, i) => i + 1)).filter(n => state.mix !== 'hard' || level(n) > 1);
const nextUndone = () => {
 if (!INDEX) return 1;
 for (const n of sequence()) if (!state.done[n]) return n;
 return null;
};
const dayOf = n => sequence().indexOf(n) + 1;

/* Deterministic shuffle so a resumed session shows options in the same order. */
function shuffled(arr, seed){
 let s = seed >>> 0;
 const rnd = () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
 const order = arr.map((_, i) => i);
 for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
 return order;
}
const sentences = text => text.match(/[^.!?]+[.!?]+["”’')\]]*|[^.!?]+$/g)?.map(s => s.trim()) || [text];
function sentenceWith(p, word){
 const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`, 'i');
 for (const para of p.p) for (const s of sentences(para)) if (re.test(s)) return s;
 return '';
}

/* ---------------- toolkit ---------------- */

const TOOLKIT = [
 ['Set your question', 'Before you start, know what you are reading to find out.'],
 ['One paragraph at a time', 'Read it once at a comfortable pace. Do not race ahead.'],
 ['Look away and say it', '“The author is saying ___ because ___.” Rough wording is fine.'],
 ['Stuck? Name the obstacle', 'A word, a long sentence, a wandering mind or a gap in the logic. Each has its own fix.'],
 ['Connect', 'How does this paragraph change or support the last one?'],
 ['Three points from memory', 'At the end, recall before you check. Recall is what makes it stick.']
];
function toolkitList(cls = 'toolkit'){
 const ol = document.createElement('ol'); ol.className = cls;
 for (const [b, s] of TOOLKIT) {
  const li = document.createElement('li'), d = document.createElement('div');
  const bb = document.createElement('b'); bb.textContent = b;
  const ss = document.createElement('span'); ss.textContent = s;
  d.append(bb, ss); li.append(d); ol.append(li);
 }
 return ol;
}

const LINKS = [
 ['add', 'adds a further point to'],
 ['eg', 'gives an example of'],
 ['but', 'pushes back on or contrasts with'],
 ['why', 'explains the cause behind'],
 ['so', 'shows what follows from'],
 ['sum', 'draws a conclusion from']
];
const linkText = code => (LINKS.find(l => l[0] === code) || ['', 'relates to'])[1];

const OBSTACLES = [
 ['word', 'A word I didn’t know', 'Look up just that word, put its meaning in your own words, then reread the one sentence it was in.'],
 ['sentence', 'A long sentence', 'Break it into two or three short claims. Find the main subject and verb first; everything else hangs off them.'],
 ['wander', 'My mind wandered', 'Normal, and noticing it is the skill. Go back to the last sentence you remember and continue from there, not from the top.'],
 ['logic', 'The logic didn’t connect', 'Ask what evidence links the claim to the conclusion. If the author skipped a step, say the missing step out loud.'],
 ['rushed', 'I just rushed it', 'Slow the next paragraph down slightly. Comprehension usually breaks at speed before it breaks at difficulty.']
];

const MC_KIND = {main:'Main idea', infer:'Read between the lines', build:'How it is built', detail:'Detail', purpose:'Author’s purpose', apply:'Apply it'};

/* ---------------- spaced vocabulary ---------------- */

const INTERVALS = [1, 3, 7, 16, 35, 90];
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return dateKey(d); };
const dueCards = () => Object.values(state.deck).filter(c => c.due <= dateKey()).sort((a, b) => a.due < b.due ? -1 : 1);
function scheduleCard(card, right){
 card.box = right ? Math.min((card.box ?? 0) + 1, INTERVALS.length - 1) : 0;
 card.due = addDays(INTERVALS[card.box]);
 card.seen = (card.seen || 0) + 1;
 if (right) card.right = (card.right || 0) + 1;
}

/* ---------------- session building ---------------- */

function buildSteps(session, p){
 const s = [];
 if (session.type !== 'review') s.push({k:'primer'});
 for (let i = 0; i < (session.warm || []).length; i++) s.push({k:'card', i});
 if (session.type === 'review') { s.push({k:'done'}); return s; }
 if (session.type === 'own') {
  s.push({k:'paste'});
  const paras = session.paras || [];
  for (let i = 0; i < paras.length; i++) s.push({k:'read', i}, {k:'explain', i}, {k:'compare', i});
  if (paras.length) s.push({k:'recall'});
  s.push({k:'done'});
  return s;
 }
 s.push({k:'preview'});
 p.p.forEach((_, i) => s.push({k:'read', i}, {k:'explain', i}, {k:'compare', i}));
 s.push({k:'recall'});
 p.mc.forEach((_, i) => s.push({k:'mc', i}));
 p.v.forEach((_, i) => s.push({k:'vocab', i}));
 s.push({k:'done'});
 return s;
}

let current = null;   // {session, p, steps}

async function begin(type, n){
 if (type === 'passage') {
  const p = await getPassage(n);
  if (!p) return;
  const warm = dueCards().slice(0, 3).map(c => c.w);
  state.session = {type, n, index:0, warm, a:{}, started:Date.now(), v:2};
 } else if (type === 'own') {
  state.session = {type, n:0, index:0, warm:[], a:{}, paras:[], started:Date.now(), v:2};
 } else {
  const warm = dueCards().slice(0, 15).map(c => c.w);
  if (!warm.length) return;
  state.session = {type:'review', n:0, index:0, warm, a:{}, started:Date.now(), v:2};
 }
 save();
 track('session_start', {minutes:10});
 await open();
}

async function open(){
 const session = state.session;
 const p = session.type === 'passage' ? await getPassage(session.n) : null;
 if (session.type === 'passage' && !p) { state.session = null; save(); renderHome(); return; }
 if (session.type === 'own' && session.paras?.length) {
  current = {session, p:{t:'Your article', p:session.paras}, steps:null};
 } else current = {session, p, steps:null};
 current.steps = buildSteps(session, current.p);
 $('home').hidden = true; document.querySelector('footer').hidden = true; $('trio').hidden = true;
 document.querySelector('.site-header').inert = true;
 $('stage').hidden = false; document.body.classList.add('practicing');
 renderStep();
}

function closeStage(){
 $('stage').hidden = true; $('home').hidden = false; document.querySelector('footer').hidden = false; $('trio').hidden = false;
 document.querySelector('.site-header').inert = false; document.body.classList.remove('practicing');
 current = null; renderHome(); window.scrollTo(0, 0);
}

function go(delta = 1){
 const s = current.session;
 s.index = Math.max(0, Math.min(current.steps.length - 1, s.index + delta));
 save(); renderStep();
}

/* ---------------- DOM helpers ---------------- */

function el(tag, props = {}, ...kids){
 const e = document.createElement(tag);
 for (const [k, v] of Object.entries(props)) {
  if (k === 'class') e.className = v;
  else if (k === 'text') e.textContent = v;
  else if (k.startsWith('on')) e[k] = v;
  else if (v === true) e.setAttribute(k, '');
  else if (v !== false && v != null) e.setAttribute(k, v);
 }
 for (const kid of kids.flat()) if (kid != null) e.append(kid);
 return e;
}
const P = (text, cls) => el('p', {class:cls, text});
function passageBox(paras, {label, dim} = {}){
 const box = el('div', {class:'passage' + (dim ? ' dim' : '')});
 if (label) box.append(el('span', {class:'para-no', text:label}));
 for (const t of paras) box.append(P(t));
 return box;
}
function chips(list, selected, onPick, {right} = {}){
 const wrap = el('div', {class:'chips', role:'group'});
 for (const [id, label] of list) {
  const b = el('button', {type:'button', 'aria-pressed':String(selected === id), text:label});
  if (right && right === id) b.classList.add('right');
  b.onclick = () => onPick(id);
  wrap.append(b);
 }
 return wrap;
}
function actions(label, onNext, {disabled = false, back = true} = {}){
 const row = el('div', {class:'stage-actions'});
 if (back && current.session.index > 0) row.append(el('button', {class:'quiet', type:'button', text:'← Back', onclick:() => go(-1)}));
 const next = el('button', {class:'btn', type:'button', text:label, onclick:onNext});
 next.disabled = disabled;
 row.append(next);
 return row;
}
function header(eyebrow, title, lead){
 return [el('span', {class:'eyebrow', text:eyebrow}), el('h2', {class:'step-title', tabindex:'-1', text:title}), lead ? P(lead, 'step-lead') : null];
}

/* ---------------- rendering ---------------- */

function renderProgress(){
 const bar = $('progress'); bar.replaceChildren();
 current.steps.forEach((_, i) => {
  const s = el('span');
  if (i < current.session.index) s.className = 'complete'; else if (i === current.session.index) s.className = 'current';
  bar.append(s);
 });
 const total = current.steps.length;
 $('stage-count').textContent = `Step ${current.session.index + 1} of ${total}`;
}

function renderStep(){
 const step = current.steps[current.session.index];
 const inner = $('stage-inner'); inner.replaceChildren();
 renderProgress();
 const fn = RENDER[step.k];
 const nodes = fn(step);
 inner.append(...nodes.flat().filter(Boolean));
 $('stage').querySelector('.stage-body').scrollTop = 0;
 inner.querySelector('h2')?.focus({preventScroll:true});
}

const A = () => current.session.a;   // per-session answers

const RENDER = {
 primer(){
  const first = Object.keys(state.done).length < 3;
  return [
   header('BEFORE YOU READ', 'Set up for ten focused minutes', first ? 'Read these once. You will see them in every session until they are how you read.' : 'Your six moves. Skim them, then start.'),
   toolkitList(),
   el('div', {class:'tip'}, el('b', {text:'Setup: '}), 'notifications off, phone face down, and pick a time you feel reasonably alert. If you are exhausted, a shorter session beats a blurry long one.'),
   actions('I’m set →', () => go(1), {back:false})
  ];
 },

 card({i}){
  const w = current.session.warm[i], c = state.deck[w];
  if (!c) return [header('WORD REVIEW', 'Skipped'), actions('Next →', () => go(1))];
  const ans = A()['card' + i];
  const order = shuffled(c.o, hash(w) + (c.seen || 0));
  const list = el('ol', {class:'options'});
  order.forEach((oi, pos) => {
   const b = el('button', {type:'button'}, el('span', {class:'opt-key', text:'ABCD'[pos]}), el('span', {text:c.o[oi]}));
   if (ans != null) { b.disabled = true; if (oi === 0) b.classList.add('correct'); else if (oi === ans) b.classList.add('wrong'); }
   b.onclick = () => { A()['card' + i] = oi; scheduleCard(c, oi === 0); save(); renderStep(); };
   list.append(el('li', {}, b));
  });
  const nodes = [
   header(`WORD REVIEW · ${i + 1} OF ${current.session.warm.length}`, 'What does it mean here?', 'Quick recall before checking. Spaced reviews like this are what move a word into long-term memory.'),
   el('p', {class:'vocab-word', text:c.w}),
   c.s ? el('p', {class:'purpose'}, highlight(c.s, c.w)) : null,
   list
  ];
  if (ans != null) {
   nodes.push(el('div', {class:'reveal ' + (ans === 0 ? 'good' : 'warn')}, el('b', {class:'lbl', text: ans === 0 ? 'Right' : 'Not this time · back to tomorrow'}), c.d));
   if (c.mine) nodes.push(el('p', {class:'meta', text:'Your sentence last time: “' + c.mine + '”'}));
  }
  nodes.push(actions('Next →', () => go(1), {disabled: ans == null}));
  return nodes;
 },

 preview(){
  const p = current.p, a = A();
  const predict = el('textarea', {id:'predict', placeholder:'My guess is…', 'aria-label':'Your prediction'});
  predict.value = a.predict || '';
  predict.oninput = () => { a.predict = predict.value; save(); };
  return [
   header(`${LEVEL_NAMES[level(p.n)].toUpperCase()} · ${p.topic.toUpperCase()}`, p.t, `${p.p.length} short paragraphs. About ${Math.max(2, Math.round(words(p) / 180))} minutes of reading, the rest is thinking.`),
   el('div', {class:'purpose'}, el('b', {text:'READ TO FIND OUT'}), p.q),
   el('label', {class:'label', for:'predict', text:'Predict (optional): what do you expect the answer to be?'}),
   predict,
   P('Predicting gives your attention something to check against, so you notice when the text agrees or surprises you.', 'frame-hint'),
   actions('Start the first paragraph →', () => go(1))
  ];
 },

 paste(){
  const a = A();
  const area = el('textarea', {id:'article', placeholder:'Paste the article or section you need to read…', style:'min-height:14rem', 'aria-label':'Your article'});
  area.value = a.raw || '';
  area.oninput = () => { a.raw = area.value; save(); };
  const q = el('input', {class:'field', id:'own-q', placeholder:'e.g. Why does the author think this company has an advantage?', 'aria-label':'Your question'});
  q.value = a.q || '';
  q.oninput = () => { a.q = q.value; save(); };
  return [
   header('YOUR OWN ARTICLE', 'Practise on what you actually need to read', 'Paste up to about 1,500 words. It is split into paragraphs and you work through it with the same moves. Nothing is sent anywhere.'),
   el('label', {class:'label', for:'own-q', text:'What are you reading to find out?'}), q,
   el('label', {class:'label', for:'article', text:'The text'}), area,
   actions('Split into paragraphs →', () => {
    const paras = splitParas(area.value);
    if (!paras.length) { area.focus(); return; }
    current.session.paras = paras;
    current.p = {t:'Your article', p:paras, q:a.q};
    current.steps = buildSteps(current.session, current.p);
    go(1);
   })
  ];
 },

 read({i}){
  const p = current.p, total = p.p.length;
  const prev = i > 0 && A()['gist' + (i - 1)];
  return [
   header(`PARAGRAPH ${i + 1} OF ${total}`, i === 0 ? 'Read the first paragraph' : 'Read the next paragraph', 'Once, at a comfortable pace. When you finish, the text will hide.'),
   (current.session.type === 'own' ? current.p.q : p.q) ? el('div', {class:'purpose'}, el('b', {text:'YOUR QUESTION'}), current.session.type === 'own' ? current.p.q : p.q) : null,
   prev ? P('Last paragraph, in your words: “' + prev + '”', 'meta') : null,
   passageBox([p.p[i]], {label:`PARAGRAPH ${i + 1}`}),
   actions('I’ve read it — hide the text →', () => go(1))
  ];
 },

 explain({i}){
  const p = current.p, a = A();
  const drift = a['drift' + i];
  const nodes = [header('LOOK AWAY AND SAY IT', 'What is this paragraph saying?', 'The text is hidden on purpose. Explaining from memory is the exercise.')];
  nodes.push(el('span', {class:'label', text:'First: was your mind with the text?'}));
  nodes.push(chips([['with','With it all the way'],['drifted','Drifted at some point'],['unsure','Not sure']], drift, id => { a['drift' + i] = id; save(); renderStep(); }));
  if (drift === 'drifted' || drift === 'unsure') {
   nodes.push(el('div', {class:'tip'}, el('b', {text:'Good catch. '}), 'Noticing the drift is the skill. Find the last sentence you remember and pick up from there, not from the top.'));
   if (a['peek' + i]) nodes.push(passageBox([p.p[i]], {label:'LOOK AGAIN, THEN HIDE IT IN YOUR HEAD'}));
   else nodes.push(el('button', {class:'btn-ghost', type:'button', text:'Show the paragraph once more', onclick:() => { a['peek' + i] = true; save(); renderStep(); }}));
  }
  const area = el('textarea', {id:'gist', placeholder:'The author is saying… because…', 'aria-label':'Your explanation'});
  area.value = a['gist' + i] || '';
  area.oninput = () => { a['gist' + i] = area.value; save(); next.disabled = !ready(); };
  const box = el('input', {type:'checkbox', id:'aloud'}); box.checked = !!a['aloud' + i];
  box.onchange = () => { a['aloud' + i] = box.checked; save(); next.disabled = !ready(); };
  nodes.push(el('label', {class:'label', for:'gist', text:'In your own words'}), area,
   P('Frame: “The author is saying ___ because ___.” One sentence is enough.', 'frame-hint'),
   el('div', {class:'checks'}, el('label', {for:'aloud'}, box, el('span', {text:'I said it out loud instead of writing (good speech practice too)'}))));
  if (i > 0) {
   nodes.push(el('span', {class:'label', text:'Connect: this paragraph…'}));
   nodes.push(chips(LINKS.map(([id, t]) => [id, t]), a['link' + i], id => { a['link' + i] = id; save(); renderStep(); }));
   nodes.push(P('…the previous one.', 'frame-hint'));
  }
  const ready = () => !!drift && ((a['gist' + i] || '').trim().length > 3 || a['aloud' + i]) && (i === 0 || !!a['link' + i]);
  const row = actions('Compare →', () => go(1), {disabled: !ready()});
  const next = row.querySelector('.btn');
  nodes.push(row);
  return nodes;
 },

 compare({i}){
  const p = current.p, a = A(), own = current.session.type === 'own';
  const nodes = [header('CHECK', 'How close were you?', own ? 'Reread the paragraph and judge your version honestly. Close enough counts.' : 'Compare the idea, not the wording. Close enough counts.')];
  if ((a['gist' + i] || '').trim()) nodes.push(el('div', {class:'reveal'}, el('b', {class:'lbl', text:'Your version'}), a['gist' + i]));
  else if (a['aloud' + i]) nodes.push(P('You said yours out loud.', 'meta'));
  if (!own && p.g?.[i]) nodes.push(el('div', {class:'reveal good'}, el('b', {class:'lbl', text:'One good version'}), p.g[i]));
  if (own) nodes.push(passageBox([p.p[i]], {label:`PARAGRAPH ${i + 1}`}));
  if (i > 0 && !own && p.r?.[i - 1]) {
   const ok = a['link' + i] === p.r[i - 1];
   nodes.push(el('div', {class:'reveal ' + (ok ? 'good' : 'warn')}, el('b', {class:'lbl', text: ok ? 'Connection: same as ours' : 'Connection: we read it differently'}),
    `This paragraph ${linkText(p.r[i - 1])} the previous one.` + (ok ? '' : ` You chose “${linkText(a['link' + i])}”. Worth a second look, though some paragraphs do more than one job.`)));
  }
  const self = a['self' + i];
  nodes.push(el('span', {class:'label', text:'Your call'}));
  nodes.push(chips([['got','Got the main idea'],['partly','Partly'],['missed','Missed it']], self, id => { a['self' + i] = id; if (id === 'got') delete a['obs' + i]; save(); renderStep(); }));
  if (self === 'partly' || self === 'missed') {
   nodes.push(el('span', {class:'label', text:'What got in the way?'}));
   nodes.push(chips(OBSTACLES.map(o => [o[0], o[1]]), a['obs' + i], id => { a['obs' + i] = id; save(); renderStep(); }));
   const ob = OBSTACLES.find(o => o[0] === a['obs' + i]);
   if (ob) nodes.push(el('div', {class:'tip'}, el('b', {text:'Fix: '}), ob[2]));
  }
  const isLast = i === p.p.length - 1;
  nodes.push(actions(isLast ? 'Recall the whole thing →' : 'Next paragraph →', () => go(1), {disabled: !self || ((self !== 'got') && !a['obs' + i])}));
  return nodes;
 },

 recall(){
  const p = current.p, a = A(), own = current.session.type === 'own';
  const area = el('textarea', {id:'recall', placeholder:'1.\n2.\n3.', style:'min-height:8rem', 'aria-label':'Three points from memory'});
  area.value = a.recall || '';
  area.oninput = () => { a.recall = area.value; save(); };
  const nodes = [header('FROM MEMORY', 'Three points, without looking', 'Recall first, check second. The effort of pulling it back is what makes it stay.'), area];
  if (a.recallShown) {
   if (!own) nodes.push(el('div', {class:'reveal good'}, el('b', {class:'lbl', text:'The three points we would pick'}), el('ul', {}, p.k.map(k => el('li', {text:k})))));
   nodes.push(passageBox(p.p, {label:'THE WHOLE TEXT', dim:false}));
   nodes.push(el('span', {class:'label', text:'How many did you have?'}));
   nodes.push(chips([['0','0'],['1','1'],['2','2'],['3','All 3']], a.recallScore, id => { a.recallScore = id; save(); renderStep(); }));
   const label = own ? 'Finish →' : 'On to the questions →';
   nodes.push(actions(label, () => go(1), {disabled: a.recallScore == null}));
  } else {
   nodes.push(actions('Check against the text →', () => { a.recallShown = true; save(); renderStep(); }));
  }
  return nodes;
 },

 mc({i}){
  const p = current.p, q = p.mc[i], a = A();
  const ans = a['mc' + i];
  const order = shuffled(q.o, p.n * 31 + i);
  const list = el('ol', {class:'options'});
  order.forEach((oi, pos) => {
   const b = el('button', {type:'button'}, el('span', {class:'opt-key', text:'ABCD'[pos]}), el('span', {text:q.o[oi]}));
   if (ans != null) { b.disabled = true; if (oi === 0) b.classList.add('correct'); else if (oi === ans) b.classList.add('wrong'); }
   b.onclick = () => { a['mc' + i] = oi; save(); renderStep(); };
   list.append(el('li', {}, b));
  });
  const nodes = [header(`QUESTION ${i + 1} OF ${p.mc.length} · ${(MC_KIND[q.k] || 'Question').toUpperCase()}`, q.s, 'Answer from memory first. Looking back is allowed, it just gets noted.')];
  if (a['look' + i]) nodes.push(passageBox(p.p, {dim:true}));
  else if (ans == null) nodes.push(el('button', {class:'quiet', type:'button', text:'Look back at the text', onclick:() => { a['look' + i] = true; save(); renderStep(); }}));
  nodes.push(list);
  if (ans != null) nodes.push(el('div', {class:'reveal ' + (ans === 0 ? 'good' : 'warn')}, el('b', {class:'lbl', text: ans === 0 ? 'Right' : 'Not quite'}), q.e));
  nodes.push(actions('Next →', () => go(1), {disabled: ans == null}));
  return nodes;
 },

 vocab({i}){
  const p = current.p, v = p.v[i], a = A();
  const ans = a['v' + i];
  const sentence = sentenceWith(p, v.w);
  const order = shuffled(v.o, p.n * 17 + i);
  const list = el('ol', {class:'options'});
  order.forEach((oi, pos) => {
   const b = el('button', {type:'button'}, el('span', {class:'opt-key', text:'ABCD'[pos]}), el('span', {text:v.o[oi]}));
   if (ans != null) { b.disabled = true; if (oi === 0) b.classList.add('correct'); else if (oi === ans) b.classList.add('wrong'); }
   b.onclick = () => { a['v' + i] = oi; save(); renderStep(); };
   list.append(el('li', {}, b));
  });
  const nodes = [
   header(`WORD ${i + 1} OF ${p.v.length}`, 'What does it mean in this passage?', 'Work it out from the sentence before choosing.'),
   el('p', {class:'vocab-word', text:v.w}),
   sentence ? el('p', {class:'purpose'}, highlight(sentence, v.w)) : null,
   list
  ];
  if (ans != null) {
   nodes.push(el('div', {class:'reveal ' + (ans === 0 ? 'good' : 'warn')}, el('b', {class:'lbl', text: ans === 0 ? 'Right' : 'Not quite'}), v.d));
   const mine = el('textarea', {id:'mine', placeholder:`Use “${v.w}” in a sentence about your own work or life…`, style:'min-height:4.5rem', 'aria-label':'Your sentence'});
   mine.value = a['mine' + i] || '';
   mine.oninput = () => { a['mine' + i] = mine.value; save(); };
   nodes.push(el('label', {class:'label', for:'mine', text:'Make it yours (optional, but this is what makes it stick)'}), mine);
  }
  nodes.push(actions('Next →', () => go(1), {disabled: ans == null}));
  return nodes;
 },

 done(){
  if (!current.session.finished) finishSession();
  const r = current.session.result;
  const nodes = [el('div', {class:'completion-mark', 'aria-hidden':'true', text:'✓'})];
  if (current.session.type === 'review') {
   nodes.push(...header('WORD REVIEW', 'Review done.'),
    el('div', {class:'kpis'}, kpi(`${r.cardsRight}/${r.cards}`, 'words recalled')),
    P('Words you missed come back tomorrow. Words you knew come back later each time.', 'meta'));
  } else {
   nodes.push(...header('READING FOCUS', current.session.type === 'own' ? 'Article read, properly.' : 'Passage done.'),
    el('div', {class:'kpis'},
     kpi(`${r.got}/${r.paras}`, 'paragraphs you got'),
     current.session.type === 'passage' ? kpi(`${r.mcRight}/${r.mc}`, 'questions right') : null,
     current.session.type === 'passage' ? kpi(`${r.vRight}/${r.v}`, 'words right') : null,
     kpi(String(r.drifted), r.drifted === 1 ? 'drift you caught' : 'drifts you caught')),
    P(r.drifted ? 'Catching a drift and going back is exactly the habit. Over time you will catch it sooner.' : 'No drift reported. If it was hard to tell, that is normal too.', 'meta'));
   if (r.topObstacle) nodes.push(el('div', {class:'tip'}, el('b', {text:'For next time: '}), OBSTACLES.find(o => o[0] === r.topObstacle)[2]));
  }
  const nxt = T.next('read');
  if (nxt) nodes.push(el('a', {class:'handoff', href:nxt.href}, el('b', {text:`Next: ${nxt.name} →`}), el('span', {text: nxt.id === 'think' ? 'Ten minutes of quick thinking' : 'Your speech warm-up'})));
  else nodes.push(P('All three done today. That is the whole job.', 'meta'));
  nodes.push(el('button', {class:'btn', type:'button', text:'Done →', onclick:() => { state.session = null; save(); closeStage(); }}));
  return nodes;
 }
};

function kpi(big, small){ return el('div', {class:'kpi'}, el('b', {text:big}), el('span', {text:small})); }
function highlight(sentence, word){
 const frag = document.createDocumentFragment();
 const re = new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\w*)`, 'i');
 const parts = sentence.split(re);
 parts.forEach((part, idx) => frag.append(idx % 2 ? el('mark', {text:part}) : document.createTextNode(part)));
 return frag;
}
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const words = p => p.p.join(' ').split(/\s+/).length;

function splitParas(text){
 let blocks = String(text).replace(/\r/g, '').split(/\n\s*\n+/).map(b => b.replace(/\s+/g, ' ').trim()).filter(b => b.split(' ').length >= 8);
 if (blocks.length === 1 && blocks[0].split(' ').length > 160) {
  const ss = sentences(blocks[0]); blocks = [];
  for (let i = 0; i < ss.length; i += 4) blocks.push(ss.slice(i, i + 4).join(' '));
 }
 return blocks.slice(0, 10);
}

/* ---------------- finishing ---------------- */

function finishSession(){
 const s = current.session, a = s.a, p = current.p;
 const r = {paras:0, got:0, drifted:0, mc:0, mcRight:0, v:0, vRight:0, cards:0, cardsRight:0, topObstacle:null};
 (s.warm || []).forEach((w, i) => { if (a['card' + i] != null) { r.cards++; if (a['card' + i] === 0) r.cardsRight++; } });
 if (s.type !== 'review' && p) {
  const counts = {};
  p.p.forEach((_, i) => {
   r.paras++;
   const self = a['self' + i]; if (self) state.totals[self]++;
   if (self === 'got') r.got++;
   const d = a['drift' + i]; if (d) state.drift[d]++;
   if (d === 'drifted') r.drifted++;
   const ob = a['obs' + i]; if (ob) { state.obstacles[ob]++; counts[ob] = (counts[ob] || 0) + 1; }
  });
  state.totals.paras += r.paras;
  r.topObstacle = Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
  if (s.type === 'passage') {
   p.mc.forEach((_, i) => { if (a['mc' + i] != null) { r.mc++; if (a['mc' + i] === 0) r.mcRight++; } });
   p.v.forEach((v, i) => {
    if (a['v' + i] == null) return;
    r.v++; const right = a['v' + i] === 0; if (right) r.vRight++;
    const card = state.deck[v.w] || {w:v.w, n:p.n, s:sentenceWith(p, v.w), o:v.o, d:v.d, box:0};
    if (a['mine' + i]) card.mine = a['mine' + i].slice(0, 280);
    card.box = 0; card.due = addDays(INTERVALS[0]);
    state.deck[v.w] = card;
   });
   state.totals.mc += r.mc; state.totals.mcRight += r.mcRight; state.totals.v += r.v; state.totals.vRight += r.vRight;
   state.done[p.n] = {date:dateKey(), mc:r.mcRight, v:r.vRight, got:r.got, recall:Number(a.recallScore || 0)};
  }
  const key = dateKey(), prev = state.days[key] || {};
  state.days[key] = {...prev, complete:true, count:(prev.count || 0) + 1};
  track('session_complete', {minutes:10});
 }
 s.finished = true; s.result = r;
 save();
}

/* ---------------- home ---------------- */

async function renderHome(){
 T.renderStrip($('trio'), 'read');
 $('toolkit-home').replaceWith(Object.assign(toolkitList(), {id:'toolkit-home'}));
 try { await loadIndex(); } catch {
  $('today-title').textContent = 'Passages could not load';
  $('today-meta').textContent = 'Check your connection and reload. Once loaded, reading works offline.';
  return;
 }
 const s = state.session;
 const due = dueCards().length;
 $('review').textContent = due ? `Vocabulary review (${due} due)` : 'Vocabulary review (none due)';
 $('review').disabled = !due;
 if (s) {
  $('today-label').textContent = 'In progress';
  if (s.type === 'passage') { const [t, topic] = INDEX.titles[s.n - 1] || ['Passage', '']; $('today-title').textContent = t; $('today-meta').textContent = `${topic} · ${LEVEL_NAMES[level(s.n)]}`; }
  else { $('today-title').textContent = s.type === 'own' ? 'Your own article' : 'Vocabulary review'; $('today-meta').textContent = ''; }
  $('start').querySelector('strong').textContent = 'RESUME';
  $('start-sub').textContent = 'Carry on where you stopped →';
  $('resume-note').hidden = false; $('resume-note').replaceChildren(el('button', {class:'quiet', type:'button', text:'Discard and start fresh', onclick:() => { state.session = null; save(); renderHome(); }}));
  $('start').disabled = false;
 } else {
  $('resume-note').hidden = true;
  const n = nextUndone();
  $('start').querySelector('strong').textContent = 'GO';
  if (!n) { $('today-label').textContent = 'A full year, done'; $('today-title').textContent = 'Every passage finished'; $('today-meta').textContent = 'Use it on your own articles now, or revisit any passage.'; $('start').disabled = true; }
  else {
   const [t, topic] = INDEX.titles[n - 1];
   const doneToday = T.doneOn('read');
   $('today-label').textContent = doneToday ? 'Done today · one more if you like' : 'Today’s passage';
   $('today-title').textContent = t;
   $('today-meta').textContent = `Day ${dayOf(n)} of ${sequence().length} · ${topic} · ${LEVEL_NAMES[level(n)]}`;
   $('start-sub').textContent = 'Start reading →';
   $('start').disabled = false;
   $('start').dataset.n = n;
  }
 }
 renderStats();
}

function renderStats(){
 const doneCount = Object.keys(state.done).length;
 const tot = state.totals, deck = Object.values(state.deck);
 const mastered = deck.filter(c => c.box >= 3).length;
 const k = $('kpis'); k.replaceChildren(
  kpi(`${doneCount}`, `of ${INDEX?.total || 312} passages`),
  kpi(String(streak()), 'day reading streak'),
  kpi(tot.paras ? Math.round(100 * tot.got / tot.paras) + '%' : '–', 'paragraphs you got'),
  kpi(tot.mc ? Math.round(100 * tot.mcRight / tot.mc) + '%' : '–', 'questions right'),
  kpi(`${deck.length}`, `words learning · ${mastered} solid`)
 );
 const obs = Object.entries(state.obstacles).sort((x, y) => y[1] - x[1]);
 const d = state.drift, dTotal = d.with + d.drifted + d.unsure;
 const bits = [];
 if (obs[0]?.[1] >= 2) bits.push(`What gets in the way most: ${OBSTACLES.find(o => o[0] === obs[0][0])[1].toLowerCase()} (${obs[0][1]} times).`);
 if (dTotal >= 6) bits.push(`You report being with the text the whole way in ${Math.round(100 * d.with / dTotal)}% of paragraphs.`);
 $('insight').textContent = bits.join(' ') || 'Patterns appear here after a few sessions: what gets in the way most, and how often your mind drifts.';
}
function streak(){
 let n = 0; const d = new Date();
 if (!state.days[dateKey(d)]?.complete) d.setDate(d.getDate() - 1);
 while (state.days[dateKey(d)]?.complete) { n++; d.setDate(d.getDate() - 1); }
 return n;
}

/* ---------------- library ---------------- */

function openLibrary(){
 if (!INDEX) return;
 let tab = 'order';
 const body = el('div');
 const draw = () => {
  body.replaceChildren();
  const mix = el('div', {class:'setting-row'}, el('span', {class:'label', text:'Challenge'}),
   chipsPlain([['mixed','Mixed levels'],['hard','Hardest only']], state.mix, id => { state.mix = id; save(); renderHome(); draw(); }),
   P(state.mix === 'hard' ? 'Dense and argument passages only. The clearer ones are skipped.' : 'Two dense passages for every argument passage and every clearer one, from day one.', 'gentle-note'));
  const tabs = el('div', {class:'lib-tabs', role:'group', 'aria-label':'Show'});
  for (const [id, label] of [['order','In order'],['3','Dense'],['2','Argument'],['1','Clear']])
   tabs.append(el('button', {type:'button', 'aria-pressed':String(tab === id), text:label, onclick:() => { tab = id; draw(); }}));
  const list = el('ul', {class:'lib'});
  const ns = tab === 'order' ? sequence() : [...Array(INDEX.total)].map((_, i) => i + 1).filter(n => String(level(n)) === tab);
  ns.forEach((n, i) => {
   const [t, topic] = INDEX.titles[n - 1] || [];
   if (!t) return;
   list.append(el('li', {}, el('button', {type:'button', onclick:() => { $('info').close(); if (state.session && !confirm('Leave the session in progress and start this passage?')) return; begin('passage', n); }},
    el('span', {class:'n', text: tab === 'order' ? String(i + 1) : LEVEL_NAMES[level(n)][0]}), el('span', {text:`${t} · ${topic}`}), state.done[n] ? el('span', {class:'done-mark', text:'✓'}) : null)));
  });
  body.append(mix, tabs, list);
 };
 draw();
 info('Choose a passage', [body]);
}
function chipsPlain(list, sel, onPick){
 const w = el('div', {class:'chips', role:'group'});
 for (const [id, label] of list) { const b = el('button', {type:'button', 'aria-pressed':String(sel === id), text:label}); b.onclick = () => onPick(id); w.append(b); }
 return w;
}

/* ---------------- about ---------------- */

function info(title, nodes){ $('info-title').textContent = title; $('info-body').replaceChildren(...nodes); $('info').showModal(); }
const link = (href, text) => el('a', {href, rel:'noopener', text});
function openAbout(){
 const h = t => el('h3', {text:t});
 const src = (...pairs) => { const p = el('p', {class:'gentle-note'}); pairs.forEach(([href, t], i) => { if (i) p.append(' · '); p.append(link(href, t)); }); return p; };
 info('How this was built', [
  P('Each session takes one short passage and works through it one paragraph at a time. You read, the text hides, you explain it in your own words, you check, and you note what got in the way. Then you recall the whole thing from memory, answer three questions and learn two words.'),
  h('Why these steps'),
  P('Explaining a text to yourself while reading (self-explanation) is one of the better-supported ways to improve understanding. Pulling information back from memory, rather than rereading, improves how much you keep (retrieval practice). Predicting, questioning, clarifying and summarising are the four moves of reciprocal teaching, and the toolkit is built from them.'),
  P('Minds wander during reading far more than people notice, and comprehension drops when they do. The “was your mind with the text?” check trains you to notice sooner. Vocabulary words return on a spacing schedule (1, 3, 7, 16, 35 and 90 days) because spaced reviews beat cramming for long-term memory, and writing your own sentence with a word helps more than reading a definition.'),
  h('What this is not'),
  P('Much of the comprehension evidence comes from schools, and none of it validates this app. It is reading practice, not an assessment, diagnosis or treatment for ADHD, dyslexia or anything else. If you think you may have ADHD, an assessment through your GP is the way to find out. If reading has suddenly become much harder, see a GP promptly.'),
  h('The passages'),
  P('312 original passages, six a week for a year, written for this app across strategy, economics, technology, science, history and psychology. Levels are mixed from day one: dense passages with long, layered sentences come up twice as often as argument or clearer ones, and “Hardest only” in Choose a passage skips the clearer ones. The “Use it on your own article” option takes the same moves to the things you actually need to read.'),
  src(['https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/reading-comprehension-strategies','EEF: reading comprehension strategies'],
   ['https://doi.org/10.1177/1529100612453266','Dunlosky et al. 2013, learning techniques'],
   ['https://doi.org/10.1007/s10648-018-9434-x','Bisra et al. 2018, self-explanation'],
   ['https://doi.org/10.1207/s1532690xci0102_1','Palincsar & Brown 1984, reciprocal teaching'],
   ['https://doi.org/10.1111/j.1467-9280.2006.01693.x','Roediger & Karpicke 2006, retrieval practice'],
   ['https://doi.org/10.3758/MC.36.6.1144','Smallwood et al. 2008, mind-wandering while reading'],
   ['https://doi.org/10.1037/0033-2909.132.3.354','Cepeda et al. 2006, spacing'],
   ['https://www.nhs.uk/conditions/adhd-adults/','NHS: ADHD in adults'])
 ]);
}

/* ---------------- data ---------------- */

function exportData(){
 const blob = new Blob([JSON.stringify({app:'speech-on-read', version:1, exported:new Date().toISOString(), ...state, session:null}, null, 1)], {type:'application/json'});
 const url = URL.createObjectURL(blob), a = el('a', {href:url, download:'speech-on-reading.json'});
 document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
 $('data-status').textContent = 'Saved to a file.';
}
function importData(file){
 const reader = new FileReader();
 reader.onload = () => {
  try {
   const d = JSON.parse(String(reader.result));
   if (d.app !== 'speech-on-read') throw new Error('bad');
   for (const k of ['done','days','deck']) if (d[k] && typeof d[k] === 'object') Object.assign(state[k], d[k]);
   for (const k of ['obstacles','drift','totals']) if (d[k] && typeof d[k] === 'object')
    for (const [kk, v] of Object.entries(d[k])) if (typeof v === 'number') state[k][kk] = Math.max(state[k][kk] || 0, v);
   save(); renderHome(); $('data-status').textContent = 'Progress loaded.';
  } catch { $('data-status').textContent = 'That file could not be read.'; }
 };
 reader.readAsText(file);
}
function eraseData(){
 if (!confirm('Erase all reading progress and words on this device? This cannot be undone.')) return;
 localStorage.removeItem(KEY); location.reload();
}

/* ---------------- wiring ---------------- */

$('start').onclick = () => state.session ? open() : begin('passage', Number($('start').dataset.n) || 1);
$('review').onclick = () => begin('review');
$('own').onclick = () => { if (state.session && !confirm('Leave the session in progress?')) return; begin('own'); };
$('library-open').onclick = openLibrary;
$('evidence').onclick = openAbout;
$('close-info').onclick = () => $('info').close();
$('exit').onclick = () => { save(); track('session_exit'); closeStage(); };
$('toolkit-btn').onclick = () => info('Your reading toolkit', [toolkitList(), P('Stuck? Name the obstacle: a word, a long sentence, a wandering mind, or the logic. Each has its own fix.', 'meta')]);
$('export').onclick = exportData;
$('import').onclick = () => $('import-file').click();
$('import-file').onchange = e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ''; };
$('erase').onclick = eraseData;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('stage').hidden && !document.querySelector('dialog[open]')) { e.preventDefault(); $('exit').click(); } });
window.addEventListener('pagehide', save);

if (new URLSearchParams(location.search).has('own')) setTimeout(() => $('own').click(), 0);
renderHome();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();

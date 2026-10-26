'use strict';
/* Speech On — Think. Business maths at speed, one estimate, one structured spoken answer.
   No account, no backend, no microphone. Everything stays in this browser. */
(() => {
const $ = id => document.getElementById(id);
const T = window.Trio;
const track = (name, props) => window.voiceTrack?.(name, props);
const KEY = T.KEYS.think;
const dateKey = T.dateKey;

const stored = T.readStore(KEY);
const state = {
 level: Number.isInteger(stored.level) && stored.level >= 1 && stored.level <= 8 ? stored.level : 1,
 best:  Number.isInteger(stored.best) ? stored.best : 1,
 days:  stored.days && typeof stored.days === 'object' ? stored.days : {},
 log:   Array.isArray(stored.log) ? stored.log.slice(-400) : [],
 est:   Number.isInteger(stored.est) ? stored.est : 0,
 say:   Number.isInteger(stored.say) ? stored.say : 0,
 session: stored.session || null
};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

let BANK = null;
async function loadBank(){
 if (BANK) return BANK;
 const [e, s] = await Promise.all([fetch('think/estimates.json'), fetch('think/prompts.json')]);
 if (!e.ok || !s.ok) throw new Error('bank');
 BANK = {est:(await e.json()).items, say:(await s.json()).items};
 return BANK;
}

/* ---------------- maths generator ---------------- */

const LEVELS = [null,
 {name:'Warm numbers', target:6},
 {name:'Quick percentages', target:8},
 {name:'Bigger multiplication', target:12},
 {name:'Change and margin', target:15},
 {name:'Compounding', target:18},
 {name:'Unit economics', target:22},
 {name:'Growth and sizing', target:26},
 {name:'Deal maths', target:30}
];
const R = (lo, hi, step = 1) => lo + step * Math.floor(Math.random() * (Math.floor((hi - lo) / step) + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Number(n).toLocaleString('en-GB', {maximumFractionDigits: 2});
const notRound = (lo, hi) => { let n; do n = R(lo, hi); while (n % 10 === 0); return n; };

const GEN = {
 1: [
  () => { const a = notRound(23, 99), b = notRound(23, 99); return {q:`${a} + ${b}`, a:a + b, tol:{abs:0}, trick:`Tens first, then units: ${a - a % 10} + ${b - b % 10} = ${a - a % 10 + b - b % 10}, plus ${a % 10 + b % 10}.`}; },
  () => { const a = R(150, 499), b = notRound(41, a - 30); return {q:`${a} − ${b}`, a:a - b, tol:{abs:0}, trick:`Round and adjust: ${a} − ${Math.ceil(b / 10) * 10} = ${a - Math.ceil(b / 10) * 10}, then add back ${Math.ceil(b / 10) * 10 - b}.`}; },
  () => { const a = notRound(13, 89), b = R(3, 9); return {q:`${a} × ${b}`, a:a * b, tol:{abs:0}, trick:`Split it: ${a - a % 10} × ${b} = ${(a - a % 10) * b}, plus ${a % 10} × ${b} = ${(a % 10) * b}.`}; }
 ],
 2: [
  () => { const p = pick([5,10,15,20,25,30,40,75]), b = R(40, 880, 20); return {q:`${p}% of ${b}`, a:p * b / 100, tol:{abs:0.01}, trick:'10% moves the decimal one place. 5% is half of that, 15% is both together, 25% is a quarter.'}; },
  () => { const n = R(12, 96, 2); return {q:`${n} × 25`, a:n * 25, tol:{abs:0}, trick:`× 25 is ÷ 4 then × 100: ${n} ÷ 4 = ${n / 4}, so ${n * 25}.`}; },
  () => { const b = R(3, 9), q = R(14, 99); return {q:`${b * q} ÷ ${b}`, a:q, tol:{abs:0}, trick:'Split the big number into chunks you can divide: hundreds first, then the rest.'}; }
 ],
 3: [
  () => { const a = notRound(12, 49), b = notRound(12, 49); return {q:`${a} × ${b}`, a:a * b, tol:{abs:0}, trick:`Split one number: ${a} × ${b - b % 10} = ${a * (b - b % 10)}, plus ${a} × ${b % 10} = ${a * (b % 10)}.`}; },
  () => { const p = pick([3,4,6,7,8,12,14,16,18,35,45]), b = R(100, 900, 50); return {q:`${p}% of ${b}`, a:p * b / 100, tol:{abs:0.05}, trick:`Swap them if it is easier: ${p}% of ${b} is ${b}% of ${p}. Or build it from 10% and 1%.`}; },
  () => { const d = pick([20,25,40,50,80]), n = R(1, d - 1); return {q:`${n} out of ${d}`, sub:'as a percentage', a:n / d * 100, tol:{abs:0.1}, unit:'%', trick:`Scale the bottom to 100: × ${100 / d}.`}; }
 ],
 4: [
  () => { const o = R(40, 400, 20), p = pick([-40,-30,-25,-20,-15,-10,-5,5,10,15,20,25,30,40,50,60]), nw = o * (1 + p / 100); return {q:`From £${o}m to £${fmt(nw)}m`, sub:'percentage change', a:p, tol:{abs:0.5}, unit:'%', trick:'Change ÷ where you started. Always divide by the starting value, not the new one.'}; },
  () => { const r = R(100, 900, 100), m = pick([8,12,15,18,20,22,25,30,35,40,45]), c = r * (1 - m / 100); return {q:`Revenue £${r}k, costs £${fmt(c)}k`, sub:'margin (%)', a:m, tol:{abs:0.5}, unit:'%', trick:'Margin = profit ÷ revenue. Profit first, then divide by revenue.'}; },
  () => { const o = R(40, 400, 20), d = pick([10,20,25,40,50]), s = o * (1 - d / 100); return {q:`After a ${d}% discount it costs £${fmt(s)}`, sub:'original price (£)', a:o, tol:{rel:0.01}, trick:`The sale price is ${100 - d}% of the original, so divide by ${(100 - d) / 100}.`}; }
 ],
 5: [
  () => { const P = pick([100, 1000]), r = pick([5,8,10,12,15,20]), n = pick([2, 3]); return {q:`£${fmt(P)} growing ${r}% a year for ${n} years`, sub:'value at the end (£)', a:P * Math.pow(1 + r / 100, n), tol:{rel:0.015}, trick:`Compounding beats adding: ${r}% for ${n} years is a bit more than ${r * n}%.`}; },
  () => { const r = pick([3,4,6,8,9,12,18,24]); return {q:`Growing ${r}% a year`, sub:'years to double (roughly)', a:72 / r, tol:{abs:0.6}, unit:'years', trick:'Rule of 72: 72 ÷ the growth rate.'}; },
  () => { const n = pick([3,4,6,8,9,12]); return {q:`To double in ${n} years`, sub:'annual growth needed (%)', a:72 / n, tol:{abs:1}, unit:'%', trick:'Rule of 72 works both ways: 72 ÷ years gives the rate.'}; }
 ],
 6: [
  () => { const c = pick([5,8,10,12,15,20,25,40]), u = pick([500,800,1000,1200,1500,2000,2500,4000]), v = R(5, 60, 5); return {q:`Fixed costs £${fmt(c * u)}. Price £${v + c}, variable cost £${v} a unit`, sub:'units to break even', a:u, tol:{rel:0.01}, trick:'Break-even = fixed costs ÷ (price − variable cost). The bracket is what each unit contributes.'}; },
  () => { const m = pick([3,4,5,6,8,9,10,12,15,18,24]), g = pick([10,15,20,25,30,40,50]); return {q:`Customer acquisition cost £${m * g}, gross profit £${g} a month per customer`, sub:'payback (months)', a:m, tol:{abs:0}, unit:'months', trick:'Payback = acquisition cost ÷ monthly gross profit.'}; },
  () => { const g = pick([10,20,25,30,40,50]), c = pick([2,2.5,4,5,8,10]); return {q:`£${g} gross profit a month, ${c}% of customers leave each month`, sub:'lifetime value (£)', a:g / (c / 100), tol:{rel:0.01}, trick:`Average lifetime is 1 ÷ churn: ${c}% churn means about ${fmt(100 / c)} months.`}; }
 ],
 7: [
  () => { const S = R(20, 200, 10), n = pick([2,3,4,5]), r = R(5, 30), E = Math.round(S * Math.pow(1 + r / 100, n)); return {q:`From ${S} to ${E} in ${n} years`, sub:'annual growth rate, CAGR (%)', a:Math.round((Math.pow(E / S, 1 / n) - 1) * 1000) / 10, tol:{abs:1.5}, unit:'%', trick:'Total growth ÷ years overstates CAGR. Sense-check with the rule of 72: doubling in 5 years is about 15%.'}; },
  () => { const pop = pick([1.5,2.4,8.9,12,36,67,140,330]), sh = pick([2,4,5,8,12,15,25,30]), sp = pick([10,20,25,40,60,80,120,150]); return {q:`${pop}m people, ${sh}% buy, £${sp} a year each`, sub:'market size (£m)', a:pop * sh / 100 * sp, tol:{rel:0.05}, trick:'Multiply the easy pairs first, keep track of the millions separately.'}; },
  () => { const w = R(20, 80, 10), m1 = R(5, 40, 5), m2 = R(5, 40, 5); return {q:`A is ${w}% of revenue at ${m1}% margin, B is the rest at ${m2}%`, sub:'blended margin (%)', a:(w * m1 + (100 - w) * m2) / 100, tol:{abs:0.5}, unit:'%', trick:'Start from one margin and move towards the other in proportion to the weight.'}; }
 ],
 8: [
  () => { const e = pick([10,15,20,25,30,40,45,60]), x = pick([6,8,10,12,14,15]), d = R(0, Math.floor(e * x / 2), 10); return {q:`EBITDA £${e}m at ${x}× EV/EBITDA, net debt £${d}m`, sub:'equity value (£m)', a:e * x - d, tol:{rel:0.01}, trick:'Enterprise value = EBITDA × multiple. Equity value = enterprise value − net debt.'}; },
  () => { const P = pick([20,40,60,80,100,150]), Rz = pick([5,10,15,20,25,40]); return {q:`Raise £${Rz}m at a £${P}m pre-money valuation`, sub:'dilution (%)', a:Rz / (P + Rz) * 100, tol:{abs:0.5}, unit:'%', trick:'New investors own the raise ÷ post-money (pre-money + raise).'}; },
  () => { const p = pick([3,5,8,10,12,15]), v = pick([-12,-10,-8,-5,-3,4,6,10]); return {q:`Price ${p > 0 ? '+' : ''}${p}%, volume ${v > 0 ? '+' : ''}${v}%`, sub:'revenue change (%)', a:((1 + p / 100) * (1 + v / 100) - 1) * 100, tol:{abs:0.6}, unit:'%', trick:'Add the two changes, then add their product: +10% and −5% is 5% − 0.5% = 4.5%.'}; }
 ]
};
function problem(level){ const g = pick(GEN[level]); return {...g(), level}; }
function sprintSet(level, n = 12){
 const out = [];
 for (let i = 0; i < n; i++) {
  const lv = level > 1 && i % 3 === 2 ? R(1, level - 1) : level;   // interleave earlier levels
  out.push(problem(lv));
 }
 return out;
}
function parseNum(str){
 let s = String(str).trim().toLowerCase().replace(/[,£$€₹%\s]/g, '').replace(/[−–]/g, '-');
 let mult = 1;
 if (/bn$/.test(s)) { mult = 1e9; s = s.slice(0, -2); }
 else if (/[mk]$/.test(s)) { mult = s.endsWith('m') ? 1e6 : 1e3; s = s.slice(0, -1); }
 if (!/^-?\d*\.?\d+$/.test(s)) return null;
 return Number(s) * mult;
}
const isRight = (x, p) => x != null && (p.tol.rel != null ? Math.abs(x - p.a) <= p.tol.rel * Math.abs(p.a) : Math.abs(x - p.a) <= (p.tol.abs || 0) + 1e-9);

/* ---------------- sessions ---------------- */

const VARIANTS = ['standard','standard','flip','standard','tight','kid'];
const VARIANT_TEXT = {
 standard:{title:'Say it in 60', lead:'Answer out loud as if a senior colleague just asked you.'},
 flip:{title:'Say it, then flip it', lead:'Answer in 45 seconds, then argue the other side for 15. Changing sides on purpose keeps thinking flexible.'},
 tight:{title:'Say it in 30', lead:'Half the time. Lead with the answer and keep only your strongest reason.'},
 kid:{title:'Explain it to a 12-year-old', lead:'Same question, no jargon. If you can say it simply, you understand it.'}
};

function buildSteps(s){
 const st = [];
 if (s.type === 'full') st.push({k:'checkin'});
 if (s.type !== 'speak') { st.push({k:'sprintIntro'}); s.problems.forEach((_, i) => st.push({k:'prob', i})); }
 if (s.type === 'full') st.push({k:'estimate'}, {k:'estimateCheck'});
 if (s.type !== 'sprint') st.push({k:'sayPrep'}, {k:'sayGo'}, {k:'sayCheck'});
 st.push({k:'done'});
 return st;
}

let cur = null;
async function begin(type){
 try { await loadBank(); } catch { if (type !== 'sprint') { alert('The question bank could not load. Check your connection and try again.'); return; } }
 const s = {type, index:0, a:{}, level:state.level, problems: type === 'speak' ? [] : sprintSet(state.level), started:Date.now(), v:1};
 if (BANK) {
  s.estIdx = state.est % BANK.est.length;
  s.sayIdx = state.say % BANK.say.length;
  s.variant = VARIANTS[state.say % VARIANTS.length];
 }
 state.session = s; save();
 track('session_start', {minutes:10});
 open();
}
async function open(){
 if (state.session.type !== 'sprint') { try { await loadBank(); } catch {} }
 cur = {s:state.session, steps:buildSteps(state.session)};
 $('home').hidden = true; document.querySelector('footer').hidden = true; $('trio').hidden = true;
 document.querySelector('.site-header').inert = true;
 $('stage').hidden = false; document.body.classList.add('practicing');
 render();
}
function closeStage(){
 stopClock();
 $('stage').hidden = true; $('home').hidden = false; document.querySelector('footer').hidden = false; $('trio').hidden = false;
 document.querySelector('.site-header').inert = false; document.body.classList.remove('practicing');
 cur = null; renderHome(); window.scrollTo(0, 0);
}
function go(d = 1){ stopClock(); cur.s.index = Math.max(0, Math.min(cur.steps.length - 1, cur.s.index + d)); save(); render(); }

/* ---------------- clock ---------------- */

let clockId = null;
function stopClock(){ if (clockId) { clearInterval(clockId); clockId = null; } $('clock').textContent = ''; }
function countUp(onTick){
 const t0 = Date.now(); stopClock();
 const tick = () => { const s = (Date.now() - t0) / 1000; $('clock').textContent = s.toFixed(0) + 's'; onTick?.(s); };
 tick(); clockId = setInterval(tick, 250);
 return () => (Date.now() - t0) / 1000;
}
function countDown(secs, node, onEnd){
 const t0 = Date.now(); stopClock();
 const tick = () => {
  const left = Math.max(0, secs - (Date.now() - t0) / 1000);
  node.textContent = Math.ceil(left) + 's';
  if (left <= 0) { stopClock(); onEnd?.(); }
 };
 tick(); clockId = setInterval(tick, 200);
}

/* ---------------- DOM helpers ---------------- */

function el(tag, props = {}, ...kids){
 const e = document.createElement(tag);
 for (const [k, v] of Object.entries(props)) {
  if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
  else if (k.startsWith('on')) e[k] = v; else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v);
 }
 for (const kid of kids.flat()) if (kid != null) e.append(kid);
 return e;
}
const P = (t, c) => el('p', {class:c, text:t});
const header = (eye, title, lead) => [el('span', {class:'eyebrow', text:eye}), el('h2', {class:'step-title', tabindex:'-1', text:title}), lead ? P(lead, 'step-lead') : null];
function actions(label, fn, {disabled = false, back = true} = {}){
 const row = el('div', {class:'stage-actions'});
 if (back && cur.s.index > 0) row.append(el('button', {class:'quiet', type:'button', text:'← Back', onclick:() => go(-1)}));
 const b = el('button', {class:'btn', type:'button', text:label, onclick:fn}); b.disabled = disabled; row.append(b);
 return row;
}
function chips(list, sel, onPick){
 const w = el('div', {class:'chips', role:'group'});
 for (const [id, label] of list) { const b = el('button', {type:'button', 'aria-pressed':String(sel === id), text:label}); b.onclick = () => onPick(id); w.append(b); }
 return w;
}
const kpi = (b, s) => el('div', {class:'kpi'}, el('b', {text:b}), el('span', {text:s}));
const A = () => cur.s.a;

function render(){
 const step = cur.steps[cur.s.index];
 const bar = $('progress'); bar.replaceChildren();
 cur.steps.forEach((_, i) => bar.append(el('span', {class: i < cur.s.index ? 'complete' : i === cur.s.index ? 'current' : ''})));
 $('stage-count').textContent = `Step ${cur.s.index + 1} of ${cur.steps.length}`;
 const inner = $('stage-inner'); inner.replaceChildren(...RENDER[step.k](step).flat().filter(Boolean));
 $('stage').querySelector('.stage-body').scrollTop = 0;
 (inner.querySelector('[autofocus]') || inner.querySelector('h2'))?.focus({preventScroll:true});
}

const TIPS = [
 'Sleep is the biggest lever on attention. After a short night, lapses rise sharply, so protect sleep before the days that matter.',
 'A brisk 10 to 20 minute walk before demanding thinking has a small to moderate short-term benefit for focus and switching.',
 'Short breaks reduce fatigue a little. For genuinely draining work, breaks longer than ten minutes help more than quick ones.',
 'Switching between tasks costs time and accuracy. Batch the shallow work and protect one block for the deep work.',
 'Do your hardest thinking at the time of day you are usually sharpest, and put routine work in the dips.',
 'Get it out of your head: a written list or a sketch frees working memory for the actual thinking.',
 'Before a meeting, write your point in one sentence. If you cannot, you are not ready to say it in sixty seconds either.',
 'Caffeine helps alertness, but late caffeine costs sleep, and sleep costs tomorrow’s focus. Keep it to earlier in the day.',
 'Work in time boxes of 25 to 50 minutes with a real break between them. Starting is easier when the end is visible.',
 'When a number matters in a meeting, say the rough answer first, then refine. “About 15%, let me check” beats silence.',
 'If you think you might have ADHD, an assessment is worth it. Treatment, where it is right for you, has far stronger evidence for focus than any exercise.',
 'Talk the problem through out loud. Explaining your reasoning catches gaps faster than thinking it silently.'
];

const RENDER = {
 checkin(){
  const a = A();
  const nodes = [header('BEFORE YOU START', 'Quick check-in', 'Ten seconds. Over time you will see how sleep and energy move your numbers.'),
   el('span', {class:'label', text:'Energy right now'}),
   chips([['sharp','Sharp'],['ok','OK'],['flat','Flat']], a.energy, id => { a.energy = id; save(); render(); }),
   el('span', {class:'label', text:'Last night’s sleep'}),
   chips([['good','Slept well'],['meh','So-so'],['bad','Badly']], a.sleep, id => { a.sleep = id; save(); render(); })];
  if (a.energy === 'flat') nodes.push(el('div', {class:'tip'}, el('b', {text:'Try this first: '}), 'two minutes of brisk walking or stairs, then come back. A short burst of movement before demanding thinking has some evidence behind it. Or carry on; flat days still count.'));
  nodes.push(actions('Start the sprint →', () => go(1), {disabled: !a.energy || !a.sleep, back:false}));
  return nodes;
 },

 sprintIntro(){
  const lv = cur.s.level;
  return [header(`MATHS SPRINT · LEVEL ${lv} OF 8`, LEVELS[lv].name, `12 problems. Aim for under ${LEVELS[lv].target} seconds each, but accuracy first. Every third problem revisits an earlier level.`),
   el('div', {class:'tip'}, el('b', {text:'How it adapts: '}), `10 or more right with a median time under ${LEVELS[lv].target}s unlocks the next level. Fewer than 7 right steps you back one. Type your answer and press Enter.`),
   P('Rounding is fine where it says “roughly” or the answer is a percentage: you get a small margin.', 'meta'),
   actions('Go →', () => go(1), {back: cur.s.type === 'full'})];
 },

 prob({i}){
  const p = cur.s.problems[i], a = A(), res = a['p' + i];
  const dots = el('div', {class:'dots', 'aria-hidden':'true'});
  cur.s.problems.forEach((_, j) => { const r = a['p' + j]; dots.append(el('i', {class: r ? (r.ok ? 'ok' : 'no') : j === i ? 'now' : ''})); });
  const input = el('input', {class:'field num', inputmode:'decimal', autocomplete:'off', 'aria-label':'Your answer', autofocus:true});
  const nodes = [el('div', {class:'math-meta'}, el('span', {text:`${i + 1} / ${cur.s.problems.length} · Level ${p.level}`}), dots),
   el('p', {class:'math-q', role:'heading', 'aria-level':'2'}, p.q, p.sub ? el('small', {text:p.sub}) : null)];
  if (!res) {
   const elapsed = countUp();
   const submit = () => {
    const x = parseNum(input.value);
    if (x == null) { input.focus(); return; }
    a['p' + i] = {x, ok:isRight(x, p), t:Math.round(elapsed() * 10) / 10};
    save(); stopClock(); render();
   };
   input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
   nodes.push(input, actions('Check (Enter)', submit, {back:false}),
    el('button', {class:'quiet', type:'button', text:'Skip this one', onclick:() => { a['p' + i] = {x:null, ok:false, t:Math.round(elapsed() * 10) / 10, skip:true}; save(); stopClock(); render(); }}));
  } else {
   const slow = res.t > LEVELS[p.level].target;
   nodes.push(el('div', {class:'reveal ' + (res.ok ? 'good' : 'warn')},
    el('b', {class:'lbl', text: res.ok ? `Right · ${res.t}s${slow ? ' (a bit slow)' : ''}` : res.skip ? 'Skipped' : `Not quite · ${res.t}s`}),
    res.ok ? (slow ? p.trick : `Answer: ${fmt(p.a)}${p.unit === '%' ? '%' : ''}`) : `Answer: ${fmt(p.a)}${p.unit === '%' ? '%' : p.unit ? ' ' + p.unit : ''}. ${p.trick}`));
   const nextBtn = actions(i === cur.s.problems.length - 1 ? 'Finish the sprint →' : 'Next (Enter) →', () => go(1), {back:false});
   nodes.push(nextBtn);
   setTimeout(() => nextBtn.querySelector('.btn')?.focus(), 0);
  }
  return nodes;
 },

 estimate(){
  const e = BANK.est[cur.s.estIdx], a = A();
  const chain = el('textarea', {id:'chain', placeholder:'e.g. people × share who … × times a year × price', style:'min-height:6rem', 'aria-label':'Your chain of assumptions'});
  chain.value = a.chain || ''; chain.oninput = () => { a.chain = chain.value; save(); };
  const num = el('input', {class:'field num', id:'guess', inputmode:'decimal', autocomplete:'off', placeholder:'Your number', 'aria-label':'Your estimate'});
  num.value = a.guessRaw || ''; num.oninput = () => { a.guessRaw = num.value; save(); btn.querySelector('.btn').disabled = parseNum(num.value) == null; };
  countUp();
  const btn = actions('Reveal one good chain →', () => { a.guess = parseNum(num.value); save(); go(1); }, {disabled: parseNum(num.value) == null});
  return [header(`ESTIMATE IT · ${cur.s.estIdx + 1}`, e.q, `Answer in ${e.u}. Take about two minutes. Break it into pieces you can guess.`),
   el('div', {class:'structure'}, el('div', {}, el('b', {text:'1. Pieces'}), 'What would you multiply?'), el('div', {}, el('b', {text:'2. Guess each'}), 'Round, confident numbers.'), el('div', {}, el('b', {text:'3. Multiply'}), 'Then ask: does it feel right?')),
   el('label', {class:'label', for:'chain', text:'Your chain'}), chain,
   el('label', {class:'label', for:'guess', text:`Your answer (${e.u})`}), num,
   P('You can type 2.5m, 40k or 1.2bn.', 'frame-hint'), btn];
 },

 estimateCheck(){
  const e = BANK.est[cur.s.estIdx], a = A();
  const ratio = a.guess && e.a ? a.guess / e.a : null;
  const f = ratio ? Math.max(ratio, 1 / ratio) : Infinity;
  const verdict = f <= 2 ? ['good', 'Within a factor of two. That is a great estimate.'] : f <= 5 ? ['', 'Within a factor of five. Reasonable; find the one link that moved it most.'] : ['warn', 'More than five times out. Check which link in your chain is doing the damage.'];
  a.factor = Number.isFinite(f) ? Math.round(f * 10) / 10 : null; a.dir = ratio ? (ratio > 1 ? 'high' : 'low') : null; save();
  return [header('CHECK', 'One reasonable chain', 'Not the only right answer: a defensible one. The skill is the structure.'),
   a.chain ? el('div', {class:'reveal'}, el('b', {class:'lbl', text:'Yours'}), a.chain, el('br'), el('strong', {text:`= ${fmt(a.guess)} ${e.u}`})) : el('div', {class:'reveal'}, el('b', {class:'lbl', text:'Yours'}), `${fmt(a.guess)} ${e.u}`),
   el('div', {class:'reveal good'}, el('b', {class:'lbl', text:'One good chain'}), el('ul', {}, e.c.map(c => el('li', {text:c}))), el('strong', {text:`≈ ${fmt(e.a)} ${e.u}`}), e.lo ? P(`A sensible range: ${fmt(e.lo)} to ${fmt(e.hi)}.`, 'meta') : null),
   el('div', {class:'reveal ' + verdict[0]}, el('b', {class:'lbl', text: ratio ? `You were ${a.factor}× ${a.dir === 'high' ? 'high' : 'low'}` : 'Result'}), verdict[1]),
   e.n ? el('div', {class:'tip'}, el('b', {text:'Note: '}), e.n) : null,
   actions('On to Say it in 60 →', () => go(1))];
 },

 sayPrep(){
  const q = BANK.say[cur.s.sayIdx], v = VARIANT_TEXT[cur.s.variant || 'standard'];
  const t = el('p', {class:'timer big', 'aria-live':'off', text:'20s'});
  const nodes = [header(`${v.title.toUpperCase()} · THINK FIRST`, q.q, v.lead),
   el('div', {class:'structure'},
    el('div', {}, el('b', {text:'Answer first'}), 'Your position in one sentence.'),
    el('div', {}, el('b', {text: cur.s.variant === 'tight' ? 'One reason' : 'Three reasons'}), cur.s.variant === 'tight' ? 'Your strongest.' : 'Signpost them: first, second, third.'),
    el('div', {}, el('b', {text:'So what'}), 'What should happen next?')),
   t, P('Twenty seconds to plan. Note three words if it helps, not sentences.', 'frame-hint'),
   actions('Ready to speak →', () => go(1))];
  setTimeout(() => countDown(20, t, () => { t.textContent = 'Go'; }), 0);
  return nodes;
 },

 sayGo(){
  const q = BANK.say[cur.s.sayIdx], secs = cur.s.variant === 'tight' ? 30 : 60;
  const t = el('p', {class:'timer big', text:secs + 's'});
  const nodes = [header('SPEAK NOW · OUT LOUD', q.q, cur.s.variant === 'flip' ? 'At 15 seconds left, switch: “The best case against that is…”' : 'Speak at a steady pace. Pauses are fine; restarts are not needed.'),
   t, P('Nothing is recorded. Speak to the room, or to yourself in a mirror.', 'meta'),
   actions('Finished →', () => go(1))];
  setTimeout(() => countDown(secs, t, () => { t.textContent = 'Time'; }), 0);
  return nodes;
 },

 sayCheck(){
  const a = A(); a.checks = a.checks || {};
  const items = [['first','I led with my answer in the first sentence'],['three', cur.s.variant === 'tight' ? 'I kept to one strong reason' : 'I gave clear, signposted reasons'],['close','I finished with a so-what, not a trail-off'],['pace','I kept a steady pace and paused instead of filling']];
  if (cur.s.variant === 'flip') items.push(['flip','I argued the other side honestly']);
  const box = el('div', {class:'checks'});
  for (const [id, label] of items) {
   const c = el('input', {type:'checkbox', id:'c-' + id}); c.checked = !!a.checks[id];
   c.onchange = () => { a.checks[id] = c.checked; save(); };
   box.append(el('label', {for:'c-' + id}, c, el('span', {text:label})));
  }
  return [header('SELF-CHECK', 'How did that land?', 'Be honest, it is only for you. Tick what you did.'), box,
   el('div', {class:'tip'}, el('b', {text:'If it went badly: '}), 'say it once more, straight away. The second take is where most of the learning happens.'),
   actions('Finish →', () => go(1))];
 },

 done(){
  if (!cur.s.finished) finish();
  const r = cur.s.result;
  const nodes = [el('div', {class:'completion-mark', 'aria-hidden':'true', text:'✓'}), ...header('QUICK THINKING', 'Session done.')];
  const k = el('div', {class:'kpis'});
  if (r.n) k.append(kpi(`${r.right}/${r.n}`, 'sums right'), kpi(r.median ? r.median + 's' : '–', 'median time'), kpi(`L${state.level}`, LEVELS[state.level].name));
  if (r.factor) k.append(kpi(r.factor + '×', 'estimate off by'));
  if (r.checks != null) k.append(kpi(`${r.checks}/${r.checkMax}`, 'speaking checks'));
  nodes.push(k);
  if (r.levelMsg) nodes.push(el('div', {class:'reveal ' + (r.levelUp ? 'good' : '')}, r.levelMsg));
  nodes.push(el('div', {class:'tip'}, el('b', {text:'Stamina tip: '}), TIPS[(state.log.length) % TIPS.length]));
  const nxt = T.next('think');
  if (nxt) nodes.push(el('a', {class:'handoff', href:nxt.href}, el('b', {text:`Next: ${nxt.name} →`}), el('span', {text: nxt.id === 'read' ? 'Ten minutes of reading focus' : 'Your speech warm-up'})));
  else nodes.push(P('All three done today. That is the whole job.', 'meta'));
  nodes.push(el('button', {class:'btn', type:'button', text:'Done →', onclick:() => { state.session = null; save(); closeStage(); }}));
  return nodes;
 }
};

function finish(){
 const s = cur.s, a = s.a;
 const res = s.problems.map((_, i) => a['p' + i]).filter(Boolean);
 const times = res.filter(x => x.ok).map(x => x.t).sort((x, y) => x - y);
 const r = {n:res.length, right:res.filter(x => x.ok).length, median: times.length ? times[Math.floor(times.length / 2)] : null};
 if (r.n >= 10) {
  const lv = s.level, target = LEVELS[lv].target;
  if (r.right >= 10 && r.median != null && r.median <= target && lv < 8) { state.level = lv + 1; r.levelUp = true; r.levelMsg = `Level ${lv + 1} unlocked: ${LEVELS[lv + 1].name}.`; }
  else if (r.right < 7 && lv > 1) { state.level = lv - 1; r.levelMsg = `Back to level ${lv - 1} for now. Accuracy first; speed follows.`; }
  else r.levelMsg = r.right >= 10 ? `Accurate. Get the median under ${target}s to unlock level ${Math.min(8, lv + 1)}.` : `Staying on level ${lv}. 10 right unlocks the next step.`;
  state.best = Math.max(state.best, state.level);
 }
 if (s.type === 'full') { r.factor = a.factor; state.est++; }
 if (s.type !== 'sprint') { const ch = a.checks || {}; r.checks = Object.values(ch).filter(Boolean).length; r.checkMax = s.variant === 'flip' ? 5 : 4; state.say++; }
 state.log.push({d:dateKey(), type:s.type, lv:s.level, n:r.n, ok:r.right, med:r.median, e:a.energy || null, sl:a.sleep || null, f:a.factor ?? null, dir:a.dir || null, ch:r.checks ?? null});
 if (s.type === 'full') {
  const key = dateKey(), prev = state.days[key] || {};
  state.days[key] = {...prev, complete:true, count:(prev.count || 0) + 1};
 }
 s.finished = true; s.result = r; save();
 track('session_complete', {minutes:10});
}

/* ---------------- home ---------------- */

function streak(){ let n = 0; const d = new Date(); if (!state.days[dateKey(d)]?.complete) d.setDate(d.getDate() - 1); while (state.days[dateKey(d)]?.complete) { n++; d.setDate(d.getDate() - 1); } return n; }
function renderHome(){
 T.renderStrip($('trio'), 'think');
 const s = state.session;
 $('today-meta').textContent = `Maths level ${state.level}: ${LEVELS[state.level].name} · estimate ${state.est + 1} · question ${state.say + 1}`;
 if (s) {
  $('today-label').textContent = 'In progress';
  $('start').querySelector('strong').textContent = 'RESUME'; $('start-sub').textContent = 'Carry on where you stopped →';
  $('resume-note').hidden = false;
  $('resume-note').replaceChildren(el('button', {class:'quiet', type:'button', text:'Discard and start fresh', onclick:() => { state.session = null; save(); renderHome(); }}));
 } else {
  $('today-label').textContent = T.doneOn('think') ? 'Done today · go again if you like' : 'Today’s session';
  $('start').querySelector('strong').textContent = 'GO'; $('start-sub').textContent = 'Start thinking →';
  $('resume-note').hidden = true;
 }
 const sprints = state.log.filter(l => l.n);
 const tot = sprints.reduce((acc, l) => (acc.n += l.n, acc.ok += l.ok, acc), {n:0, ok:0});
 const recent = sprints.slice(-10).map(l => l.med).filter(Boolean);
 const ests = state.log.filter(l => l.f);
 $('kpis').replaceChildren(
  kpi(`L${state.level}`, `maths level · best L${state.best}`),
  kpi(String(streak()), 'day thinking streak'),
  kpi(tot.n ? Math.round(100 * tot.ok / tot.n) + '%' : '–', 'sums right'),
  kpi(recent.length ? (recent.reduce((x, y) => x + y, 0) / recent.length).toFixed(1) + 's' : '–', 'median time, last 10'),
  kpi(ests.length ? Math.round(100 * ests.filter(l => l.f <= 2).length / ests.length) + '%' : '–', 'estimates within 2×')
 );
 const bits = [];
 const byE = k => { const xs = sprints.filter(l => l.e === k); const n = xs.reduce((a, l) => a + l.n, 0); return n >= 24 ? Math.round(100 * xs.reduce((a, l) => a + l.ok, 0) / n) : null; };
 const sh = byE('sharp'), fl = byE('flat');
 if (sh != null && fl != null) bits.push(`Accuracy when you feel sharp: ${sh}%; when flat: ${fl}%.`);
 const bySl = k => { const xs = sprints.filter(l => l.sl === k); const n = xs.reduce((a, l) => a + l.n, 0); return n >= 24 ? Math.round(100 * xs.reduce((a, l) => a + l.ok, 0) / n) : null; };
 const good = bySl('good'), bad = bySl('bad');
 if (good != null && bad != null) bits.push(`After a good night: ${good}%; after a bad one: ${bad}%.`);
 if (ests.length >= 6) { const hi = ests.filter(l => l.dir === 'high').length; if (hi / ests.length >= 0.7) bits.push('You tend to estimate high.'); else if (hi / ests.length <= 0.3) bits.push('You tend to estimate low.'); }
 $('insight').textContent = bits.join(' ') || 'After a couple of weeks this shows how sleep and energy move your accuracy, and whether you tend to estimate high or low.';
}

/* ---------------- about ---------------- */

function info(title, nodes){ $('info-title').textContent = title; $('info-body').replaceChildren(...nodes); $('info').showModal(); }
const link = (href, text) => el('a', {href, rel:'noopener', text});
function openAbout(){
 const h = t => el('h3', {text:t});
 const src = (...pairs) => { const p = el('p', {class:'gentle-note'}); pairs.forEach(([href, t], i) => { if (i) p.append(' · '); p.append(link(href, t)); }); return p; };
 info('How this was built', [
  h('The honest starting point'),
  P('“Brain training” games reliably make people better at the games. Large reviews find little evidence that the gains carry over to everyday thinking, and working-memory training mostly improves the trained task. For ADHD specifically, cognitive training improves working-memory tests, but the effect on symptoms largely disappears when the people rating them do not know who was trained.'),
  P('So this page does not try to raise general brainpower. It trains the specific things you want to be fast at, because practice transfers well to the skill practised: business arithmetic, estimation, and answering out loud in a clear structure.'),
  h('Why these three'),
  P('Maths sprint: retrieval practice and spaced, interleaved problems build fluency, and mixing problem types beats practising one type in a block. The levels follow the numbers an executive meets: percentages, growth, margins, payback, valuation. Estimation: breaking an unknown into guessable parts is a learnable skill, and the feedback shows whether you lean high or low. Say it in 60: answer-first structure under a short time limit is the thinking-out-loud skill meetings reward, and it carries your speech practice into real speaking.'),
  h('Not getting tired'),
  P('No exercise builds “mental stamina” directly. What the evidence does support: enough sleep (sleep loss sharply increases attention lapses), short bouts of aerobic exercise (small to moderate short-term benefits for executive function, including some studies in adults with ADHD), and breaks (micro-breaks reduce fatigue a little; draining work needs longer ones). The check-in lets you see these effects in your own numbers.'),
  h('What this is not'),
  P('It is not a treatment for ADHD or anything else. If you think you have ADHD, an assessment through your GP is the way to find out; for people who have it, treatment has much stronger evidence for focus than any practice app.'),
  src(['https://doi.org/10.1177/1529100616661983','Simons et al. 2016, brain-training review'],
   ['https://doi.org/10.1016/j.jaac.2014.12.010','Cortese et al. 2015, cognitive training in ADHD'],
   ['https://doi.org/10.3758/s13423-016-1217-0','Soveri et al. 2017, n-back training'],
   ['https://doi.org/10.1007/s11251-007-9015-8','Rohrer & Taylor 2007, interleaving'],
   ['https://doi.org/10.1037/a0018883','Lim & Dinges 2010, sleep loss'],
   ['https://doi.org/10.1016/j.brainres.2012.02.068','Chang et al. 2012, acute exercise'],
   ['https://pmc.ncbi.nlm.nih.gov/articles/PMC6443849/','Mehren et al. 2019, exercise in adult ADHD'],
   ['https://doi.org/10.1371/journal.pone.0272460','Albulescu et al. 2022, micro-breaks'],
   ['https://www.nhs.uk/conditions/adhd-adults/','NHS: ADHD in adults'])
 ]);
}
function openTricks(){
 const rows = [];
 for (let lv = 1; lv <= 8; lv++) {
  rows.push(el('h3', {text:`Level ${lv} · ${LEVELS[lv].name}`}), el('ul', {}, GEN[lv].map(g => el('li', {text:g().trick}))));
 }
 info('Mental maths tricks', [P('One example of each trick, with fresh numbers every time you open this.', 'meta'), ...rows]);
}

/* ---------------- data ---------------- */

function exportData(){
 const blob = new Blob([JSON.stringify({app:'speech-on-think', version:1, exported:new Date().toISOString(), ...state, session:null}, null, 1)], {type:'application/json'});
 const url = URL.createObjectURL(blob), a = el('a', {href:url, download:'speech-on-thinking.json'});
 document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
 $('data-status').textContent = 'Saved to a file.';
}
function importData(file){
 const reader = new FileReader();
 reader.onload = () => {
  try {
   const d = JSON.parse(String(reader.result));
   if (d.app !== 'speech-on-think') throw new Error('bad');
   if (Number.isInteger(d.level) && d.level >= 1 && d.level <= 8) state.level = d.level;
   if (Number.isInteger(d.best)) state.best = Math.max(state.best, d.best);
   if (d.days && typeof d.days === 'object') Object.assign(state.days, d.days);
   if (Array.isArray(d.log)) state.log = [...state.log, ...d.log].slice(-400);
   for (const k of ['est','say']) if (Number.isInteger(d[k])) state[k] = Math.max(state[k], d[k]);
   save(); renderHome(); $('data-status').textContent = 'Progress loaded.';
  } catch { $('data-status').textContent = 'That file could not be read.'; }
 };
 reader.readAsText(file);
}

/* ---------------- wiring ---------------- */

$('start').onclick = () => state.session ? open() : begin('full');
$('sprint-only').onclick = () => { if (state.session && !confirm('Leave the session in progress?')) return; begin('sprint'); };
$('speak-only').onclick = () => { if (state.session && !confirm('Leave the session in progress?')) return; begin('speak'); };
$('tricks').onclick = openTricks;
$('evidence').onclick = openAbout;
$('close-info').onclick = () => $('info').close();
$('exit').onclick = () => { save(); track('session_exit'); closeStage(); };
$('export').onclick = exportData;
$('import').onclick = () => $('import-file').click();
$('import-file').onchange = e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ''; };
$('erase').onclick = () => { if (confirm('Erase all thinking progress on this device? This cannot be undone.')) { localStorage.removeItem(KEY); location.reload(); } };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('stage').hidden && !document.querySelector('dialog[open]')) { e.preventDefault(); $('exit').click(); } });
window.addEventListener('pagehide', save);

renderHome();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();

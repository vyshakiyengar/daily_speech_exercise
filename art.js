'use strict';
/* Speech On — articulation art.
   One view per exercise: the mouth seen head-on, the way you see it in a
   mirror. Lip shape, how open the mouth is, and where the tongue sits when it
   is visible. Stylised cues, not anatomical drawings; every exercise also
   carries the instruction in words. */
(() => {

/* Mouth shapes. Each has an outer lip boundary, an inner opening, and
   optional teeth. viewBox 0 0 200 160. */
const MOUTH = {
 neutral: {
  outer:'M20 80C50 54 76 48 100 48s50 6 80 32c-30 26-56 32-80 32s-50-6-80-32z',
  inner:'M52 80c28-15 68-15 96 0-28 19-68 19-96 0z',
  teethU:'M56 76q44-15 88 0l-3 6q-41-12-82 0z'
 },
 round: {
  outer:'M100 28c28 0 47 23 47 52s-19 52-47 52-47-23-47-52 19-52 47-52z',
  inner:'M100 53c16 0 26 12 26 27s-10 27-26 27-26-12-26-27 10-27 26-27z'
 },
 spread: {
  outer:'M6 80c42-19 62-23 94-23s52 4 94 23c-42 21-62 25-94 25s-52-4-94-25z',
  inner:'M38 80c36-11 88-11 124 0-36 13-88 13-124 0z',
  teethU:'M42 75q58-12 116 0l-3 6q-55-10-110 0z'
 },
 closed: {
  outer:'M20 80C50 57 76 51 100 51s50 6 80 29c-30 23-56 29-80 29s-50-6-80-29z',
  seam:'M30 80h140'
 },
 open: {
  outer:'M28 76C52 32 74 22 100 22s48 10 72 54c-24 48-46 60-72 60s-48-12-72-60z',
  inner:'M56 76c22-28 66-28 88 0-22 42-66 42-88 0z',
  teethU:'M60 70q40-21 80 0l-5 9q-35-17-70 0z',
  teethL:'M62 98q38 19 76 0l-5-8q-33 15-66 0z'
 }
};

/* Tongue, drawn inside the open mouth where you can actually see it. */
const TONGUE = {
 low:   'M70 106q30 13 60 0 0-15-30-15t-30 15z',
 tipUp: 'M68 106q32 13 64 0 0-8-8-11-24 5-48 0-8 3-8 11z',
 back:  'M66 104q34 14 68 0 0-21-34-21t-34 21z',
 high:  'M64 100q36 16 72 0 0-28-36-28t-36 28z'
};
/* The raised tip, shown against the upper teeth. */
const TIP_CONTACT = 'M76 80q24-11 48 0-24 9-48 0z';

const AIR   = '<g class="a-air"><path d="M162 50q18-8 28 0"/><path d="M168 80h26"/><path d="M162 110q18 8 28 0"/></g>';
const PUFF  = '<g class="a-air"><path d="M160 64q20-8 30 0"/><path d="M164 92h28"/></g>';
const HUM   = '<g class="a-air"><path d="M12 62q8-10 16 0t16 0"/><path d="M8 98q10-12 20 0t20 0"/></g>';
const HANDS = '<g class="a-hands"><g class="a-hand-l"><circle cx="30" cy="52" r="9"/><circle cx="24" cy="72" r="9"/><circle cx="26" cy="92" r="9"/></g><g class="a-hand-r"><circle cx="170" cy="52" r="9"/><circle cx="176" cy="72" r="9"/><circle cx="174" cy="92" r="9"/></g></g>';
const BUBBLE= '<g class="a-bubble"><path d="M120 4h74v30h-34l-13 10V34h-27z"/><circle cx="139" cy="19" r="4"/><circle cx="157" cy="19" r="4"/><circle cx="175" cy="19" r="4"/></g>';

function mouthSVG(shape, tongue, tip, extras){
 const m = MOUTH[shape] || MOUTH.neutral;
 return `<svg viewBox="0 0 200 160" aria-hidden="true" class="art-mouth">
 <path class="a-lip" d="${m.outer}"/>
 ${m.inner  ? `<path class="a-cavity" d="${m.inner}"/>` : ''}
 ${tongue   ? `<path class="a-tongue" d="${TONGUE[tongue] || TONGUE.low}"/>` : ''}
 ${tip      ? `<path class="a-tongue a-tip" d="${TIP_CONTACT}"/>` : ''}
 ${m.teethU ? `<path class="a-teeth" d="${m.teethU}"/>` : ''}
 ${m.teethL ? `<path class="a-teeth" d="${m.teethL}"/>` : ''}
 ${m.seam   ? `<path class="a-seam" d="${m.seam}"/>` : ''}
 ${extras || ''}
</svg>`;
}

/* frame: [mouth shape, tongue key or null, show raised tip, extras] */
const ART = {
 relax:      {frames:[['neutral', null, false, HANDS]]},
 trill:      {frames:[['closed', null, false, PUFF], ['neutral', null, false, PUFF]]},
 breath:     {frames:[['neutral', null, false, AIR]]},
 jawOpen:    {frames:[['open', 'low', false], ['neutral', null, false]]},
 roundSpread:{frames:[['round', null, false], ['spread', null, false]]},
 lipsClosed: {frames:[['closed', null, false], ['open', 'low', false]]},
 tongueTip:  {frames:[['open', 'tipUp', true], ['open', 'low', false]]},
 tongueBack: {frames:[['open', 'back', false], ['open', 'low', false]]},
 voice:      {frames:[['closed', null, false, HUM]]},
 speak:      {frames:[['neutral', null, false, BUBBLE]]},
 rest:       {frames:[['closed', null, false]]}
};

/* Per-frame captions, so the picture still teaches with motion switched off. */
const CAPTIONS = {
 roundSpread:['round', 'spread'],
 lipsClosed: ['together', 'released'],
 tongueTip:  ['tip up', 'tip down'],
 tongueBack: ['back raised', 'back down'],
 jawOpen:    ['open', 'closed'],
 trill:      ['lips together', 'lips loose']
};

/**
 * Build the art block for an exercise.
 * @param {string} kind    key of ART
 * @param {string} label   accessible description, supplied by the caller
 * @param {boolean} still  true to show the frames side by side instead of animating
 */
function build(kind, label, still){
 const def = ART[kind] || ART.speak;
 const caps = CAPTIONS[kind] || [];
 const two = def.frames.length > 1;

 const wrap = document.createElement('div');
 wrap.className = 'artic' + (two ? ' artic-two' : '') + (still ? ' artic-still' : '');
 wrap.setAttribute('role', 'img');
 wrap.setAttribute('aria-label', label || '');

 def.frames.forEach((f, i) => {
  const cell = document.createElement('div');
  cell.className = 'artic-frame' + (i === 0 ? ' is-on' : '');
  cell.innerHTML = mouthSVG(f[0], f[1], f[2], f[3]);
  if (still && caps[i]) {
   const c = document.createElement('span');
   c.className = 'artic-cap';
   c.textContent = caps[i];
   cell.append(c);
  }
  wrap.append(cell);
 });

 /* Alternate the frames a handful of times, then settle. Nothing loops for
    ever, and nothing moves at all when reduced motion is requested. */
 if (!still && two) {
  const cells = [...wrap.children];
  let n = 0, on = 0;
  const id = setInterval(() => {
   cells[on].classList.remove('is-on');
   on = (on + 1) % cells.length;
   cells[on].classList.add('is-on');
   if (++n >= 7) { clearInterval(id); cells.forEach((c, i) => c.classList.toggle('is-on', i === 0)); }
  }, 1200);
  wrap.dataset.timer = String(id);
 }
 return wrap;
}

function stop(node){
 const id = node && node.dataset && node.dataset.timer;
 if (id) clearInterval(Number(id));
}

window.SpeechArt = {build, stop, kinds: Object.keys(ART)};
})();

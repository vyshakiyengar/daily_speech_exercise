'use strict';
/* Speech On — content and language packs.
   English ships inline so the first paint never waits on a fetch. Other
   languages load on demand from /lang/<code>.json and are cached by the
   service worker.

   Safety, legal and About text stays in English in every language, because a
   mistranslated caution is worse than an untranslated one. The app says so. */
(() => {

/* Languages offered. `reviewed` marks a pack a native speaker has checked;
   nothing is marked true until someone actually has. */
const LANGUAGES = [
 {code:'en',    name:'English',    native:'English',    dir:'ltr', group:'world', reviewed:true, ready:true},
 {code:'es',    name:'Spanish',    native:'Español',    dir:'ltr', group:'world', ready:true},
 {code:'fr',    name:'French',     native:'Français',   dir:'ltr', group:'world', ready:true},
 {code:'de',    name:'German',     native:'Deutsch',    dir:'ltr', group:'world', ready:true},
 {code:'pt',    name:'Portuguese', native:'Português',  dir:'ltr', group:'world', ready:true},
 {code:'ru',    name:'Russian',    native:'Русский',    dir:'ltr', group:'world', ready:true},
 {code:'ar',    name:'Arabic',     native:'العربية',     dir:'rtl', group:'world', ready:true},
 {code:'zh',    name:'Chinese',    native:'中文',        dir:'ltr', group:'world', ready:true},
 {code:'ja',    name:'Japanese',   native:'日本語',      dir:'ltr', group:'world', ready:true},
 {code:'id',    name:'Indonesian', native:'Bahasa Indonesia', dir:'ltr', group:'world', ready:true},
 {code:'hi',    name:'Hindi',      native:'हिन्दी',        dir:'ltr', group:'india', ready:true},
 {code:'te',    name:'Telugu',     native:'తెలుగు',       dir:'ltr', group:'india', ready:true},
 {code:'ta',    name:'Tamil',      native:'தமிழ்',        dir:'ltr', group:'india', ready:true},
 {code:'kn',    name:'Kannada',    native:'ಕನ್ನಡ',        dir:'ltr', group:'india', ready:true}
];

/* Structure of every exercise. Language packs supply words only; the shape,
   the artwork and the suggested seconds are the same everywhere. */
const SHAPE = {
 breath:     {art:'breath',      kind:'phrases', secs:60},
 massage:    {art:'relax',       kind:'quote',   secs:45},
 jaw:        {art:'jawOpen',     kind:'phrases', secs:45},
 motor:      {art:'trill',       kind:'quote',   secs:30},
 lips:       {art:'lipsClosed',  kind:'phrases', secs:45},
 tongueTip:  {art:'tongueTip',   kind:'phrases', secs:45},
 tongueBack: {art:'tongueBack',  kind:'phrases', secs:45},
 rest:       {art:'rest',        kind:'quote',   secs:60},
 voice:      {art:'voice',       kind:'phrases', secs:45},
 sounds:     {art:'roundSpread', kind:'pairs',   secs:60},
 endings:    {art:'tongueTip',   kind:'phrases', secs:45},
 blends:     {art:'lipsClosed',  kind:'phrases', secs:45},
 sentences:  {art:'speak',       kind:'phrases', secs:60},
 pauses:     {art:'speak',       kind:'phrases', secs:60, pauseMarks:true},
 emphasis:   {art:'speak',       kind:'emphasis',secs:45},
 reading:    {art:'speak',       kind:'phrases', secs:75, pauseMarks:true},
 transfer:   {art:'speak',       kind:'context', secs:90},
 fun:        {art:'speak',       kind:'quote',   secs:45, tones:true}
};

const ROUTES = {
 5:  ['massage','motor','sounds','sentences','pauses','fun'],
 8:  ['massage','motor','sounds','endings','sentences','pauses','emphasis','fun'],
 12: ['massage','motor','sounds','endings','blends','sentences','pauses','emphasis','reading','fun'],
 20: ['breath','massage','jaw','motor','lips','tongueTip','tongueBack','rest','voice',
      'sounds','endings','blends','sentences','pauses','emphasis','reading','transfer','fun']
};

/* Accessible descriptions of the artwork, English only for now. */
const ART_LABELS = {
 relax:      'A cutaway of a relaxed mouth, with fingertips resting on the outside of the cheeks.',
 trill:      'A cutaway showing the lips lightly together with air flowing out past them.',
 breath:     'A cutaway of a mouth at rest with air moving gently in and out.',
 jawOpen:    'Two cutaways: the jaw open with the tongue low, then closed again.',
 roundSpread:'Two views: lips rounded forward for oo, then spread wide for ee.',
 lipsClosed: 'Two views: lips pressed together, then released open.',
 tongueTip:  'A cutaway with the tip of the tongue raised to the ridge behind the upper front teeth.',
 tongueBack: 'A cutaway with the back of the tongue raised towards the soft palate.',
 voice:      'A cutaway of a closed mouth with gentle sound waves at the throat.',
 speak:      'A cutaway of a mouth mid-speech with a speech bubble.',
 rest:       'A cutaway of a closed, resting mouth.'
};

/* ---------------- English pack ---------------- */

const EN = {
 ui: {
  skipLink:'Skip to practice',
  hook:'BEFORE YOUR NEXT MEETING', headline1:'Get ready to', headline2:'speak clearly.',
  intro:'A few minutes of guided practice for clearer words and a steadier pace.',
  chooseTime:'Choose your time', min:'min', full:'Full', fullMin:'~20 min',
  go:'GO', resume:'RESUME', startPractice:'Start practice →', stepOf:'Step {n} of {total} →',
  free:'Free · No sign-up · No microphone',
  disclaimer:'Speech On is a practice tool, not a treatment or clinical intervention. It does not replace assessment or therapy from a qualified speech-language professional.',
  safetyLink:'Practising safely', termsLink:'Terms',
  routine5:'A quick warm-up for clear words and easy pauses.',
  routine8:'Adds word endings and emphasis to your warm-up.',
  routine12:'More sound combinations and a guided reading.',
  routine20:'Jaw, cheeks, lips, tongue, breath and voice, with a rest break. Keep every movement comfortable.',
  howItWorks:'How it works',
  hiw:['Practise daily, or before you have to speak.','Choose your time and tap GO.','Follow each instruction out loud, then tap Next.','Finish, and notice how speaking feels.'],
  seeRoutine:'See every exercise first ↗',
  progressReminders:'My progress & reminders ↗', yourPractice:'Your practice',
  closeProgress:'Close progress', smallSteps:'SMALL STEPS ADD UP',
  firstPractice:'Your first practice is a good start.',
  weekSoFar:'{n} day of practice this week. Keep making room.',
  weekSoFarPlural:'{n} days of practice this week. Keep making room.',
  noCatchUp:'No catching up. Just a little time for yourself today.',
  todayDone:'Today is in the books. Come back tomorrow for fresh material.',
  savedHere:'Saved in this browser · signing in isn’t required. Clearing browser data removes your progress.',
  weekAria:'Practice over the last seven days', practised:'practised', notPractised:'not practised',
  rhythm:'A RHYTHM THAT FITS YOUR LIFE', dayStreak:'day streak', personalBest:'personal best',
  streakNote:'One day at a time. Miss a day? You’re always welcome back.',
  myGoal:'My practice goal', goal3:'3 days in 7 · a gentle start', goal5:'5 days in 7 · a regular rhythm',
  goal7:'7 days in 7 · a daily moment',
  goalMet:'Your weekly goal is met. Anything extra is yours to enjoy.',
  goalProgress:'{n} of {goal} practice days in the last 7 days.',
  setReminder:'Set a daily reminder ↗',
  exportProgress:'Save my progress to a file ↓', importProgress:'Load progress from a file ↑',
  eraseProgress:'Erase everything on this device', eraseConfirm:'Erase your practice history on this device? This cannot be undone.',
  erased:'Erased. Nothing about your practice remains in this browser.',
  imported:'Progress loaded. Your streak is back.', importFailed:'That file could not be read. Nothing was changed.',
  exported:'Saved. Keep the file somewhere safe and load it on any device.',
  saveExit:'← Save & exit', hearInstructions:'Hear instructions ♫', howToDoIt:'How to do it',
  howToTitle:'How to do this exercise', yourSession:'YOUR SESSION', percentComplete:'{n}% complete',
  stepCount:'{n} of {total} · {pct}% complete', back:'← Back', next:'Next exercise →', finish:'Finish →',
  keyboard:'Arrow keys to move · Esc to save & exit',
  pacer:'Timer', pacerOff:'Off', pacerOn:'Show a timer', pacerStart:'Start {n}s timer', pacerStop:'Stop timer', pacerDone:'Time’s up. Take as long as you like.',
  pacerHint:'about {n} seconds', pacerOptional:'The timer is optional. Nothing is being measured.',
  practiceDone:'Practice', doneEm:'done.', takeItWith:'Take it', takeItEm:'with you.',
  practisedOutLoud:'Practised out loud? Save today.', saveToday:'I practised · Save today',
  savedToday:'Practice saved here. Fresh material tomorrow.',
  savedNoStorage:'Practice complete. Browser storage is unavailable, so today could not be saved.',
  howDidItFeel:'How did speaking feel?', easier:'Easier', same:'The same', harder:'More effort',
  feelingDefault:'Your impression, not a measured score.',
  feelingEasier:'Take that feeling into your next conversation.',
  feelingSame:'That’s useful to notice. Keep it comfortable.',
  feelingHarder:'Take a break, and keep your next conversation comfortable.',
  takeaway:'Take one cue with you: clear words, easy pauses.',
  done:'Done →', remindTomorrow:'Remind me tomorrow', share:'Share ↗',
  shareText:'Get your lips, tongue and voice ready to speak. A free speech warm-up, no sign-up.',
  linkCopied:'Link copied. Share it with someone who could use a warm-up.',
  shared:'Thanks for passing it on.', shareFallback:'Share this link: {url}',
  chooseNewSession:'Start a different session', pickUpWhere:'PICK UP WHERE YOU LEFT OFF.',
  fiveMinutes:'FIVE MINUTES. START HERE.', yourWarmUp:'YOUR {n}-MINUTE WARM-UP.',
  language:'Language', occasion:'Occasion', settings:'Settings', closeSettings:'Close settings',
  appearance:'Appearance', themeAuto:'Match my device', themeLight:'Light', themeDark:'Dark',
  textSize:'Text size', textNormal:'Normal', textLarge:'Large', textLarger:'Larger',
  reminderTitle:'A daily reminder.', closeReminder:'Close reminder',
  pickTime:'Pick a time for your daily practice.', myDailyTime:'My daily practice time',
  reminderNote:'Download a recurring calendar event, then open it in your calendar and confirm the import. Your calendar handles reminders; this app doesn’t send notifications.',
  downloadReminder:'Download daily reminder ↓',
  reminderDone:'Downloaded. Open the file in your calendar and confirm the import to activate your reminder.',
  reminderSummary:'Practice clear, natural speech',
  about:'About & privacy', evidence:'How this was built ↗', closeDialog:'Close dialog',
  storageGone:'Browser storage is unavailable. You can carry on while this page stays open.',
  langNote:'This translation is machine-assisted and has not yet been checked by a native speaker. Safety and legal pages are in English only.',
  langLoading:'Loading…', langFailed:'That language could not be loaded. Staying in English.',
  noteLabel:'Note'
 },
 contexts: {
  everyday:    {label:'Everyday', opener:'I have something to share, and I can take my time saying it.',
                prompts:['Tell me about your day so far, in a few sentences.','Describe something you are looking forward to this week.']},
  meeting:     {label:'A meeting', opener:'Here is the main update, and here is what we can do next.',
                prompts:['Give a one-minute update on something you are working on.','Explain one decision you would like the group to make.']},
  presentation:{label:'A presentation', opener:'Today I want to share one idea and explain why it matters.',
                prompts:['Introduce yourself and your topic in three sentences.','Say the one thing you most want your audience to remember.']},
  call:        {label:'A phone call', opener:'Hello, this is me calling about the appointment.',
                prompts:['Say your name and phone number clearly, as if leaving a voicemail.','Ask a question you have been putting off asking someone.']},
  teaching:    {label:'Teaching or presenting all day', opener:'Good morning everyone, let’s pick up where we left off.',
                prompts:['Explain something you know well, as if to someone new to it.','Give three instructions, pausing clearly between each one.']}
 },
 steps: {
  breath:{title:'Settle your breath', short:'Breath setup',
   instruction:'Sit comfortably and let your shoulders settle. Take five easy breaths, then say each phrase on one comfortable breath out. Repeat twice.',
   phrases:['Hello, good morning.','I have something to share.'],
   tip:'Breathe normally between phrases. Never hold your breath or try to empty your lungs. Sit down for this step and stop if you feel light-headed.'},
  massage:{title:'Relax your face', short:'Face relax',
   note:'A settling step to begin with, not an articulation exercise. It relaxes you; it does not change how you sound.',
   instruction:'With clean fingertips, gently massage the outside of your cheeks and jaw for about half a minute. Keep your teeth slightly apart.',
   quote:'Soften. Settle.',
   tip:'Touch only the outside of your cheeks, never inside your mouth. Skip this step over sore, injured or recently treated areas, and skip it if your jaw hurts, clicks painfully or has locked before. Stop if it is uncomfortable.'},
  jaw:{title:'Let your jaw move easily', short:'Jaw movement',
   instruction:'Say each vowel row slowly five times, letting your jaw open and close comfortably. Rest between rows.',
   phrases:['ah · oh · ah','ee · ah · oo'],
   tip:'Keep the movements small and easy. Do not stretch your jaw wide or push on it with your hands. Skip this if your jaw hurts or locks.'},
  motor:{title:'Warm up your voice', short:'Voice warm-up',
   note:'A voice warm-up, the same kind singers use. It prepares your voice. It is not an articulation exercise and will not change how clearly you form sounds.',
   instruction:'Keep your lips loose and blow out gently to make a “brrrr” sound. About fifteen seconds in total, taking a breath whenever you need one.',
   quote:'Brrrr…',
   tip:'Let your lips flutter without squeezing them. Fifteen seconds does not need to be one breath. Stop before you run out of air, and skip this if it feels difficult, dizzy, painful or strained, or if your voice is hoarse.'},
  lips:{title:'Shape sounds with your lips', short:'Lip precision',
   instruction:'Read each row slowly three times. Let your lips meet lightly for p, b and m, then round gently for w.',
   phrases:['pa · ba · ma','we · woo · way','Maybe we can begin.'],
   tip:'Release your lips between repetitions. Keep your cheeks relaxed; do not squeeze or puff them against resistance.'},
  tongueTip:{title:'Practise tongue-tip sounds', short:'Tongue tip',
   instruction:'Read each row aloud three times. Let the tip of your tongue make light contact behind your upper front teeth, then release.',
   phrases:['ta · da · na · la','Tell Lily the news.','A little time today.'],
   tip:'Use your own accent. Aim for clear, easy contacts without pressing hard or pushing your tongue forward between your teeth.'},
  tongueBack:{title:'Move from front to back sounds', short:'Tongue coordination',
   instruction:'Say each row slowly three times, moving between lip sounds, tongue-tip sounds and back-of-tongue sounds. Pause between rows.',
   phrases:['ka · ga · keep · go','pa · ta · ka','Pack the green bag.'],
   tip:'This is coordination practice, not a speed test. Keep your throat comfortable and use a normal speaking volume.'},
  rest:{title:'Take a quiet break', short:'Rest break',
   instruction:'Rest silently for about a minute. Let your jaw and shoulders relax, breathe normally, and take a sip of water if you like.',
   quote:'Pause. Reset.',
   tip:'This is a longer routine, not a harder one. Stop the session altogether if your voice feels tired, hoarse, painful or strained.'},
  voice:{title:'Ease into your voice', short:'Gentle voice',
   instruction:'Hum a gentle “mmm” at your usual pitch, then say each phrase. Repeat the sequence three times, breathing and resting between turns.',
   phrases:['Mmm · morning.','Mmm · many thanks.'],
   tip:'Keep the hum short and easy. Do not push for volume or vibration, squeeze your throat, or hold the sound until you run out of breath. Skip this if you are hoarse.'},
  sounds:{title:'Exaggerate every sound and word', short:'Sounds → words',
   instruction:'Say the sounds on the left, then the words on the right, with big, comfortable mouth movements. Read each row twice.',
   pairs:[['oo · ee','you · me'],['pa · ba','paper · bag'],['ta · da','today · day'],['ka · ga','keep · going']],
   tip:'Say every item aloud: oo, ee, you, me. Use comfortable effort without pushing or straining. Bigger movements, not a louder voice.'},
  endings:{title:'Finish every word', short:'Word endings',
   instruction:'Read each line aloud twice, making the last sound of every word clear.',
   phrases:['cap · cat · cab','back · bag · bat','seat · seed · seem'],
   tip:'Keep the ending clear without adding an extra vowel: say cat, not cat-uh. Use your own accent; this is not a speed test.'},
  blends:{title:'Keep the sounds together', short:'Sound combinations',
   instruction:'Read each line slowly twice, keeping the first two sounds together without adding a vowel between them.',
   phrases:['blue · bloom · blanket','green · grow · great','stay · step · stop'],
   tip:'For blue, move smoothly from b to l without saying buh-loo. Go slowly; you do not need to get faster.'},
  sentences:{title:'Exaggerate every sentence', short:'Clear sentences',
   instruction:'Read every sentence aloud twice with exaggerated, comfortable mouth movements.',
   tip:'Make the movements bigger, not your voice louder. Read the list twice, with a brief pause between sentences.'},
  pauses:{title:'Pause at the line', short:'Easy pauses',
   instruction:'Read each line aloud twice in your normal voice, taking a short pause at each slash.',
   phrases:['Here is the update / we have a clear plan.','The first step is ready / let’s check it together.','Thank you for your time / I’ll send the details.'],
   tip:'The slash marks a pause; do not say “slash”. Breathe whenever you need to.'},
  emphasis:{title:'Make the marked word stand out', short:'Word emphasis',
   instruction:'Read each line aloud twice, saying the marked word a little longer than the others.',
   tip:'Lengthen the marked word slightly without speaking louder. Notice how the same sentence draws attention to who, what, or when.'},
  reading:{title:'Put it all together', short:'Guided reading',
   instruction:'Read the passage aloud twice in your normal voice, keeping words clear and pausing at each slash.',
   phrases:['Thanks for joining today / let’s look at our plan.','The first task is finished / the next one starts tomorrow.','We have time for questions / then we can agree on the next step.'],
   tip:'Read the three lines as one short talk. Use the pauses to avoid rushing, and restart a line if you need to.'},
  transfer:{title:'Bring it into conversation', short:'Everyday speaking',
   instruction:'Now speak in your own words for about a minute, with a pause between ideas. Here is a prompt if you would like one.',
   tip:'Let your lips and tongue move naturally; you do not need exaggerated movements in conversation. Nobody is listening and nothing is recorded.'},
  fun:{title:'Give it some personality', short:'Fun finish',
   instruction:'Say the line three times: first friendly, then excited, then confident.',
   quote:'Let’s give it a go!', tones:['Friendly','Excited','Confident'],
   tip:'Use your usual volume. Change your tone and expression rather than how loudly you speak.'}
 },
 phraseSets: [
  ['A bright blue morning.','Take a little time.','Pack the paper bag.','Keep the conversation going.'],
  ['Bring the blue notebook.','Let me finish that thought.','The next step is simple.','Thanks for making the time.'],
  ['Please pass the plan.','Tell me what you think.','Keep the key points clear.','Let’s take this one step further.'],
  ['Put the point into words.','Today we can try again.','Give the group an update.','Pause before the next idea.']
 ],
 emphasisSets: [
  {lines:['We can start today.','We can start today.','We can start today.'], words:['We','start','today']},
  {lines:['I said that yesterday.','I said that yesterday.','I said that yesterday.'], words:['I','said','yesterday']}
 ]
};

const packs = {en: EN};
const meta = Object.fromEntries(LANGUAGES.map(l => [l.code, l]));

async function load(code){
 if (packs[code]) return packs[code];
 if (!meta[code]) throw new Error('unknown language');
 const res = await fetch(`lang/${code}.json`, {cache:'no-cache'});
 if (!res.ok) throw new Error('language fetch failed');
 const pack = await res.json();
 /* Anything a pack leaves out falls back to English rather than going blank. */
 packs[code] = {
  ui:          {...EN.ui, ...(pack.ui || {})},
  contexts:    merge(EN.contexts, pack.contexts),
  steps:       merge(EN.steps, pack.steps),
  phraseSets:  pack.phraseSets  || EN.phraseSets,
  emphasisSets:pack.emphasisSets|| EN.emphasisSets
 };
 return packs[code];
}

function merge(base, over){
 const out = {};
 for (const key of Object.keys(base)) out[key] = {...base[key], ...((over && over[key]) || {})};
 return out;
}

window.SpeechContent = {LANGUAGES, SHAPE, ROUTES, ART_LABELS, meta, load, english: EN};
})();

'use strict';
(() => {
const $ = id => document.getElementById(id);
const track = (name, properties) => window.voiceTrack?.(name, properties);
const KEY = 'voiceOn.clarity.v1';
const read = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
const stored = read(KEY);
const state = {minutes: [5,8,12].includes(stored.minutes) ? stored.minutes : 5, intent: ['everyday','meeting','presentation'].includes(stored.intent) ? stored.intent : 'meeting', goal: [3,5,7].includes(stored.goal) ? stored.goal : 3, reminderTime: /^\d{2}:\d{2}$/.test(stored.reminderTime||'') ? stored.reminderTime : '08:00', days: stored.days && typeof stored.days === 'object' ? stored.days : {}, session: stored.session || null};
const legacy = read('voiceOn.v1');
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
let storageWorks = true, interval = null, running = false, endAt = 0, wakeLock = null, lastTick = 0, lastCompleted = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageWorks = false; } };
const format = seconds => { const whole = Math.ceil(seconds); return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`; };
const choices = { everyday: 'I have something to share, and I can take my time saying it.', meeting: 'Here is the main update, and here is what we can do next.', presentation: 'Today I want to share one idea and explain why it matters.' };
const passages = [
 'The small bookshop opens at nine. By ten, the window is full of sunlight. A visitor puts a book on the counter and asks for a recommendation. The owner pauses, smiles, and picks a favourite from the shelf.',
 'At the market, the first stall sells bright red tomatoes. The next has fresh bread in paper bags. I stop for a moment, choose what I need, and ask the seller how their morning has been.',
 'A friend tells me about a new walking route. It starts by the park and follows the river. There is a small bridge halfway along. We decide to try it on Saturday, with time to stop for coffee.',
 'The best part of learning something new is the small surprise. A task that felt difficult starts to feel familiar. You try again, notice one useful detail, and take the next step at your own pace.',
 'The train slows down as it reaches the coast. Beyond the window, boats sit in the harbour. Someone points out a lighthouse on the hill. For a moment, the whole carriage turns to look.'
];
const daySeed = key => Math.floor(Date.parse(key+'T12:00:00Z')/86400000);
function steps(session) {
 const durations = {5:[20,36,48,48,72,56,20],6:[30,48,60,60,90,42,30],8:[30,60,90,90,120,60,30],12:[30,96,150,150,174,90,30]}[session.minutes];
 const cue = choices[session.intent];
 const phraseSets=[
 ['A bright blue morning.','Take a little time.','Pack the paper bag.','Keep the conversation going.'],
 ['Bring the blue notebook.','Let me finish that thought.','The next step is simple.','Thanks for making the time.'],
 ['Please pass the plan.','Tell me what you think.','Keep the key points clear.','Let’s take this one step further.'],
 ['Put the point into words.','Today we can try again.','Give the group an update.','Pause before the next idea.']
 ];
 const focus=[
 'First, notice how speaking feels.',
 'Now let’s work on an easy breath.',
 'Now work on lip and tongue movements.',
 'Now keep whole phrases clear and natural.',
 'Now let’s work on pauses and flow.',
 'Now try it without a script.',
 'Now compare with your starting sentence.'
 ];
 return [
 {title:'Say this aloud.',short:'Your starting sentence',phase:'01 / CHECK IN',instruction:'Speak as you normally would. Repeat this sentence at the end.',label:'YOUR BEFORE & AFTER SENTENCE',quote:cue,tip:'You don’t need to sound a certain way. Simply notice your pace and how much effort speaking takes.'},
 {title:'Breathe slowly.',short:'Breathe easy',phase:'02 / WARM UP',instruction:'Follow the circle: in for 4, out for 8. Stay comfortable.',breath:true,tip:'Return to your normal breathing whenever you need to. Shorten the out-breath if eight counts feels too long; never force or hold your breath.'},
 {title:'Make each sound clear.',short:'Exaggerate, then ease off',phase:'03 / WARM UP',instruction:'Move your lips and tongue deliberately as you speak, then naturally. Three rounds.',label:'3 ROUNDS · EXAGGERATED → NATURAL',phrases:['oo — ee → you and me','pa — ba → paper bag','ta — da → today','ka — ga → keep going'],tip:'Exaggerate the shape of the spoken sounds, not the force. Make the lip rounding and tongue movements a little more deliberate. Then say the words naturally. Stop if it hurts or feels strained.'},
 {title:'Clear first. Then natural.',short:'Make each word clear',phase:'04 / FIND YOUR FLOW',instruction:'Exaggerate the sounds slightly, then say it naturally. Two rounds.',label:'2 ROUNDS · CLEAR FIRST, THEN NATURAL',phrases:phraseSets[daySeed(session.date)%phraseSets.length],tip:'Think of speaking to someone who missed a word: clearer and more deliberate, not louder or harder. Keep the exaggerated version comfortable, then reduce the effort on the natural version.'},
 {title:'Read. Pause. Repeat.',short:'Read with room',phase:'05 / FIND YOUR FLOW',instruction:'Read clearly. Pause at the full stop. Repeat the passage naturally.',label:'2 READS · EXAGGERATED → CONVERSATIONAL',quote:passages[daySeed(session.date)%passages.length],tip:'On the second read, imagine talking to one person. Keep only as much exaggeration as helps the words stay clear. Repeat the pair of reads if you have time.'},
 {title:'Say your own update.',short:'Try a real conversation',phase:'06 / TAKE IT WITH YOU',instruction:{everyday:'Say two sentences about your day. Pause between ideas.',meeting:'Say what happened and what comes next. Pause between ideas.',presentation:'Introduce your idea. Give one example. Say why it matters.'}[session.intent],label:'NO SCRIPT NEEDED',quote:{everyday:'“One thing I’m looking forward to is…”',meeting:'“The main update is…”',presentation:'“The idea I’d like to share is…”'}[session.intent],tip:'If you lose your place, pause and start with a simple sentence. It is fine to repeat an idea or use different words.'},
 {title:'Say it once more.',short:'Notice the difference',phase:'07 / CHECK OUT',instruction:'Repeat your first sentence. Notice your pace and effort.',label:'YOUR BEFORE & AFTER SENTENCE',quote:cue,tip:'This is your own impression, not a test or a clinical measurement. Some days feel different from others.'}
 ].map((step,i) => ({...step,
 title:['Your starting point','Easy breathing','Lips & tongue','Clear phrases','Speaking rhythm','Your conversation','Your before & after'][i],
 instruction:[
 'Read this aloud now, then again at the end to compare how clear and easy your speech feels.',
 'Breathe in for 4 counts and out for 8, comfortably, to settle your breathing before speaking.',
 'Repeat every line twice with bigger, comfortable lip and tongue movements to practice making distinct sounds.',
 'Say all four phrases twice with slightly exaggerated mouth movements to practice clear words in a sentence.',
 'Read this aloud twice, pausing at each full stop to practice a steady speaking pace.',
 ({meeting:'Give a short meeting update',everyday:'Say two sentences about your day',presentation:'Introduce your idea and give an example'}[session.intent])+', pausing between ideas to practice clear speech in conversation.',
 'Read the same sentence again in your normal speaking style and notice any change in clarity or effort.'
 ][i],seconds:durations[i], focus:focus[i]}));
}
function validSession(s) {return s && s.version===1 && [5,6,8,12].includes(s.minutes) && Object.hasOwn(choices,s.intent) && typeof s.date==='string' && Number.isInteger(s.index) && s.index>=0 && s.index<7 && Number.isFinite(s.remaining) && s.remaining>=0 && s.remaining<=180;}
if (!validSession(state.session)) state.session = null;
function show(screen) {document.body.classList.toggle('practicing',screen==='player');['home','player','done'].forEach(id => $(id).hidden = id!==screen); document.querySelector('footer').hidden = screen==='player'; window.scrollTo(0,0);}
function completed(key) {return !!state.days[key]?.complete || !!legacy.days?.[key]?.complete || (Array.isArray(legacy.days?.[key]?.done) && legacy.days[key].done.length>=5);}
function habitStats(){
 const keys=[...new Set([...Object.keys(legacy.days||{}),...Object.keys(state.days)])].filter(key=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&completed(key)).sort();
 let best=0,run=0,last=null;
 for(const key of keys){const day=daySeed(key);run=last!==null&&day===last+1?run+1:1;best=Math.max(best,run);last=day;}
 let current=0,date=new Date();if(!completed(dateKey(date)))date.setDate(date.getDate()-1);
 while(completed(dateKey(date))){current++;date.setDate(date.getDate()-1);}
 return {current,best};
}
function renderHome() {
 document.querySelectorAll('[data-minutes]').forEach(button => button.setAttribute('aria-pressed',Number(button.dataset.minutes)===(state.session?.minutes||state.minutes)));
 document.querySelectorAll('[data-intent]').forEach(button => button.setAttribute('aria-pressed',button.dataset.intent===(state.session?.intent||state.intent)));
 const duration=state.session?.minutes||state.minutes;
 $('start').replaceChildren();
 const word=document.createElement('strong');word.textContent=state.session?'RESUME':'GO';
 const label=document.createElement('span');label.textContent=state.session?('Step '+(state.session.index+1)+' of 7 →'):('Start '+duration+'-minute warm-up →');
 $('start').append(word,label);$('start').setAttribute('aria-label',state.session?'Resume saved practice':('Start '+duration+'-minute speech warm-up'));
 $('start-heading').textContent=state.session?'PICK UP WHERE YOU LEFT OFF.':duration===5?'FIVE MINUTES. START HERE.':('YOUR '+duration+'-MINUTE WARM-UP.');
 document.querySelectorAll('[data-minutes],[data-intent]').forEach(button=>button.disabled=!!state.session);
 $('resume').hidden = !state.session; $('restart').hidden = !state.session;
 if(state.session) $('resume').textContent=`Your place and timer are saved.`;
 $('week').replaceChildren(); let count=0;
 for(let i=6;i>=0;i--){const date = new Date(); date.setDate(date.getDate()-i); const key=dateKey(date), done=completed(key); if(done) count++;
 const day=document.createElement('div'); day.className=`day ${i===0?'today':''} ${done?'complete':''}`; day.setAttribute('aria-label',`${date.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}: ${done?'practiced':'not practiced'}`);
 const weekday=document.createElement('span'); weekday.textContent=date.toLocaleDateString(undefined,{weekday:'short'}).slice(0,1);const circle=document.createElement('b');circle.textContent=done?'✓':i===0?'·':'–';day.append(weekday,circle);$('week').append(day);}
 const stats=habitStats(); $('current-streak').textContent=stats.current; $('best-streak').textContent=stats.best; $('weekly-goal').value=state.goal; $('goal-progress').max=state.goal; $('goal-progress').value=Math.min(count,state.goal); $('goal-progress').setAttribute('aria-label',`${count} of ${state.goal} practice days in the last seven days`); $('goal-copy').textContent=count>=state.goal?'Your weekly goal is met. Anything extra is yours to enjoy.':`${count} of ${state.goal} practice days in the last 7 days.`;
 $('habit-title').textContent=count ? `${count} ${count===1?'day':'days'} of practice this week. Keep making room.` : 'Your first practice is a good start.';
 $('habit-copy').textContent=completed(dateKey()) ? 'Today is in the books. Come back tomorrow for a fresh passage.' : 'No catching up. Just a little time for yourself today.';
}
function start(fresh=false) {
 const resuming=!fresh&&!!state.session; if(fresh&&state.session)track('session_exit',{step:state.session.index+1,minutes:state.session.minutes});
 if(fresh || !state.session) state.session={version:1,date:dateKey(),minutes:state.minutes,intent:state.intent,index:0,remaining:state.minutes===5?20:30,elapsed:0,started:false,practiced:[]};
 track(resuming?'session_resume':'session_start',{minutes:state.session.minutes,step:state.session.index+1}); save(); show('player'); renderStep();
}
function stop() { clearInterval(interval); interval=null; running=false; if('speechSynthesis' in window) speechSynthesis.cancel(); release(); }
async function hold() {if(!navigator.wakeLock || document.visibilityState!=='visible')return;try{const lock=await navigator.wakeLock.request('screen');if(!running){await lock.release();return;}wakeLock=lock;}catch{}}
function release(){if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;}}
function renderStep() {
 stop(); const session=state.session, list=steps(session), step=list[session.index];
 const percent=Math.round(session.index/7*100);
 $('step-count').textContent=`${session.index+1} of 7 · ${percent}% complete`;
 $('session-percent').textContent=`${percent}% complete`;
 $('progress').replaceChildren();$('journey').replaceChildren();
 list.forEach((item,i)=>{const segment=document.createElement('span');segment.className=i<session.index?'complete':i===session.index?'current':'';$('progress').append(segment);const li=document.createElement('li');if(i===session.index)li.setAttribute('aria-current','step');const n=document.createElement('span');n.textContent=i<session.index?'✓':i+1;li.append(n,document.createTextNode(item.short));$('journey').append(li);});
 $('phase').textContent=step.phase; $('exercise-title').textContent=step.title; $('instruction').textContent=step.instruction;
 renderMaterial();
 $('back').disabled=session.index===0; $('next').textContent=session.index===6?'Finish →':'Next exercise →'; $('next-up').textContent=session.index<6?`Up next: ${list[session.index+1].short}`:'Next: your personal check-in';
 $('next').disabled=false;
 $('listen').disabled=!('speechSynthesis' in window);$('listen').setAttribute('aria-pressed','false'); updateTimer();
 $('play').textContent=session.remaining<=0?(session.index===6?'Finish →':'Next exercise →'):session.started?'Resume':'Start timer';
 updateControls();
 $('timer-state').textContent=session.remaining<=0?'Exercise complete.':session.started?'Paused. Tap Resume when you’re ready.':'';
 window.scrollTo(0,0); $('exercise-title').focus({preventScroll:true});
}
function renderMaterial(){
 const session=state.session,step=steps(session)[session.index];
 $('material').replaceChildren();
 if(step.breath){const visual=document.createElement('div');visual.className='breathing';visual.innerHTML='<div class="breath-circle" aria-hidden="true"></div><span class="breath-label">Breathe easy</span>';$('material').append(visual);return;}
 const material=document.createElement('div');material.className='material';
 if(session.index===2){
 const demo=document.createElement('div');demo.className='mouth-demo';demo.setAttribute('role','img');demo.setAttribute('aria-label','Lip shape guide: rounded lips for oo, spread lips for ee.');
 demo.innerHTML='<svg viewBox="0 0 200 70" aria-hidden="true"><ellipse class="mouth-shape" cx="100" cy="28" rx="18" ry="22" fill="#172f50" stroke="#5386ce" stroke-width="7"/></svg><span>oo → ee</span>';
 material.append(demo);
 }
 if(step.phrases){const list=document.createElement('ul');list.className='all-phrases';step.phrases.forEach(phrase=>{const item=document.createElement('li');item.textContent=phrase;list.append(item);});material.append(list);}
 else {const text=document.createElement('blockquote');text.id='card-text';text.textContent=step.quote;material.append(text);if(session.index===4)material.classList.add('reading-material');}
 $('material').append(material);
}
function updateControls(){
 const session=state.session,finished=session.remaining<=0;
 $('play').classList.toggle('primary',finished);$('play').classList.toggle('quiet',!finished);
 $('next').hidden=finished;
 $('control-hint').textContent=steps(session)[session.index].focus;
}
function updateTimer(){const session=state.session; $('timer').textContent=format(session.remaining);if(session.index===1){const elapsed=steps(session)[1].seconds-session.remaining, phase=elapsed%12;const circle=document.querySelector('.breath-circle'),label=document.querySelector('.breath-label'); if(circle)circle.style.setProperty('--breath-scale',String(phase<4?.75+phase/4*.4:1.15-(phase-4)/8*.4));if(label)label.textContent=session.started?(phase<4?'Breathe in · 4':'Breathe out · 8'):'Breathe easy';}}
function syncTime(){if(!running || !state.session)return;const now=Date.now();state.session.elapsed=(state.session.elapsed||0)+Math.max(0,Math.min((now-lastTick)/1000,state.session.remaining));lastTick=now;state.session.remaining=Math.max(0,(endAt-now)/1000);updateTimer();}
function pause(){syncTime();stop();save();$('play').textContent='Resume';$('timer-state').textContent='Paused. Tap Resume when you’re ready.';}
function toggle(){if(running){pause();return;}const session=state.session;if(session.remaining<=0){advance();return;}if('speechSynthesis' in window)speechSynthesis.cancel();session.started=true;$('next').disabled=false;updateControls();running=true;endAt=Date.now()+session.remaining*1000;lastTick=Date.now();$('play').textContent='Pause';$('timer-state').textContent='Speak out loud.';hold();save();interval=setInterval(()=>{syncTime();save();if(session.remaining<=0){stop();$('play').textContent=session.index===6?'Finish →':'Next exercise →';$('timer-state').textContent='Exercise complete.';updateControls();save();}},200);}
function advance(){syncTime();stop();if(!Array.isArray(state.session.practiced))state.session.practiced=[];if(state.session.started&&!state.session.practiced.includes(state.session.index))state.session.practiced.push(state.session.index);track(state.session.started?'exercise_complete':'exercise_skip',{step:state.session.index+1,minutes:state.session.minutes,finished_early:state.session.remaining>0});if(state.session.index===6){finish();return;}state.session.index++;state.session.card=0;state.session.remaining=steps(state.session)[state.session.index].seconds;state.session.started=false;save();renderStep();}
function finish(){const session=state.session;track((session.practiced||[]).length?'session_complete':'session_browse',{minutes:session.minutes,elapsed_seconds:Math.round(session.elapsed||0)}); const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);$('tomorrow-preview').textContent='A fresh reading prompt is waiting: “'+passages[daySeed(dateKey(tomorrow))%passages.length].split('. ')[0]+'.”';lastCompleted=dateKey(); const practiced=(session.practiced||[]).length, previous=state.days[lastCompleted]||{};if(practiced>0)state.days[lastCompleted]={...previous,complete:true,minutes:session.minutes,elapsed:Math.round(session.elapsed||0),count:(previous.count||0)+1};state.session=null;save();show('done');$('done-summary').textContent=practiced===7?'Seven exercises. Today’s practice saved.':practiced>0?('You practiced '+practiced+' of 7 exercises. Every little bit counts.'):'Practiced out loud? Save it below.'; $('done').querySelector('h1').innerHTML=practiced>0?'Practice <em>done.</em>':'All <em>explored.</em>'; $('save-untimed').hidden=practiced>0; document.querySelector('.reflection').hidden=practiced===0;renderFeeling();$('share-status').textContent='';$('done').querySelector('h1').setAttribute('tabindex','-1');$('done').querySelector('h1').focus({preventScroll:true});}
function renderFeeling(){const feeling=state.days[lastCompleted]?.feeling;document.querySelectorAll('[data-feeling]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.feeling===feeling));$('feedback').textContent=({easier:'Use the same tip in your meeting.',same:'That’s useful to notice. Keep it comfortable.',harder:'Take a break. Keep your next conversation comfortable.'})[feeling]||'Optional. Just your own impression.';}
function exit(){if(running)syncTime();stop();track('session_exit',{step:state.session.index+1,minutes:state.session.minutes,elapsed_seconds:Math.round(state.session.elapsed||0)});save();show('home');renderHome();if(!storageWorks){$('resume').hidden=false;$('resume').textContent='Browser storage is unavailable. You can resume while this page stays open.';}$('start').focus({preventScroll:true});}
function info(title,html){$('info-title').textContent=title;$('info-body').innerHTML=html;$('info').showModal();}
$('exercise-tip').onclick=()=>{const step=steps(state.session)[state.session.index];if(running)pause();info('How to do this exercise','');const instruction=document.createElement('p');instruction.textContent=step.instruction;const tip=document.createElement('p');tip.textContent=step.tip;$('info-body').append(instruction,tip);};
$('open-habits').onclick=()=>$('habits').showModal();$('close-habits').onclick=()=>$('habits').close();
$('help').onclick=()=>info('GO. Speak. Repeat.','<ol><li>Tap GO for a five-minute meeting warm-up.</li><li>Say the words out loud. Follow the short instruction.</li><li>Tap Next exercise when you’re ready. The timer is optional.</li></ol><p>Choose a longer routine under Change time or occasion. Reading and breaks add to the exercise time.</p>');
$('about').onclick=()=>info('Practice for clearer speech.','<p>Voice On is a free speech warm-up for practicing clear sounds, steady pacing, and natural speech. Spoken exercises coordinate lip and tongue movements with breath and voice. It doesn’t assess speech, guarantee instant improvement, or replace speech and language therapy.</p><p>Your practice history, preferences, and session progress stay in this browser. No account, microphone, or voice recording. When enabled on the published site, Vercel Web Analytics collects traffic statistics. Optional interaction events contain only exercise numbers, duration, and button actions; your prompts and reflections are never included. Clearing browser storage removes your progress. Fonts load from Google Fonts; the app can fall back to local fonts.</p><h3>Why these exercises?</h3><p>Deliberately clearer articulation, pacing, and practicing real speech are techniques used in speech therapy. This app uses exaggerated-to-natural repetitions to practice those skills. The breathing step is a preparation activity, not a claim to strengthen speech muscles.</p><p>These general exercises and the 5–12 minute routine have not been clinically validated. Techniques for diagnosed speech disorders need individual assessment; this routine is not a treatment for stuttering or muscle weakness.</p><p>Sources: <a href="https://www.asha.org/practice-portal/clinical-topics/dysarthria-in-adults/" target="_blank" rel="noopener">ASHA: clear speech and articulation</a>; <a href="https://www.nidcd.nih.gov/health/stuttering" target="_blank" rel="noopener">NIDCD: speech coordination and stuttering</a>.</p><p>The original fluency routine is still available, with its existing history and settings.</p>');
$('close-info').onclick=()=>$('info').close();
$('start').onclick=()=>start();$('restart').onclick=()=>{state.session=null;save();renderHome();$('session-options').open=true;document.querySelector('[data-minutes]').focus();};
$('play').onclick=toggle;$('next').onclick=advance;$('exit').onclick=exit;
$('back').onclick=()=>{if(state.session.index===0)return;stop();state.session.index--;state.session.card=0;state.session.remaining=steps(state.session)[state.session.index].seconds;state.session.started=false;save();renderStep();};
$('listen').onclick=()=>{if(!('speechSynthesis' in window))return;if(running)pause();speechSynthesis.cancel();const step=steps(state.session)[state.session.index],speech=new SpeechSynthesisUtterance(`${step.title} ${step.instruction}`);speech.lang='en-US';speech.rate=.9;$('listen').setAttribute('aria-pressed','true');speech.onend=speech.onerror=()=>$('listen').setAttribute('aria-pressed','false');speechSynthesis.speak(speech);};
$('save-untimed').onclick=()=>{const key=dateKey(),previous=state.days[key]||{};state.days[key]={...previous,complete:true,count:(previous.count||0)+1};lastCompleted=key;save();track('practice_confirm');$('save-untimed').hidden=true;$('done-summary').textContent='Today’s practice is saved.';$('done').querySelector('h1').innerHTML='Practice <em>done.</em>';document.querySelector('.reflection').hidden=false;renderFeeling();};
$('home-button').onclick=()=>{show('home');renderHome();$('start').focus({preventScroll:true});};
$('share').onclick=async()=>{track('share_click');const url=new URL('./',location.href).href;try{if(navigator.share){await navigator.share({title:'Voice On',text:'Get your lips, tongue, and voice ready to speak. Try this free speech warm-up.',url});$('share-status').textContent='Thanks for passing it on.';}else{await navigator.clipboard.writeText(url);$('share-status').textContent='Link copied. Share it with someone who could use a little warm-up.';}}catch(error){if(error.name!=='AbortError'){$('share-status').textContent=`Share this link: ${url}`;}}};
for(const button of document.querySelectorAll('[data-minutes]'))button.onclick=()=>{state.minutes=Number(button.dataset.minutes);save();renderHome();};
for(const button of document.querySelectorAll('[data-intent]'))button.onclick=()=>{state.intent=button.dataset.intent;save();renderHome();};
for(const button of document.querySelectorAll('[data-feeling]'))button.onclick=()=>{state.days[lastCompleted].feeling=button.dataset.feeling;save();renderFeeling();};
document.addEventListener('keydown',event=>{if($('player').hidden||$('info').open||$('reminder-dialog').open||event.target.closest('button,a,summary,input,textarea,select'))return;if(event.code==='Space'){event.preventDefault();toggle();}else if(event.key==='ArrowRight'){event.preventDefault();advance();}else if(event.key==='ArrowLeft'){$('back').click();}else if(event.key==='Escape')exit();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)pause();});window.addEventListener('pagehide',()=>{if(running)syncTime();stop();save();});
let shownDay=dateKey();setInterval(()=>{if(dateKey()!==shownDay){shownDay=dateKey();if(!$('home').hidden)renderHome();}},30000);
$('weekly-goal').onchange=event=>{state.goal=Number(event.target.value);track('weekly_goal_change',{goal:state.goal});save();renderHome();};
function openReminder(){ $('reminder-time').value=state.reminderTime; $('reminder-status').textContent=''; $('reminder-dialog').showModal(); }
$('reminder').onclick=$('done-reminder').onclick=openReminder;
$('close-reminder').onclick=()=>$('reminder-dialog').close();
$('download-reminder').onclick=()=>{
 const input=$('reminder-time');if(!input.reportValidity())return;state.reminderTime=input.value;save();
 const date=new Date(),[hour,minute]=input.value.split(':').map(Number);date.setHours(hour,minute,0,0);if(date.getTime()<=Date.now())date.setDate(date.getDate()+1);
 const stamp=dateKey(date).replaceAll('-','')+'T'+input.value.replace(':','')+'00';
 const escapeICS=value=>value.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const url=new URL('./',location.href).href;
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Voice On//Daily Practice//EN','BEGIN:VEVENT','UID:voice-on-daily-practice@voice-on.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp,'DURATION:PT'+state.minutes+'M','RRULE:FREQ=DAILY','SUMMARY:Practice clear, natural speech','DESCRIPTION:'+escapeICS('Practice clear sounds and a steady pace. Open '+url),'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:Time for your speech warm-up','END:VALARM','END:VEVENT','END:VCALENDAR'];
 const blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}), objectURL=URL.createObjectURL(blob),link=document.createElement('a');link.href=objectURL;link.download='voice-on-daily-reminder.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),1000);
 track('reminder_download',{minutes:state.minutes});$('reminder-status').textContent='Downloaded. Open the file in your calendar and confirm the import to activate your reminder.';
};
renderHome();
if('serviceWorker'  in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();

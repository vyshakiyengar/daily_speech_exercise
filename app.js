'use strict';
(() => {
const $ = id => document.getElementById(id);
const track = (name, properties) => window.voiceTrack?.(name, properties);
const KEY = 'voiceOn.clarity.v1';
const read = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
const stored = read(KEY);
const state = {minutes: [5,8,12].includes(stored.minutes) ? stored.minutes : 5, intent: ['everyday','meeting','presentation'].includes(stored.intent) ? stored.intent : 'everyday', goal: [3,5,7].includes(stored.goal) ? stored.goal : 3, reminderTime: /^\d{2}:\d{2}$/.test(stored.reminderTime||'') ? stored.reminderTime : '08:00', days: stored.days && typeof stored.days === 'object' ? stored.days : {}, session: stored.session || null};
const legacy = read('voiceOn.v1');
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
let storageWorks = true, lastCompleted = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageWorks = false; } };
const choices = { everyday: 'I have something to share, and I can take my time saying it.', meeting: 'Here is the main update, and here is what we can do next.', presentation: 'Today I want to share one idea and explain why it matters.' };
const daySeed = key => Math.floor(Date.parse(key+'T12:00:00Z')/86400000);
function steps(session) {
 const cue = choices[session.intent];
 const phraseSets=[
 ['A bright blue morning.','Take a little time.','Pack the paper bag.','Keep the conversation going.'],
 ['Bring the blue notebook.','Let me finish that thought.','The next step is simple.','Thanks for making the time.'],
 ['Please pass the plan.','Tell me what you think.','Keep the key points clear.','Let’s take this one step further.'],
 ['Put the point into words.','Today we can try again.','Give the group an update.','Pause before the next idea.']
 ];
 const rounds=session.minutes>=12?4:session.minutes>=8?3:2;
 return [
 {title:'Massage around your mouth and jaw',short:'Cheek massage',instruction:'Gently massage around your mouth and jaw with clean fingertips.',quote:'',tip:'Keep your teeth apart and touch only the outside of your cheeks. Avoid sore, swollen, injured, or recently treated areas; skip this if uncomfortable. This is a relaxation activity, not muscle strengthening.'},
 {title:'Make motorboat lips',short:'Motorboat lips',instruction:'Keep your lips loose and blow out gently to make “brrrr” for about 15 seconds in total, taking breaths whenever needed.',quote:'Brrrr…',tip:'Your lips should flutter, not squeeze together. Stop before you run out of breath; skip if it feels difficult, dizzy, painful, or strained. There is no need to do 15 seconds in one breath.'},
 {title:'Exaggerate every sound and word',short:'Sounds → words',instruction:'Say the sounds on the left, then the words on the right, with big, comfortable mouth movements; read each row '+rounds+' times.',pairs:[['oo · ee','you · me'],['pa · ba','paper · bag'],['ta · da','today · day'],['ka · ga','keep · going']],tip:'Say every item aloud. For example: oo, ee, you, me. Clearly exaggerate your lip and tongue movements without pushing or straining.'},
 {title:'Exaggerate every sentence',short:'Sentences',instruction:'Read every sentence aloud twice with exaggerated mouth movements.',phrases:phraseSets[daySeed(session.date)%phraseSets.length],tip:'Use big but comfortable movements, not extra loudness. '+(rounds>2?'For this longer routine, repeat the whole set '+(rounds-1)+' times.':'Read the list twice with big, comfortable mouth movements.')},
 {title:'Say it in your own words',short:'Your conversation',instruction:'Say '+(rounds===2?'two':rounds===3?'four':'six')+' sentences about your day, pausing after each sentence.',quote:'“One thing that happened today…”',tip:'Speak normally and keep the words clear; start again whenever you need to.'},
 {title:'Give it some personality',short:'Fun finish',instruction:'Say “Let’s give it a go!” three times: first friendly, then excited, then confident.',phrases:['Friendly 🙂','Excited ✨','Confident 💬'],tip:'Use your usual volume. Change your tone and expression, not how loudly you speak; this is a playful way to practice expression.'}
 ];
}
function validSession(s) {return s && s.version===2 && [5,6,8,12].includes(s.minutes) && Object.hasOwn(choices,s.intent) && typeof s.date==='string' && Number.isInteger(s.index) && s.index>=0 && s.index<6;}
if(state.session?.version===1){state.session.version=2;state.session.index=Math.min(5,Math.max(0,state.session.index-1));}
if (!validSession(state.session)) state.session = null;
function show(screen) {document.querySelector('.site-header').inert=screen==='player';document.body.classList.toggle('practicing',screen==='player');['home','player','done'].forEach(id => $(id).hidden = id!==screen); document.querySelector('footer').hidden = screen==='player'; window.scrollTo(0,0);}
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
 const label=document.createElement('span');label.textContent=state.session?('Step '+(state.session.index+1)+' of 6 →'):('Start ~'+duration+'-minute warm-up →');
 $('start').append(word,label);$('start').setAttribute('aria-label',state.session?'Resume saved practice':('Start '+duration+'-minute speech warm-up'));
 $('start-heading').textContent=state.session?'PICK UP WHERE YOU LEFT OFF.':duration===5?'FIVE MINUTES. START HERE.':('YOUR '+duration+'-MINUTE WARM-UP.');
 document.querySelectorAll('[data-minutes],[data-intent]').forEach(button=>button.disabled=!!state.session);
 $('resume').hidden = !state.session; $('restart').hidden = !state.session;
 if(state.session) $('resume').textContent='' ;
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
 if(fresh || !state.session) state.session={version:2,date:dateKey(),minutes:state.minutes,intent:state.intent,index:0};
 track(resuming?'session_resume':'session_start',{minutes:state.session.minutes,step:state.session.index+1}); save(); show('player'); renderStep();
}
function stop(){if('speechSynthesis' in window)speechSynthesis.cancel();}
function renderStep() {
 stop(); const session=state.session, list=steps(session), step=list[session.index];
 const percent=Math.round(session.index/6*100);
 $('step-count').textContent=`${session.index+1} of 6 · ${percent}% complete`;
 $('session-percent').textContent=`${percent}% complete`;
 $('progress').setAttribute('role','progressbar');$('progress').setAttribute('aria-valuemin','0');$('progress').setAttribute('aria-valuemax','100');$('progress').setAttribute('aria-valuenow',String(percent));$('progress').setAttribute('aria-valuetext',`${session.index} of 6 steps passed`);
 $('progress').replaceChildren();$('journey').replaceChildren();
 list.forEach((item,i)=>{const segment=document.createElement('span');segment.className=i<session.index?'complete':i===session.index?'current':'';$('progress').append(segment);const li=document.createElement('li');if(i===session.index)li.setAttribute('aria-current','step');const n=document.createElement('span');n.textContent=i<session.index?'✓':i+1;li.append(n,document.createTextNode(item.short));$('journey').append(li);});
 $('exercise-title').textContent=step.title; $('instruction').textContent=step.instruction;
 renderMaterial();
 $('back').disabled=session.index===0; $('next').textContent=session.index===5?'Finish →':'Next exercise →';
 $('next').disabled=false;
 $('listen').disabled=!('speechSynthesis' in window);$('listen').setAttribute('aria-pressed','false');
 window.scrollTo(0,0); $('exercise-title').focus({preventScroll:true});
}
function renderMaterial(){
 const session=state.session,step=steps(session)[session.index];
 $('material').replaceChildren();
 const material=document.createElement('div');material.className='material';
 const art=document.createElement('div');art.className='coach-art coach-'+session.index;art.setAttribute('role','img');
 art.setAttribute('aria-label',['Hands gently circling the cheeks and jaw','Loose lips fluttering as air flows outward','Mouth opening and widening','Mouth opening and widening','Speaker with a speech bubble','Speaker smiling with expressive eyebrows'][session.index]);
 const hands='<g class="massage-hand left-hand"><path d="M61 114v-27q0-7 5-7t5 7v9-17q0-6 5-6t5 6v17-12q0-6 5-6t5 6v22q0 17-15 22z"/></g><g class="massage-hand right-hand"><path d="M179 114v-27q0-7-5-7t-5 7v9-17q0-6-5-6t-5 6v17-12q0-6-5-6t-5 6v22q0 17 15 22z"/></g>';
 const mouth=session.index===1?'<g class="flutter-mouth"><path d="M99 93q10-10 21-3q11-7 21 3q-21 19-42 0" fill="#5185ca"/><path d="M101 94q19-4 38 0" stroke="#172f50" stroke-width="3"/></g><g class="air-trails" stroke="#6e9bd6" stroke-width="3"><path d="M165 79q15-5 25 0M169 94h28M165 109q15 5 25 0"/></g>':session.index===0?'<path d="M109 96q11 5 22 0" fill="none" stroke="#294b77" stroke-width="3" stroke-linecap="round"/>':'<ellipse class="coach-mouth" cx="120" cy="96" rx="14" ry="10" fill="#172f50" stroke="#6c93c5" stroke-width="3"/>';
 art.innerHTML='<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse cx="120" cy="147" rx="77" ry="8" fill="#dbe8fa"/><path d="M66 146q5-31 54-31t54 31" fill="#4479c0"/><rect x="108" y="107" width="24" height="26" rx="10" fill="#c7d9f2"/><ellipse cx="120" cy="68" rx="44" ry="52" fill="#e4edfa" stroke="#8eadcf" stroke-width="2"/><path d="M77 53q-6-43 44-43q45 0 43 43q-22-8-29-22q-22 22-58 22" fill="#244568"/><g class="coach-brows" stroke="#244568" stroke-width="3" stroke-linecap="round"><path d="M97 59h12M132 59h12"/></g><circle cx="104" cy="68" r="3" fill="#244568"/><circle cx="137" cy="68" r="3" fill="#244568"/><path d="M120 69v13h5" fill="none" stroke="#8eadcf" stroke-width="2"/>'+mouth+(session.index===0?hands:'')+(session.index>=4?'<path d="M174 24h45v27h-25l-10 9V51h-10z" fill="#d4e5fb" stroke="#7fa1cb"/><g fill="#4479c0"><circle cx="185" cy="38" r="2"/><circle cx="196" cy="38" r="2"/><circle cx="207" cy="38" r="2"/></g>':'')+'</svg>';
 material.append(art);
 if(step.pairs){const table=document.createElement('table');table.className='sound-words';table.innerHTML='<thead><tr><th>Sounds</th><th>Words</th></tr></thead>';const body=document.createElement('tbody');step.pairs.forEach(pair=>{const row=document.createElement('tr');pair.forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.append(cell);});body.append(row);});table.append(body);material.append(table);}
 else if(step.phrases){const list=document.createElement('ul');list.className='all-phrases';step.phrases.forEach(phrase=>{const item=document.createElement('li');if(step.emphasis){const word=step.emphasis[list.children.length],at=phrase.indexOf(word);item.append(document.createTextNode(phrase.slice(0,at)));const strong=document.createElement('strong');strong.textContent=word;item.append(strong,document.createTextNode(phrase.slice(at+word.length)));}else item.textContent=phrase;list.append(item);});material.append(list);}
 else {const text=document.createElement('blockquote');text.id='card-text';text.textContent=step.quote;if(step.quote)material.append(text);}
 $('material').append(material);
}
function advance(){stop();track('exercise_complete',{step:state.session.index+1,minutes:state.session.minutes});if(state.session.index===5){finish();return;}state.session.index++;save();renderStep();}
function finish(){
 const session=state.session;track('session_browse',{minutes:session.minutes,elapsed_seconds:Math.round(session.elapsed||0)});
 lastCompleted=dateKey();state.session=null;save();show('done');
 $('done-summary').textContent='Practiced out loud? Save today.';
 $('done').querySelector('h1').innerHTML='Take it <em>with you.</em>';
 $('save-untimed').hidden=false;$('home-button').className='quiet';
 document.querySelector('.reflection').hidden=true;renderFeeling();$('share-status').textContent='';
 $('done').querySelector('h1').setAttribute('tabindex','-1');$('done').querySelector('h1').focus({preventScroll:true});
}
function renderFeeling(){const feeling=state.days[lastCompleted]?.feeling;document.querySelectorAll('[data-feeling]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.feeling===feeling));$('feedback').textContent=({easier:'Use the same tip in your meeting.',same:'That’s useful to notice. Keep it comfortable.',harder:'Take a break. Keep your next conversation comfortable.'})[feeling]||'Your impression, not a measured score.';}
function exit(){stop();track('session_exit',{step:state.session.index+1,minutes:state.session.minutes,elapsed_seconds:Math.round(state.session.elapsed||0)});save();show('home');renderHome();if(!storageWorks){$('resume').hidden=false;$('resume').textContent='Browser storage is unavailable. You can resume while this page stays open.';}$('start').focus({preventScroll:true});}
function info(title,html){$('info-title').textContent=title;$('info-body').innerHTML=html;$('info').showModal();}
$('exercise-tip').onclick=()=>{const step=steps(state.session)[state.session.index];info('How to do this exercise','');const instruction=document.createElement('p');instruction.textContent=step.instruction;const tip=document.createElement('p');tip.textContent=step.tip;$('info-body').append(instruction,tip);};
$('open-habits').onclick=()=>$('habits').showModal();$('close-habits').onclick=()=>$('habits').close();
$('help').onclick=()=>$('how-it-works').scrollIntoView({behavior:'smooth'});
$('about').onclick=()=>info('Practice for clearer speech.','<p>Speech On is a free speech warm-up for practicing clear sounds, steady pacing, and natural speech. Spoken exercises coordinate lip and tongue movements with breath and voice. It doesn’t assess speech, guarantee instant improvement, or replace speech and language therapy.</p><p>Your practice history, preferences, and session progress stay in this browser. No account, microphone, or voice recording. When enabled on the published site, Vercel Web Analytics collects traffic statistics. Optional interaction events contain only exercise numbers, duration, and button actions; your prompts and reflections are never included. Clearing browser storage removes your progress. Fonts load from Google Fonts; the app can fall back to local fonts.</p><h3>Why these exercises?</h3><p>Deliberately clearer articulation, pacing, and practicing real speech are techniques used in speech therapy. This app uses deliberate speech repetitions and conversational practice. The gentle external cheek massage is for relaxation, and lip trills are a voice warm-up; neither is proven to improve articulation in this app. These are coordination and communication tasks, not muscle-strengthening exercises.</p><p>The cited guidance describes clinical techniques, primarily for people with diagnosed speech disorders; it does not validate this app for healthy speakers. These general exercises and the 5–12 minute routine have not been clinically validated. Techniques for diagnosed speech disorders need individual assessment; this routine is not a treatment for stuttering or muscle weakness.</p><p>Sources: <a href="https://www.asha.org/practice-portal/clinical-topics/dysarthria-in-adults/" target="_blank" rel="noopener">ASHA: clear speech and articulation</a>; <a href="https://www.nidcd.nih.gov/health/stuttering" target="_blank" rel="noopener">NIDCD: speech coordination and stuttering</a>; <a href="https://www.nidcd.nih.gov/health/taking-care-your-voice" target="_blank" rel="noopener">NIDCD: voice care</a>; <a href="https://www.cuh.nhs.uk/patient-information/lip-trills-exercises/" target="_blank" rel="noopener">NHS: lip trills</a>.</p><p>Practice at a comfortable volume; stop if speaking hurts or feels strained. Rest a hoarse or tired voice. For persistent speech or voice concerns, consult a qualified speech-language pathologist. Saved practice history from the original routine remains on this browser.</p>');
$('research-stamp').onclick=()=>$('about').click();
$('close-info').onclick=()=>$('info').close();
$('start').onclick=()=>start();$('restart').onclick=()=>{state.session=null;save();renderHome();document.querySelector('[data-minutes]').focus();};
$('next').onclick=advance;$('exit').onclick=exit;
$('back').onclick=()=>{if(state.session.index===0)return;stop();state.session.index--;save();renderStep();};
$('listen').onclick=()=>{if(!('speechSynthesis' in window))return;speechSynthesis.cancel();const step=steps(state.session)[state.session.index],speech=new SpeechSynthesisUtterance(`${step.title} ${step.instruction}`);speech.lang='en-US';speech.rate=.9;$('listen').setAttribute('aria-pressed','true');speech.onend=speech.onerror=()=>$('listen').setAttribute('aria-pressed','false');speechSynthesis.speak(speech);};
$('save-untimed').onclick=()=>{const key=dateKey(),previous=state.days[key]||{};state.days[key]={...previous,complete:true,count:(previous.count||0)+1};lastCompleted=key;save();track('practice_confirm');$('save-untimed').hidden=true;$('home-button').className='primary';$('done-summary').textContent=storageWorks?'Practice saved here. New phrases tomorrow.':'Practice complete. Browser storage is unavailable.';$('done').querySelector('h1').innerHTML='Practice <em>done.</em>';document.querySelector('.reflection').hidden=false;renderFeeling();};
$('home-button').onclick=()=>{show('home');renderHome();$('start').focus({preventScroll:true});};
$('share').onclick=async()=>{track('share_click');const url=new URL('./',location.href).href;try{if(navigator.share){await navigator.share({title:'Speech On',text:'Get your lips, tongue, and voice ready to speak. Try this free speech warm-up.',url});$('share-status').textContent='Thanks for passing it on.';}else{await navigator.clipboard.writeText(url);$('share-status').textContent='Link copied. Share it with someone who could use a little warm-up.';}}catch(error){if(error.name!=='AbortError'){$('share-status').textContent=`Share this link: ${url}`;}}};
for(const button of document.querySelectorAll('[data-minutes]'))button.onclick=()=>{state.minutes=Number(button.dataset.minutes);save();renderHome();};
for(const button of document.querySelectorAll('[data-intent]'))button.onclick=()=>{state.intent=button.dataset.intent;save();renderHome();};
for(const button of document.querySelectorAll('[data-feeling]'))button.onclick=()=>{state.days[lastCompleted].feeling=button.dataset.feeling;save();renderFeeling();};
document.addEventListener('keydown',event=>{if($('player').hidden||$('info').open||$('reminder-dialog').open||event.target.closest('button,a,summary,input,textarea,select'))return;if(event.key==='ArrowRight'){event.preventDefault();advance();}else if(event.key==='ArrowLeft'){$('back').click();}else if(event.key==='Escape')exit();});
window.addEventListener('pagehide',()=>{stop();save();});
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
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Speech On//Daily Practice//EN','BEGIN:VEVENT','UID:voice-on-daily-practice@voice-on.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp,'DURATION:PT'+state.minutes+'M','RRULE:FREQ=DAILY','SUMMARY:Practice clear, natural speech','DESCRIPTION:'+escapeICS('Practice clear sounds and a steady pace. Open '+url),'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:Time for your speech warm-up','END:VALARM','END:VEVENT','END:VCALENDAR'];
 const blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}), objectURL=URL.createObjectURL(blob),link=document.createElement('a');link.href=objectURL;link.download='speech-on-daily-reminder.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),1000);
 track('reminder_download',{minutes:state.minutes});$('reminder-status').textContent='Downloaded. Open the file in your calendar and confirm the import to activate your reminder.';
};
renderHome();
if('serviceWorker'  in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();

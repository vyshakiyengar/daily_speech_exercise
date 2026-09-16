(function(){
 var KEY='voiceOn.analyticsOptOut', box=document.getElementById('opt-out'), status=document.getElementById('opt-out-status');
 function read(){ try { return localStorage.getItem(KEY)==='1'; } catch(e){ return false; } }
 function msg(on){ status.textContent = on
   ? 'Off. Your visits are not counted. This is remembered in this browser.'
   : 'On. Anonymous page views are counted. Nothing identifies you.'; }
 try { box.checked = read(); } catch(e){}
 msg(box.checked);
 box.addEventListener('change', function(){
   try { box.checked ? localStorage.setItem(KEY,'1') : localStorage.removeItem(KEY); msg(box.checked); }
   catch(e){ status.textContent = 'Your browser is blocking storage, so this choice cannot be remembered here. Turning on Do Not Track or Global Privacy Control has the same effect.'; }
 });
})();

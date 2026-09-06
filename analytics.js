/* No personal content or persistent user identifier is included in custom events. */
(() => {
  const allowed = new Set(['session_start','session_resume','exercise_complete','session_exit','session_complete','share_click','reminder_download','weekly_goal_change']);
  const local = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) || location.protocol !== 'https:';
  // Enable only after confirming the Vercel project supports custom events (Pro/Enterprise).
  const customEvents = false;
  window.va = window.va || function(){(window.vaq = window.vaq || []).push(arguments);};
  window.va('beforeSend', event => ({...event,url:event.url ? event.url.split('?')[0].split('#')[0] : event.url}));
  window.voiceTrack = (name, properties = {}) => {
    if(!allowed.has(name)) return;
    const data = {};
    for(const key of ['minutes','step','elapsed_seconds','goal','finished_early']) {
      if(typeof properties[key] === 'number' || typeof properties[key] === 'boolean') data[key] = properties[key];
    }
    // A testable adapter boundary; no event queue or personal data is stored locally.
    window.dispatchEvent(new CustomEvent('voice:analytics', {detail:{name,data}}));
    if(!local && customEvents) window.va('event',{name,data});
  };
  if(!local && navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
    const script=document.createElement('script');script.defer=true;script.src='/_vercel/insights/script.js';document.head.append(script);
  }
})();

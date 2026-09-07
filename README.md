# Voice On

A free daily speech warm-up with 6, 8, and 12 minutes of active practice. Static HTML, CSS and JavaScript; no build step or runtime dependencies.

## Experience

Start without signing up. Choose a duration and a real-life context (everyday life, meeting, presentation). Seven guided steps move from a starting sentence through breathing, articulation, phrases, reading and unscripted speaking, then repeat the starting sentence. Reflection is self-reported; the app does not record or score speech or promise instant results.

Each timer starts only when the user is ready. Reading instructions and breaks add to the selected practice time. Users may move to the next step at any time, pause, return to the previous step, or save and exit. Backgrounding the app pauses it. Spoken cues use the browser's speech synthesis when available.

## Run locally

```sh
python3 -m http.server 8765
```

Open http://localhost:8765. Serve over HTTPS in production for the installable app, clipboard, sharing and screen wake lock capabilities. These features have fallbacks.

## Files and compatibility

- `index.html`: landing page and session screens
- `styles.css`: responsive layout, accessible focus states and reduced-motion support
- `app.js`: session engine, prompts, persistence and reflection
- `fluency.html`: preserved original fluency routine
- `sw.js`: versioned offline shell and network-first updates

New practice data uses `voiceOn.clarity.v1` in localStorage. Existing `voiceOn.v1` history and preferences remain untouched; completed legacy days are included in the new seven-day history display. An in-progress new session retains its original date, prompts, context, duration and remaining time, even if home preferences change. Completing a session credits its completion date.

No microphone, account, analytics, or backend. Google Fonts are optional; local font fallbacks keep the app functional offline. Speech synthesis availability depends on the device. Browser storage restrictions can prevent persistent progress.

## Deployment

Keep the existing Vercel static-site settings: no framework, build command, or output directory. Deploy the repository root. Increment the cache version in `sw.js` when updating the shell. Test a returning visitor as well as a fresh browser after deployment.

The original specialist routine is preserved for continuity. It has not been clinically reviewed as part of this interface redesign.

## Daily habit features

A three-, five-, or seven-day goal measures the last seven local calendar days. Current streaks include yesterday until today's practice is complete; best streaks include preserved legacy history. Repeat sessions on one date never add streak days. A daily calendar reminder downloads as an `.ics` file with local floating time; the user must import it and can edit or remove it in their calendar. Completion previews the next day's reading passage.

Progress saves automatically without sign-in on the same browser. Clearing site data removes progress. There is no cross-device sync or server-sent reminder.

## Analytics setup

`analytics.js` loads Vercel Web Analytics only on HTTPS public hosts, respecting Do Not Track and Global Privacy Control. It strips query strings and URL fragments before events are sent. Analytics endpoints bypass the offline service-worker cache. Local previews do not load the analytics script.

In Vercel, open this project → Analytics → Enable, then deploy. Pageviews and traffic insights become available once the production script is active. Web Analytics was enabled on the existing Hobby plan for this project on 2026-09-06. A deployment containing the analytics script must receive visits before data appears.

Detailed events are prepared but disabled by default because Vercel custom events require Pro or Enterprise. If your plan supports them, set `customEvents = true` in `analytics.js`, then deploy. Do not upgrade your plan just to launch this version.

Prepared event names: `session_start`, `session_resume`, `exercise_complete`, `session_exit`, `session_complete`, `share_click`, `reminder_download`, `weekly_goal_change`. Properties are restricted to numeric duration, step, elapsed seconds, goal, and a boolean for finishing an exercise early. No intent, names, prompts, voice, or reflection is sent. A `voice:analytics` CustomEvent exposes the same sanitized payload for automated tests or a future analytics adapter.

Use traffic → session starts → completions to assess the conversion funnel once custom events are enabled. Compare drop-off by exercise number and completion by selected duration. Button completion is self-reported, not proof of speech quality; tab closures are not guaranteed to emit an exit event.

References: https://vercel.com/docs/analytics/quickstart and https://vercel.com/docs/analytics/custom-events


## Blue palette and UX audit update

The app uses a blue palette, larger touch targets, sticky exercise controls, and plain-language instructions. Next is available without starting a timer. The timer is optional; at expiry only one Next action remains. A resumed session shows its actual saved choices; Choose a new session returns to selection. Small-phone layouts are checked down to 320 CSS pixels.

Browsing exercises alone does not earn a practice day. Users who practice without a timer can explicitly save their practice at the end. Exercise skip, session browse, and untimed practice confirmation have separate analytics event hooks. These event hooks remain disabled for Vercel Hobby.

The articulation and reading drills use deliberately exaggerated speech followed by natural speech, with comfortable effort and explicit repetitions. The About dialog links ASHA and NIDCD sources and distinguishes clinical techniques from validation of this particular routine. The 6–12 minute program is not clinically validated and is not a muscle-strengthening or stuttering treatment.

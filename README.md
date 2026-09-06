# Voice On

A guided 12-minute daily practice for speech fluency. One exercise at a time,
timed, auto-advancing, with visual demonstrations of the physical targets and
fresh reading material every day.

Built for adults who stutter, and useful to anyone who wants steadier speech
before interviews, presentations or calls.

Static site. No build step, no dependencies, no backend, no analytics.
`index.html` is the whole app.

## Using it

Press start. It walks you through fifteen steps and moves on by itself.

Every step shows **a count and a timer**: the count is the target, the timer is
how long you have. Finish early and start again until the timer runs out.

Turn on **spoken guidance** to have each step read aloud, which matters because
most of these are mouth exercises you should not be squinting at a screen to do.
The screen stays awake for the whole session.

Optionally enter a first name. Your own name is the single most commonly feared
word for people who stutter, so several drills use it.

## The session

Two lengths, same targets. **Eight minutes is the default.**

**The prime — 7 compound steps, 8 min.** Each step stacks things the long
version trains separately, and the last one is a sentence you are about to say
for real.

| # | Step | Time |
|---|------|------|
| 1 | Breathe, then sound — breath support and gentle onset together | 60s |
| 2 | Glide on a trill — lips, jaw, breath and continuous voicing at once | 45s |
| 3 | Onset ladder — 20 phrases, exaggerated then normal | 75s |
| 4 | Read it three ways — one text: linked, then light, then normal | 120s |
| 5 | Carry it into real speech — escalates one rung per week | 90s |
| 6 | Feared words, then voluntary stuttering | 60s |
| 7 | One real sentence you will actually say today | 30s |

**The full session — 15 steps, 12 min.** Isolates each target before combining
them: breath, articulators, then gentle onset / continuous phonation / light
contact one at a time, then a blend step, then load and anticipation work. The
better way in if any of it is still unfamiliar.

Step 5 is the only thing that changes over time, one rung per week: read aloud →
read and retell → cold monologue → monologue under pressure → real stakes.
Priming without escalating load never reaches the afternoon.

Reading passages, phrase sets and monologue prompts are picked by a date seed,
so the material is stable through the day and different tomorrow.

## Data

Everything is stored in `localStorage` in the browser: the practice log, the day
ratings, the scan list, your name, the preferences. Nothing is sent anywhere,
there is no account, and there is no tracking of any kind. Clearing site data
clears the log.

## Local

```
python3 -m http.server 8000
```

Then open <http://localhost:8000>. A plain `file://` open works too, but the
service worker and the installable-app behaviour need to be served over http.

## Deploying

Any static host. Point it at this directory, no build command, no output
directory. On Vercel or Netlify, importing the repo and hitting deploy is the
whole setup.

After a deploy, bump `CACHE` in `sw.js` so returning visitors pick up the new
version instead of the cached one.

## Not medical advice

A structured practice plan built on the standard adult-stuttering evidence base:
speech restructuring (Camperdown, smooth speech), Van Riper block modification,
and the fluency-inducing-conditions literature. It is not a clinical assessment
and it is not a substitute for a speech and language therapist.

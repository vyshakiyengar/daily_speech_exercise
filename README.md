# Speech On

A free guided speech warm-up at [speechon.app](https://www.speechon.app/). Open the link and practise. No account, no sign-up, no microphone, no backend, no build step, no runtime dependencies.

**Speech On is not a medical device and is not a treatment for any condition.** It is a general practice and wellbeing tool. See [`/terms`](https://www.speechon.app/terms), [`/safety`](https://www.speechon.app/safety) and [`/for-clinicians`](https://www.speechon.app/for-clinicians).

## What it does

Pick 5, 8, 12 minutes or the full sequence (~20 minutes, 18 exercises), pick an occasion, and work through guided exercises: settling the breath, relaxing the face, jaw and lip and tongue movement with speech attached, deliberate articulation, word endings, consonant clusters, rate control and pausing, prosodic emphasis, connected reading, and transfer into unscripted speech.

Every exercise carries a written caution. Every step is self-paced; an optional timer can be switched on in settings and measures nothing. The shorter routines are subsets of the same exercises.

The complete routine is readable without starting a session at [`/routine`](https://www.speechon.app/routine), which is generated from `content.js` so it cannot drift from the app.

### The daily three: Speak, Read, Think

The home page shows today's three practices and their streaks: a full-day streak (all three done), per-practice streaks, a month calendar, and two calendar files generated on the device (a repeating daily reminder for all three, and practised days as all-day events).

- **Read** ([`/read`](https://www.speechon.app/read)), about 10 minutes. One paragraph at a time: read, the text hides, explain it from memory, check against a model, note whether attention drifted and what got in the way, link it to the previous paragraph. Then three points from memory, three questions and two vocabulary words that return on a spaced schedule (1, 3, 7, 16, 35, 90 days). 286 original passages at three levels (dense, argument, clear), ordered dense first and mixed from day one; a "Hardest only" setting skips the clearer ones. "Use it on your own article" runs the same moves on pasted text, which never leaves the browser.
- **Think** ([`/think`](https://www.speechon.app/think)), about 10 minutes. An energy and sleep check-in, a 12-problem business-maths sprint generated across eight adaptive levels (percentages to EV/EBITDA and dilution, with earlier levels interleaved), one Fermi estimate with a worked chain, and "Say it in 60": a structured spoken answer, out loud, with a self-check. Not brain training: it practises the specific skills, and says why on the page.

Neither page assesses, diagnoses or treats ADHD, dyslexia or anything else, and both say so.

## Design commitments

- **No microphone.** There is no code that could record audio, and the site sends `Permissions-Policy: microphone=()` on every response.
- **No third-party requests.** Fonts are self-hosted. No CDN, no tag manager, no pixels, no cookies.
- **Nothing leaves the browser.** Practice history, preferences and the unfinished session live in one `localStorage` key. There is no server to send them to.
- **Analytics are optional and anonymous.** Vercel Web Analytics is cookieless, honours Do Not Track and Global Privacy Control automatically, and can be switched off on [`/privacy`](https://www.speechon.app/privacy).
- **Works offline** once loaded, including the reference pages.
- **No claims it cannot support.** The routine has not been clinically validated. The face massage and lip trill are labelled on screen as a settling step and a voice warm-up respectively, not articulation exercises.

## Files

| File | What it is |
| --- | --- |
| `index.html` | App shell: home, player and completion screens |
| `app.js` | Session engine, state, streaks, pacer, data export and import |
| `content.js` | Exercise structure, routes, artwork labels and the English pack |
| `lang/*.json` | Translated packs, loaded on demand |
| `art.js` | Articulation artwork: front-on mouth shapes per exercise |
| `styles.css` | App styles, light and dark, self-hosted fonts |
| `page.css` | Shared styles for the static reference pages |
| `routine.html` | Every exercise in full, generated from `content.js` |
| `safety.html` `terms.html` `privacy.html` `accessibility.html` | The reference pages |
| `for-clinicians.html` `handout.html` | Clinician page and a printable patient handout |
| `trio.js` `train.css` | The daily three: today's ticks, streaks, month calendar, calendar files, iPhone install hint |
| `read.html` `read.js` | Read: guided reading practice |
| `reading/r01–r11.json` | 286 original passages; `reading/index.json` holds titles, levels and the reading order |
| `think.html` `think.js` | Think: maths sprint, estimate, Say it in 60 |
| `think/*.json` | 344 estimates and 368 speaking prompts, built from `tools/*_src.txt` |
| `tools/` | `build_think.py` builds the Think banks; `build_reading_index.py` validates every passage and writes the index |
| `sw.js` | Versioned offline shell, network first |
| `vercel.json` | Clean URLs, redirects, cache and security headers |

## Languages

The interface and every exercise are translated per language; the exercises are adapted rather than translated word for word, because sound contrasts do not carry across languages. **Safety, legal and About text stays in English in every language**, deliberately: a mistranslated caution is worse than an untranslated one, and the app says so.

Only languages with a pack in `lang/` appear in the picker (`ready: true` in `content.js`). Anything a pack leaves out falls back to English rather than going blank.

Shipping now: English, Spanish, French, German, Portuguese, Indonesian, Hindi, Kannada.
Queued: Russian, Arabic, Chinese, Japanese, Bengali, Marathi, Telugu, Tamil, Gujarati, Malayalam, Punjabi, Odia, Urdu.

**Every translation except English is machine-assisted and has not been reviewed by a native speaker.** The app says this to the user on the home screen. Native-speaker review of any pack is the single most useful contribution anyone could make; open an issue.

## Adding a language

1. Copy `lang/es.json` and translate it. Keys the app needs are in `content.js` under `EN.ui`, `EN.contexts` and `EN.steps`.
2. Adapt the exercise material rather than translating it: the sound pairs, word endings and consonant clusters must be contrasts that exist and matter in that language.
3. Add the language to `LANGUAGES` in `content.js` with `ready: true`.
4. For a right-to-left language set `dir: 'rtl'`; the layout and the arrow-key navigation already handle it.

## Accessibility

Target is WCAG 2.2 AA; the app is partially conformant and the known gaps are listed at [`/accessibility`](https://www.speechon.app/accessibility). Keyboard operable throughout, screen-reader labelled, reduced motion honoured (the artwork shows both positions side by side instead of alternating), dark mode, a text-size control, and contrast of at least 12:1 for body text in both themes. Checked down to 320 CSS pixels.

The largest known gap is that there are no audio recordings of the sounds and phrases, so a user who cannot read the material has only synthesised speech. That is the next thing to build.

## Run locally

```sh
python3 -m http.server 8765
```

Then open http://localhost:8765. Serve over HTTPS in production for the installable app, clipboard, sharing and the service worker; all of these degrade gracefully without it. Analytics never load on localhost or over plain HTTP.

## Editing content

Passages live in `reading/r*.json` (one object per passage: title, topic, purpose question, paragraphs, model gists, links between paragraphs, three key points, three questions with the correct option first, two vocabulary items whose word must appear in the text). Estimates and prompts are one line each in `tools/estimates_src.txt` and `tools/prompts_src.txt`. After any edit:

```sh
python3 tools/build_think.py && python3 tools/build_reading_index.py
```

The validator fails loudly on malformed passages, duplicate titles or a vocabulary word missing from its passage.

## Deploy

Vercel static site from the repository root: no framework, no build command, no output directory. `vercel.json` handles clean URLs, the `fluency.html` redirect, cache headers and the security headers. **Increment `CACHE` in `sw.js` whenever the shell changes**, then test both a returning visitor and a fresh browser.

## Contributing

Most useful, in order: native-speaker review of a language pack; a recorded reference voice for any language; review of the routine by a registered speech and language therapist; accessibility testing with real assistive technology. Corrections to anything on `/routine` or `/for-clinicians` are very welcome — open an issue.

A project by [Vyshak K Iyengar](https://www.linkedin.com/in/vyshakiyengar).

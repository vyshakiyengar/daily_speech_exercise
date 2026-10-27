#!/usr/bin/env python3
"""Validate the reading passages and the Think banks, then write reading/index.json.

Run from the repository root after editing reading/classics.json or anything in think/:
    python3 tools/build_reading_index.py
It exits non-zero and lists every problem if anything is malformed.

The passages are verbatim public-domain excerpts. Only the questions, gists,
context notes and glosses around them are written for this app.
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINKS = {'add', 'eg', 'but', 'why', 'so', 'sum'}
KINDS = {'main', 'infer', 'build', 'detail', 'purpose', 'apply'}
CATS = ['Business', 'Philosophy', 'Politics', 'History', 'Art', 'Technology']
errors, entries, ids = [], [], set()

passages = json.loads((ROOT / 'reading' / 'classics.json').read_text())['passages']
for n, p in enumerate(passages, 1):
    tag = f'passage {n} ({p.get("id", "?")})'
    for key in ('id', 'cat', 't', 'a', 'w', 'y', 'c', 'q', 'p', 'g', 'r', 'k', 'mc', 'v'):
        if key not in p:
            errors.append(f'{tag}: missing {key}')
    if any(k not in p for k in ('id', 'p', 'g', 'r', 'k', 'mc', 'v')):
        continue
    if p['id'] in ids:
        errors.append(f'{tag}: duplicate id')
    ids.add(p['id'])
    if p.get('cat') not in CATS:
        errors.append(f'{tag}: unknown category {p.get("cat")}')
    if not 1 <= len(p['p']) <= 4:
        errors.append(f'{tag}: {len(p["p"])} paragraphs')
    if len(p['g']) != len(p['p']):
        errors.append(f'{tag}: {len(p["g"])} gists for {len(p["p"])} paragraphs')
    if len(p['r']) != len(p['p']) - 1 or any(r not in LINKS for r in p['r']):
        errors.append(f'{tag}: bad links {p["r"]}')
    if len(p['k']) != 3:
        errors.append(f'{tag}: {len(p["k"])} key points')
    if len(p['mc']) != 3:
        errors.append(f'{tag}: {len(p["mc"])} questions')
    for q in p['mc']:
        if q.get('k') not in KINDS or len(q.get('o', [])) != 4 or not q.get('e') or not q.get('s'):
            errors.append(f'{tag}: bad question {q.get("s", "")[:40]}')
        if len(set(q.get('o', []))) != 4:
            errors.append(f'{tag}: duplicate options in {q.get("s", "")[:40]}')
    if len(p['v']) != 2:
        errors.append(f'{tag}: {len(p["v"])} vocab items')
    text = ' '.join(p['p'])
    for v in p['v']:
        if len(v.get('o', [])) != 4 or not v.get('d') or len(set(v.get('o', []))) != 4:
            errors.append(f'{tag}: bad vocab {v.get("w")}')
        if not re.search(r'\b' + re.escape(v.get('w', '#')), text, re.I):
            errors.append(f'{tag}: vocab word "{v.get("w")}" not in passage')
    for g in p.get('gl', {}):
        if not re.search(r'\b' + re.escape(g) + r'\b', text):
            errors.append(f'{tag}: gloss "{g}" not in passage')
    entries.append([p['id'], p['t'], p['cat'], p['a']])

for name, need in (('estimates.json', ('q', 'u', 'c', 'a')), ('prompts.json', ('q',))):
    path = ROOT / 'think' / name
    if not path.exists():
        errors.append(f'think/{name} missing')
        continue
    items = json.loads(path.read_text())['items']
    qs = set()
    for i, it in enumerate(items):
        for k in need:
            if k not in it:
                errors.append(f'think/{name} #{i + 1}: missing {k}')
        if it.get('q') in qs:
            errors.append(f'think/{name} #{i + 1}: duplicate question')
        qs.add(it.get('q'))
        if name == 'estimates.json' and isinstance(it.get('a'), (int, float)):
            if 'lo' in it and not it['lo'] <= it['a'] <= it['hi']:
                errors.append(f'think/{name} #{i + 1}: answer outside range')
    print(f'think/{name}: {len(items)} items')

if errors:
    print('\n'.join(errors))
    sys.exit(1)

# The file is already in reading order: categories take turns
# (Politics, Business, Philosophy, History, Technology, Art, …).
(ROOT / 'reading' / 'index.json').write_text(json.dumps({'total': len(entries), 'cats': CATS, 'items': entries}, ensure_ascii=False, separators=(',', ':')))
print(f'reading: {len(entries)} classic passages. index.json written.')

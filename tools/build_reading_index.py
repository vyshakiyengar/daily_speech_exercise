#!/usr/bin/env python3
"""Validate the reading passages and the Think banks, then write reading/index.json.

Run from the repository root after editing any file in reading/ or think/:
    python3 tools/build_reading_index.py
It exits non-zero and lists every problem if anything is malformed.
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINKS = {'add', 'eg', 'but', 'why', 'so', 'sum'}
KINDS = {'main', 'infer', 'build', 'detail', 'purpose', 'apply'}
errors, titles, files, seen_titles, levels = [], [], [], set(), []

n = 0
for path in sorted((ROOT / 'reading').glob('r*.json')):
    data = json.loads(path.read_text())
    level = {1: 1, 2: 2}.get(data.get('band', 3), 3)   # 1 clear, 2 argument, 3 dense
    start = n + 1
    for i, p in enumerate(data['passages']):
        n += 1
        tag = f'{path.name} #{i + 1} (passage {n}, "{p.get("t", "?")}")'
        for key in ('t', 'topic', 'q', 'p', 'g', 'r', 'k', 'mc', 'v'):
            if key not in p:
                errors.append(f'{tag}: missing {key}')
        if any(k not in p for k in ('p', 'g', 'r', 'k', 'mc', 'v')):
            continue
        if p['t'] in seen_titles:
            errors.append(f'{tag}: duplicate title')
        seen_titles.add(p['t'])
        if not 2 <= len(p['p']) <= 4:
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
        titles.append([p['t'], p['topic']])
        levels.append(level)
    files.append({'f': path.name, 'from': start, 'to': n})

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

# Reading order: start dense on day one and keep mixing, two dense for every
# argument passage and every clearer one (pattern D A D C). When a level runs
# out, the others continue in turn.
pools = {lv: [i + 1 for i, l in enumerate(levels) if l == lv] for lv in (1, 2, 3)}
order, pattern, k = [], [3, 2, 3, 1], 0
while any(pools.values()):
    lv = pattern[k % 4]; k += 1
    if not pools[lv]:
        lv = next(l for l in (3, 2, 1) if pools[l])
    order.append(pools[lv].pop(0))
(ROOT / 'reading' / 'index.json').write_text(json.dumps({'total': n, 'files': files, 'titles': titles, 'levels': levels, 'order': order}, ensure_ascii=False, separators=(',', ':')))
print(f'reading: {n} passages in {len(files)} files. index.json written.')

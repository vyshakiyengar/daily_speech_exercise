#!/usr/bin/env python3
"""Build think/estimates.json and think/prompts.json from the text sources in tools/.

    python3 tools/build_think.py && python3 tools/build_reading_index.py
"""
import json, math, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def sig(x, n=2):
    if x == 0: return 0
    d = n - int(math.floor(math.log10(abs(x)))) - 1
    v = round(x, d)
    return int(v) if v == int(v) else v

est = []
for line in (ROOT / 'tools' / 'estimates_src.txt').read_text().splitlines():
    if not line.strip() or line.startswith('#'): continue
    parts = [p.strip() for p in line.split('|')]
    q, u, chain, a = parts[0], parts[1], parts[2], float(parts[3])
    a = int(a) if a == int(a) else a
    item = {'q': q, 'u': u, 'c': [c.strip() for c in chain.split(';') if c.strip()], 'a': a, 'lo': sig(a / 2.5), 'hi': sig(a * 2.5)}
    if len(parts) > 4 and parts[4]: item['n'] = parts[4]
    est.append(item)

prompts = []
for line in (ROOT / 'tools' / 'prompts_src.txt').read_text().splitlines():
    if not line.strip() or line.startswith('#'): continue
    t, q = [p.strip() for p in line.split('|', 1)]
    prompts.append({'q': q, 't': t})

(ROOT / 'think').mkdir(exist_ok=True)
(ROOT / 'think' / 'estimates.json').write_text(json.dumps({'items': est}, ensure_ascii=False, indent=0))
(ROOT / 'think' / 'prompts.json').write_text(json.dumps({'items': prompts}, ensure_ascii=False, indent=0))
print(f'{len(est)} estimates, {len(prompts)} prompts')

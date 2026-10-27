"""Merge verbatim excerpts with the questions written for them into reading/classics.json."""
import json, re, sys, pathlib
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
from q_business import Q as B
from q_philosophy import Q as PH
from q_politics import Q as PO
from q_history import Q as H
from q_art_tech import Q as AT
Q = {**B, **PH, **PO, **H, **AT}
EX = {e['id']: e for e in json.loads((HERE.parent / 'excerpts.json').read_text())}
ORDER = {
 'Politics': ['federalist-51', 'mill-silencing', 'hobbes-war', 'machiavelli-feared', 'mill-harm', 'federalist-10', 'locke-property', 'paine-society', 'dubois-double', 'thoreau-civil'],
 'Business': ['smith-butcher', 'smith-directors', 'veblen-conspicuous', 'smith-invisible-hand', 'suntzu-stratagem', 'bacon-great-place', 'franklin-virtue', 'smith-pins'],
 'Philosophy': ['mill-socrates', 'plato-cave', 'aristotle-habit', 'hume-custom', 'emerson-consistency', 'bacon-studies', 'socrates-unexamined', 'marcus-retire', 'thoreau-woods'],
 'History': ['melian-dialogue', 'keynes-1914', 'thucydides-method', 'machiavelli-fortune', 'pericles-funeral', 'keynes-clemenceau', 'machiavelli-past', 'carlyle-great-men'],
 'Technology': ['taylor-system', 'bacon-innovations', 'babbage-principle', 'thoreau-toys', 'emerson-coach', 'faraday-candle'],
 'Art': ['tolstoy-what-is-art', 'wilde-life-imitates', 'reynolds-rules', 'ruskin-memory', 'reynolds-invention', 'wilde-critic'],
}
assert set(Q) == set(EX), (set(Q) ^ set(EX))
assert sorted(sum(ORDER.values(), [])) == sorted(EX)
seq, lists = [], [list(v) for v in ORDER.values()]
while any(lists):
    for l in lists:
        if l: seq.append(l.pop(0))
out, errs = [], []
for pid in seq:
    e, q = EX[pid], Q[pid]
    rec = {'id': pid, 'cat': e['cat'], 't': q['t'], 'a': e['a'], 'w': e['w'], 'y': e['y']}
    if e.get('tr'): rec['tr'] = e['tr']
    rec.update({'c': q['c'], 'q': q['q'], 'p': e['p'], 'g': q['g'], 'r': q['r'], 'k': q['k'],
                'mc': [{'k': k, 's': s, 'o': o, 'e': x} for k, s, o, x in q['mc']],
                'v': [{'w': w, 'o': o, 'd': d} for w, o, d in q['v']]})
    if q.get('gl'): rec['gl'] = q['gl']
    text = ' '.join(e['p'])
    for k in rec.get('gl', {}):
        if not re.search(r'\b' + re.escape(k) + r'\b', text): errs.append(f'{pid}: gloss "{k}" not in text')
    out.append(rec)
if errs: print('\n'.join(errs))
dest = pathlib.Path(sys.argv[1])
dest.write_text(json.dumps({'source': 'Public-domain texts from Project Gutenberg, quoted verbatim (footnote markers removed).', 'passages': out}, ensure_ascii=False, indent=1))
print(len(out), 'passages ->', dest, round(dest.stat().st_size / 1024), 'KB')
print(' '.join(p['cat'][:3] for p in out[:12]))

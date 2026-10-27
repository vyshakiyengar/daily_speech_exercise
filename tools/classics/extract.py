"""Extract verbatim excerpts. Only footnote markers and italic underscores are removed."""
import sys, json, re, math, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from spec import SPEC

PARAS = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2])
SENT = re.compile(r'(?<=[.!?;:])\s+(?=[A-Z“"‘\'(\[]|\d+\.)')
ABBR = re.compile(r'(?:\bMr|\bMrs|\bDr|\bSt|\bviz|\bi\.e|\be\.g)\.$')

def clean(t):
    t = re.sub(r'\[\d+\]', '', t)                 # [261] footnote refs
    t = re.sub(r'\(\d*\*\)', '', t)               # (*) and (1*) refs
    t = re.sub(r'(?<!\w)_([^_]+)_(?!\w)', r'\1', t)  # _italics_
    return re.sub(r'\s+', ' ', t).replace(' ,', ',').replace(' .', '.').strip()

def sentences(t):
    parts, out = SENT.split(t), []
    for p in parts:
        if out and (ABBR.search(out[-1]) or len(out[-1]) < 3): out[-1] += ' ' + p
        else: out.append(p)
    return out

def words(t): return len(t.split())

def chunk(paras, target=165):
    units = []
    for p in paras:
        if words(p) <= target * 1.25: units.append(p); continue
        ss = sentences(p); k = math.ceil(words(p) / target); goal = words(p) / k; cur = ''
        for s in ss:
            if cur and words(cur) + words(s) / 2 > goal and len(units) < 99: units.append(cur); cur = s
            else: cur = (cur + ' ' + s).strip()
        if cur: units.append(cur)
    merged = []
    for u in units:  # merge short neighbours (e.g. numbered maxims)
        if merged and words(merged[-1]) + words(u) <= target: merged[-1] += ' ' + u
        else: merged.append(u)
    if len(merged) > 1 and words(merged[0]) < 60:
        first = merged.pop(0); merged[0] = first + ' ' + merged[0]
    if len(merged) > 1 and words(merged[-1]) < 45:
        last = merged.pop(); merged[-1] += ' ' + last
    return merged

FIX = {
 'smith-directors': [('front trouble and front risk', 'from trouble and from risk')],
 'smith-invisible-hand': [('produce maybe of', 'produce may be of')],
 'bacon-great-place': [('to scom', 'to scorn')],
 'aristotle-habit': [('nor could file again', 'nor could fire again'), ('receiving themu and', 'receiving them, and')],
 'hobbes-war': [('There Is Alwayes Warre Of Every One Against Every One ', '')],
 'mill-silencing': [('than when in or opposition', 'than when in opposition')],
 'federalist-10': [('the evidence, of known facts', 'the evidence of known facts')],
 'keynes-clemenceau': [('a, defined outline', 'a defined outline')],
 'wilde-life-imitates': [('VIVIAN. Certainly I do. Paradox', 'Paradox')],
 'wilde-critic': [('GILBERT. Yes, from the soul. That is', 'That is')],
 'pericles-funeral': [('"Nor are these', 'Nor are these'), ('"In short, I say', 'In short, I say')],
}
out = []
for (pid, cat, author, work, year, tr, book, idx, opt) in SPEC:
    P = json.loads((PARAS / f'{book}.json').read_text())
    paras = [clean(P[i]) for i in idx]
    text = '\n\n'.join(paras)
    if 'from' in opt:
        k = text.find(opt['from']); assert k >= 0, (pid, 'from'); text = text[k:]
    if 'to' in opt:
        k = text.find(opt['to']); assert k >= 0, (pid, 'to'); text = text[:k + len(opt['to'])]
    for old, new in FIX.get(pid, []):
        assert old in text, (pid, old); text = text.replace(old, new)
    text = re.sub(r'(?m)^(?:[IVX]+\. |\d+\. (?=[A-Z])|Sect\. \d+\. )', '', text) if pid != 'suntzu-stratagem' else text
    paras = [p for p in text.split('\n\n') if p.strip()]
    if 'words' in opt:  # keep whole sentences up to roughly this many words
        kept, n = [], 0
        for p in paras:
            if n >= opt['words']: break
            ss, take = sentences(p), []
            for s in ss:
                if n >= opt['words']: break
                take.append(s); n += words(s)
            kept.append(' '.join(take))
        paras = kept
    chunks = chunk(paras)
    out.append({'id': pid, 'cat': cat, 'a': author, 'w': work, 'y': year, **({'tr': tr} if tr else {}), 'p': chunks})
    print(f'{pid:24} {len(chunks)} chunks {sum(words(c) for c in chunks):4}w  ' + ' / '.join(str(words(c)) for c in chunks))
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))

import sys, re, json, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(exist_ok=True)
for f in sorted(src.glob('*.txt')):
    t = f.read_text(encoding='utf-8', errors='replace').replace('\r', '')
    paras = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n', t)]
    paras = [p for p in paras if p]
    (out / (f.stem + '.json')).write_text(json.dumps(paras, ensure_ascii=False))
    print(f.stem, len(paras))

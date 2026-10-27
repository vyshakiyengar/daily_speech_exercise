# The classics behind Read

Every passage in `reading/classics.json` is quoted verbatim from a public-domain edition on Project Gutenberg, fetched from the GITenberg mirror on GitHub. Only footnote markers, italics underscores and a few obvious scanning typos are changed (listed in `FIX` in `extract.py`).

To rebuild:

1. `bash fetch.sh < repos.txt` downloads the books (one `GITenberg` repo name per line, e.g. `On-Liberty_34901`) into `classics/`.
2. `python3 paras.py classics paras` splits each book into paragraphs.
3. `python3 extract.py paras excerpts.json` cuts the excerpts listed in `spec.py` and chunks them into reading paragraphs.
4. `python3 merge.py ../../reading/classics.json` joins the text with the context notes, questions, model summaries, word items and glosses in `q_*.py`, in reading order (the six categories take turns).
5. From the repository root, `python3 tools/build_reading_index.py` validates everything and writes `reading/index.json`.

`merge.py` expects `excerpts.json` one folder up from these scripts; adjust the path if you run them elsewhere.

#!/usr/bin/env python3
"""
build.py — regenerate "NBA Stats.html" from the .jsx source files.

The app ships as a single self-contained HTML file that bundles all of the
.jsx modules inside one <script type="text/babel"> block (compiled in the
browser by Babel standalone). When you edit any .jsx file, run this script to
re-bundle them back into the HTML:

    python3 build.py

No dependencies beyond Python 3.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "NBA Stats.html")

# Order matters: dependencies (data layer, charts) must come before the screens.
ORDER = ['tweaks-panel', 'icons', 'data', 'charts', 'player', 'team', 'leaders', 'live', 'app']

# CSS used by the data-layer UI (spinner / search overlay / clickable rows).
CSS_START = "  /* App data-layer UI (spinner / search / error) */"
CSS = """  /* App data-layer UI (spinner / search / error) */
  .spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .retry-btn { background: var(--accent); color: #fff; border: none; border-radius: 10px; padding: 10px 22px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font); }
  .retry-btn:hover { filter: brightness(1.1); }
  .search-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); display: flex; align-items: flex-start; justify-content: center; padding-top: 120px; z-index: 1000; }
  .search-modal { width: 640px; max-width: 90vw; background: var(--surface-2); border: 1px solid var(--line-2); border-radius: 16px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.6); }
  .search-input { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--line); color: var(--text-3); }
  .search-input input { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 16px; font-family: var(--font); }
  .search-results { max-height: 380px; overflow: auto; }
  .search-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid var(--line); }
  .search-row:hover { background: rgba(255,255,255,0.03); }
  .clickable-row:hover { background: rgba(255,255,255,0.06) !important; }
"""


def main():
    src = open(HTML, encoding='utf-8').read()

    # refresh the CSS block (remove any prior copy, then insert once before </style>)
    while CSS_START in src:
        s = src.index(CSS_START)
        e = src.index("</style>", s)
        src = src[:s] + src[e:]
    idx = src.index("</style>")
    src = src[:idx] + CSS + src[idx:]

    # rebuild the babel bundle from the jsx files
    parts = []
    for name in ORDER:
        code = open(os.path.join(HERE, name + ".jsx"), encoding='utf-8').read().rstrip('\n')
        parts.append("// ─────────── %s.jsx ───────────\n\n%s" % (name, code))
    bundle = "\n\n\n".join(parts)

    open_tag = '<script type="text/babel">'
    start = src.index(open_tag) + len(open_tag)
    end = src.index('</script>', start)
    src = src[:start] + "\n\n" + bundle + "\n\n" + src[end:]

    open(HTML, 'w', encoding='utf-8').write(src)
    print("Rebuilt 'NBA Stats.html'  (bundle: %d chars)" % len(bundle))


if __name__ == "__main__":
    main()

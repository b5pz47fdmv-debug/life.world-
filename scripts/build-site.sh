#!/usr/bin/env bash
# Builds every project into _site/ for GitHub Pages.
#  - projects/<category>/<name>/package.json present  → npm ci && npm test (if defined) && npm run build, publish dist/
#  - otherwise                                         → copied as-is (static HTML/CSS/JS)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/_site"
rm -rf "$OUT"
mkdir -p "$OUT"

cp "$ROOT/index.html" "$OUT/"
[ -d "$ROOT/shared" ] && cp -r "$ROOT/shared" "$OUT/shared"
touch "$OUT/.nojekyll"

for dir in "$ROOT"/projects/*/*/; do
  [ -d "$dir" ] || continue
  rel="${dir#$ROOT/}"; rel="${rel%/}"
  dest="$OUT/$rel"
  if [ -f "$dir/package.json" ]; then
    echo "▶ Building $rel"
    (
      cd "$dir"
      if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
      if node -e "process.exit(require('./package.json').scripts?.test ? 0 : 1)"; then npm test; fi
      npm run build
    )
    mkdir -p "$dest"
    cp -r "$dir/dist/." "$dest/"
  else
    echo "▶ Copying $rel"
    mkdir -p "$dest"
    rsync -a --exclude node_modules --exclude README.md "$dir" "$dest/" 2>/dev/null || cp -r "$dir/." "$dest/"
  fi
done
echo "✔ Site assembled in _site/"

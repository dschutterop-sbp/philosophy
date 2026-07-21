#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The paper has one canonical editable source in the repository.  Set SOURCE
# explicitly only when producing a PDF from another Markdown document.
SOURCE="${SOURCE:-$ROOT/../paper/philosophy_layer.md}"
METADATA="${METADATA:-$ROOT/metadata.yaml}"
OUTPUT="${1:-$ROOT/build/philosophy_layer.pdf}"
ENGINE="${ENGINE:-auto}"

mkdir -p "$(dirname "$OUTPUT")"

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

require pandoc

if [[ "$ENGINE" == "auto" ]]; then
  if command -v typst >/dev/null 2>&1; then
    ENGINE="typst"
  elif command -v xelatex >/dev/null 2>&1; then
    ENGINE="xelatex"
  else
    echo "Install Typst or XeLaTeX. On macOS: brew install typst" >&2
    exit 1
  fi
fi

COMMON=(
  "$SOURCE"
  --standalone
  --resource-path="$(dirname "$SOURCE")"
  --metadata-file="$METADATA"
  --toc
  --toc-depth=3
  --highlight-style=tango
  --from=markdown+smart
  --output="$OUTPUT"
)

case "$ENGINE" in
  typst)
    require typst
    pandoc "${COMMON[@]}" \
      --pdf-engine=typst \
      --template="$ROOT/templates/philosophy-paper.typst" \
      -V mainfont="${MAIN_FONT:-New Computer Modern}" \
      -V margin.x=25mm \
      -V margin.y=24mm
    ;;
  xelatex)
    require xelatex
    pandoc "${COMMON[@]}" \
      --pdf-engine=xelatex \
      --include-in-header="$ROOT/templates/latex-header.tex" \
      -V documentclass=article \
      -V papersize=a4 \
      -V geometry:margin=25mm \
      -V mainfont="${MAIN_FONT:-DejaVu Serif}" \
      -V sansfont="${SANS_FONT:-Inter}" \
      -V monofont="${MONO_FONT:-DejaVu Sans Mono}" \
      -V colorlinks=true \
      -V linkcolor=PaperNavy \
      -V urlcolor=PaperGrey
    ;;
  *)
    echo "Unknown ENGINE '$ENGINE'. Use auto, typst or xelatex." >&2
    exit 2
    ;;
esac

printf 'Built %s with %s\n' "$OUTPUT" "$ENGINE"

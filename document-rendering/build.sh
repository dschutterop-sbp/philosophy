#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$ROOT/.." && pwd)"
SOURCE="${SOURCE:-$ROOT/../paper/philosophy_layer.md}"
BUILD_DIR="$ROOT/build"
FIGURE_DIR="$BUILD_DIR/figures"
TEX_OUTPUT="$BUILD_DIR/philosophy_layer.tex"
PDF_OUTPUT="$BUILD_DIR/philosophy_layer.pdf"
ARXIV_OUTPUT="$BUILD_DIR/philosophy_layer-arxiv.tar.gz"
LATEX_ENGINE="${LATEX_ENGINE:-auto}"

if (( $# > 0 )); then
  echo "This build has fixed output paths beneath $BUILD_DIR" >&2
  exit 2
fi

[[ -f "$SOURCE" ]] || {
  echo "Paper source not found: $SOURCE" >&2
  exit 1
}

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

require pandoc
require typst
mkdir -p "$BUILD_DIR" "$FIGURE_DIR"

# arXiv cannot rely on shell-escape SVG conversion. Produce vector PDF figures
# first, then make the generated TeX reference only those portable assets.
render_figure() {
  local name="$1"
  local width="$2"
  local height="$3"
  typst compile \
    --root="$WORKSPACE_ROOT" \
    --input source="/paper/figures/$name.svg" \
    --input width="$width" \
    --input height="$height" \
    "$ROOT/templates/svg-figure.typ" \
    "$FIGURE_DIR/$name.pdf"
}

render_figure fig1-pipeline 680 890
render_figure fig2-approval-bundle 680 650
render_figure fig3-admissibility-preference 680 462

PANDOC_ARGS=(
  "$SOURCE"
  --standalone
  --from=markdown+smart+autolink_bare_uris
  --to=latex
  --resource-path="$BUILD_DIR:$(dirname "$SOURCE")"
  --lua-filter="$ROOT/templates/pandoc-arxiv.lua"
  --include-in-header="$ROOT/templates/latex-header.tex"
  --toc
  --toc-depth=2
  --syntax-highlighting=none
  -V documentclass=article
  -V papersize=a4
  -V fontsize=11pt
  -V geometry:margin=24mm
  -V colorlinks=true
  -V linkcolor=PaperInk
  -V citecolor=PaperInk
  -V urlcolor=PaperNavy
  --output="$TEX_OUTPUT"
)

if [[ -n "${METADATA:-}" ]]; then
  [[ -f "$METADATA" ]] || {
    echo "Metadata file not found: $METADATA" >&2
    exit 1
  }
  PANDOC_ARGS+=(--metadata-file="$METADATA")
fi

pandoc "${PANDOC_ARGS[@]}"

if [[ "$LATEX_ENGINE" == "auto" ]]; then
  if command -v tectonic >/dev/null 2>&1; then
    LATEX_ENGINE="tectonic"
  elif command -v xelatex >/dev/null 2>&1; then
    LATEX_ENGINE="xelatex"
  else
    echo "Install Tectonic or XeLaTeX to compile $TEX_OUTPUT" >&2
    exit 1
  fi
fi

case "$LATEX_ENGINE" in
  tectonic)
    require tectonic
    (cd "$BUILD_DIR" && tectonic --keep-logs --synctex philosophy_layer.tex)
    ;;
  xelatex)
    require xelatex
    (cd "$BUILD_DIR" && xelatex -interaction=nonstopmode -halt-on-error philosophy_layer.tex)
    (cd "$BUILD_DIR" && xelatex -interaction=nonstopmode -halt-on-error philosophy_layer.tex)
    ;;
  *)
    if [[ -x "$LATEX_ENGINE" && "$(basename "$LATEX_ENGINE")" == tectonic ]]; then
      (cd "$BUILD_DIR" && "$LATEX_ENGINE" --keep-logs --synctex philosophy_layer.tex)
    else
      echo "Unknown LATEX_ENGINE '$LATEX_ENGINE'. Use auto, tectonic, xelatex or a Tectonic path." >&2
      exit 2
    fi
    ;;
esac

[[ -s "$TEX_OUTPUT" && -s "$PDF_OUTPUT" ]] || {
  echo "Build did not produce both $TEX_OUTPUT and $PDF_OUTPUT" >&2
  exit 1
}

(cd "$BUILD_DIR" && COPYFILE_DISABLE=1 tar -czf "$(basename "$ARXIV_OUTPUT")" philosophy_layer.tex figures)

[[ -s "$ARXIV_OUTPUT" ]] || {
  echo "Build did not produce $ARXIV_OUTPUT" >&2
  exit 1
}

printf 'Built %s and %s with %s (generated TeX: %s)\n' \
  "$ARXIV_OUTPUT" "$PDF_OUTPUT" "$LATEX_ENGINE" "$TEX_OUTPUT"

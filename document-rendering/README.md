# Document rendering

A reproducible Markdown-to-PDF workflow for the paper. It builds the repository's
canonical source, [`../paper/philosophy_layer.md`](../paper/philosophy_layer.md),
so the PDF and the versioned paper never drift apart.

## 1. Install on macOS

```bash
brew install pandoc typst tectonic
```

Pandoc generates an arXiv-compatible standalone LaTeX source. Tectonic compiles
that source with the XeTeX engine; a conventional XeLaTeX installation is also
supported. Typst is used only to convert the canonical SVG diagrams to portable
vector PDF assets before LaTeX compilation, avoiding shell-escape conversion on
arXiv.

## 2. Publication metadata

Title, author, date, version, language, licence and PDF metadata live in the
canonical Markdown front matter. The `version` field is the authoritative
project version and must use `vMAJOR.MINOR.PATCH`; package and citation metadata
are checked against it with `npm run version:check`.

## 3. Build

```bash
./build.sh
```

All generated artifacts are written beneath the ignored `build/` directory.
The two publication artifacts are written to:

```text
build/philosophy_layer-arxiv_v1.0.0.tar.gz
build/philosophy_layer_v1.0.0.pdf
```

The arXiv archive contains the generated `philosophy_layer.tex` and its portable
`figures/*.pdf` dependencies. The unpacked TeX source also remains at
`build/philosophy_layer_v1.0.0.tex` for inspection. Each future paper version
therefore produces distinct, immutable-looking artifact names.

The equivalent Make command is:

```bash
make pdf
```

To generate a PDF for another Markdown source with its own front matter while
retaining the same styling, set `SOURCE`:

```bash
SOURCE=/path/to/paper.md ./build.sh
```

An alternate source without front matter may also provide `METADATA` explicitly:

```bash
SOURCE=/path/to/paper.md METADATA=/path/to/metadata.yaml ./build.sh
```

## Useful variants

Force Tectonic:

```bash
LATEX_ENGINE=tectonic ./build.sh
```

Force XeLaTeX:

```bash
LATEX_ENGINE=xelatex ./build.sh
```

The build deliberately uses the Noto Serif, Noto Sans and Noto Sans Mono files
from TeX Live rather than workstation fonts, so the same broad-coverage outline
fonts are available in local and arXiv builds.

## Files

- `../paper/philosophy_layer.md`: canonical publication source
- `templates/latex-header.tex`: academic article layout and typography
- `templates/pandoc-arxiv.lua`: presentational Pandoc transformations
- `templates/svg-figure.typ`: deterministic SVG-to-vector-PDF wrapper
- `build.sh`: single-command build
- `Makefile`: optional convenience commands
- `build/`: generated artifacts (ignored by Git)

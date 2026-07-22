# Document rendering

A reproducible Markdown-to-PDF workflow for the paper. It builds the repository's
canonical source, [`../paper/philosophy_layer.md`](../paper/philosophy_layer.md),
so the PDF and the versioned paper never drift apart.

## 1. Install on macOS

```bash
brew install pandoc typst
```

Typst is the preferred engine. The build script falls back to XeLaTeX when Typst is not installed.

## 2. Publication metadata

Title, author, date, language, licence and PDF metadata live in the canonical
Markdown front matter. Keeping metadata with the paper prevents the editable
source and its export configuration from drifting apart.

## 3. Build

```bash
./build.sh
```

The PDF is written to:

```text
build/philosophy_layer.pdf
```

The equivalent Make command is:

```bash
make pdf
```

To generate a PDF for another Markdown source with its own front matter while
retaining the same styling, set `SOURCE`:

```bash
SOURCE=/path/to/paper.md ./build.sh /path/to/paper.pdf
```

An alternate source without front matter may also provide `METADATA` explicitly:

```bash
SOURCE=/path/to/paper.md METADATA=/path/to/metadata.yaml ./build.sh
```

## Useful variants

Force Typst:

```bash
ENGINE=typst ./build.sh
```

Force XeLaTeX:

```bash
ENGINE=xelatex ./build.sh
```

Choose another output path:

```bash
./build.sh ~/Desktop/philosophy_layer.pdf
```

Override the body font:

```bash
MAIN_FONT="Avenir Next" ./build.sh
```

For the supplied Typst template, `New Computer Modern` is the safest default. `Avenir Next` gives the paper a more contemporary appearance on macOS.

## Files

- `../paper/philosophy_layer.md`: canonical publication source
- `templates/philosophy-paper.typst`: Pandoc and Typst publication template
- `templates/latex-header.tex`: styled fallback for XeLaTeX
- `build.sh`: single-command build
- `Makefile`: optional convenience commands

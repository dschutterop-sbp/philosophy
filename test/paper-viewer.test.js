import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractPaperSegment, renderMarkdown } from "../src/paper-viewer.js";
import { paperReferences } from "../src/paper-references.js";

test("every paper reference extracts a headed source segment", async () => {
  const source = await readFile(new URL("../paper/philosophy_layer.md", import.meta.url), "utf8");
  for (const reference of Object.values(paperReferences)) {
    const segment = extractPaperSegment(source, reference);
    assert.match(segment, /^#+\s+/);
  }
});

test("canonical paper declares every interface reference heading id", async () => {
  const source = await readFile(new URL("../paper/philosophy_layer.md", import.meta.url), "utf8");
  for (const reference of Object.values(paperReferences)) {
    const anchor = reference.href.split("#")[1];
    assert.match(source, new RegExp(`^#{1,6} .+\\{[^}]*#${anchor}(?=\\s|})`, "m"));
  }
});

test("reference catalog covers the paper mechanisms and bibliography", () => {
  for (const key of ["context", "interpretation", "creativeDirection", "validation", "conformance", "humanGate", "approval", "audit", "strategy", "governance", "failures", "silence", "versions", "evaluation", "references"]) {
    assert.ok(paperReferences[key], `missing paper reference for ${key}`);
  }
});

test("reader renders tables and native heading ids", () => {
  const rendered = renderMarkdown(`# Segment {#segment}
| Layer | Question |
|---|---|
| Context | What is true? |`);
  assert.match(rendered, /<table>/);
  assert.match(rendered, /<h1 id="segment">Segment<\/h1>/);
});

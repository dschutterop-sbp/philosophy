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

test("reader renders tables and omits source-only anchors", () => {
  const rendered = renderMarkdown(`<a id="segment"></a>
| Layer | Question |
|---|---|
| Context | What is true? |`);
  assert.match(rendered, /<table>/);
  assert.doesNotMatch(rendered, /segment/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractPaperSegment } from "../src/paper-viewer.js";
import { paperReferences } from "../src/paper-references.js";

test("every paper reference extracts a headed source segment", async () => {
  const source = await readFile(new URL("../paper/philosophy_layer.md", import.meta.url), "utf8");
  for (const reference of Object.values(paperReferences)) {
    const segment = extractPaperSegment(source, reference);
    assert.match(segment, /^#+\s+/);
  }
});

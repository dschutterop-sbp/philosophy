import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// The decision-class taxonomy is a governed, per-deployment normative document (§5.4, §5.6).
// It is loaded here so interpretations can be validated against it and any class the
// organisation never enumerated is surfaced as under-enumeration rather than silently
// absorbed into the nearest existing class (§2, §9).
const taxonomyFile = new URL("../governance/decision-classes.md", import.meta.url);

function parse(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("decision-classes.md is missing its frontmatter.");
  const frontmatter = match[1];
  const version = frontmatter.match(/^version:\s*(\S+)\s*$/m)?.[1];
  const owner = frontmatter.match(/^owner:\s*(.+?)\s*$/m)?.[1];
  if (!version || !owner) throw new Error("decision-classes.md needs a version and an owner.");
  const classes = {};
  for (const line of match[2].split("\n")) {
    const entry = line.match(/^([a-z][a-z0-9_]*):\s+(.*\S)\s*$/);
    if (entry) classes[entry[1]] = entry[2];
  }
  if (Object.keys(classes).length === 0) throw new Error("decision-classes.md enumerates no classes.");
  return { version, owner, classes };
}

const raw = await readFile(taxonomyFile, "utf8");
const parsed = parse(raw);

export const decisionClassTaxonomy = parsed.classes;
export const decisionClassKeys = Object.keys(parsed.classes);
export const taxonomyVersion = parsed.version;
export const taxonomyOwner = parsed.owner;
export const taxonomyHash = createHash("sha256").update(raw).digest("hex");

export function isEnumeratedClass(decisionClass) {
  return Object.prototype.hasOwnProperty.call(parsed.classes, decisionClass);
}

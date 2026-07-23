import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const paperPath = path.join(root, "paper", "philosophy_layer.md");
const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const citationPath = path.join(root, "CITATION.cff");

function paperVersion(source) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const version = frontmatter?.[1].match(/^version:\s*["']?(v\d+\.\d+\.\d+)["']?\s*$/m)?.[1];
  if (!version) {
    throw new Error(`${paperPath} must declare a SemVer version such as version: "v1.0.0" in its frontmatter.`);
  }
  return version;
}

function replaceJsonVersion(source, version, label) {
  const parsed = JSON.parse(source);
  parsed.version = version;
  if (parsed.packages?.[""]) parsed.packages[""].version = version;
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

const [paper, packageSource, lockSource, citation] = await Promise.all([
  readFile(paperPath, "utf8"),
  readFile(packagePath, "utf8"),
  readFile(lockPath, "utf8"),
  readFile(citationPath, "utf8"),
]);

const canonical = paperVersion(paper);
const npmVersion = canonical.slice(1);
const expectedPackage = replaceJsonVersion(packageSource, npmVersion);
const expectedLock = replaceJsonVersion(lockSource, npmVersion);
const expectedCitation = citation.replace(
  /^(version:\s*)(?:["']?v?\d+\.\d+\.\d+["']?)$/gm,
  `$1${canonical}`,
);

const mismatches = [];
if (packageSource !== expectedPackage) mismatches.push("package.json");
if (lockSource !== expectedLock) mismatches.push("package-lock.json");
if (citation !== expectedCitation) mismatches.push("CITATION.cff");

if (process.argv.includes("--sync")) {
  await Promise.all([
    writeFile(packagePath, expectedPackage),
    writeFile(lockPath, expectedLock),
    writeFile(citationPath, expectedCitation),
  ]);
  console.log(`Synced project metadata to ${canonical} from paper/philosophy_layer.md.`);
} else if (process.argv.includes("--check")) {
  if (mismatches.length) {
    throw new Error(`Version ${canonical} in the paper is canonical; run npm run version:sync to update: ${mismatches.join(", ")}`);
  }
  console.log(`Version metadata is consistent with canonical paper version ${canonical}.`);
} else {
  console.log(canonical);
}

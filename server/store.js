import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";

const digest = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");

export class DraftStore {
  constructor() { this.drafts = new Map(); }
  create(record) {
    const id = digest({ context: record.context, interpretation: record.interpretation, mediaHash: record.media.hash, createdAt: record.createdAt }).slice(0, 20);
    const draft = Object.freeze({ ...record, id, revision: 0, state: "interpretation_pending", directions: [], approvedInterpretation: null, approval: null });
    this.drafts.set(id, draft);
    return draft;
  }
  get(id) { return this.drafts.get(id); }
  update(id, change, expectedRevision = undefined) {
    const current = this.get(id);
    if (!current || (expectedRevision !== undefined && current.revision !== expectedRevision)) return null;
    const next = Object.freeze({ ...current, ...change, revision: current.revision + 1 });
    this.drafts.set(id, next);
    return next;
  }
}

// The event hash chain makes edits or removal in the local JSONL audit file evident.
// Production deployments should send the same events to an access-controlled append-only sink.
export class AuditLog {
  constructor(file) { this.file = file; this.previousHash = "genesis"; this.events = []; }
  async init() {
    try {
      const lines = (await readFile(this.file, "utf8")).trim().split("\n").filter(Boolean);
      this.events = lines.map((line) => JSON.parse(line));
      if (this.events.length) this.previousHash = this.events.at(-1).eventHash || "genesis";
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  async append(event) {
    await mkdir(new URL("../data", import.meta.url), { recursive: true });
    const record = { ...event, previousEventHash: this.previousHash };
    const eventHash = digest(record);
    const signed = { ...record, eventHash };
    await appendFile(this.file, `${JSON.stringify(signed)}\n`);
    this.previousHash = eventHash;
    this.events.push(signed);
    return signed;
  }
  // In-memory view of the chain for metrics, provenance and export. Production should
  // read these from the access-controlled append-only sink, not process memory.
  all() { return this.events; }
}

import { PAPER_SOURCE, referenceFor } from "./paper-references.js";

let sourcePromise;

export function extractPaperSegment(source, reference) {
  const anchor = reference.href.split("#")[1];
  const headingPattern = new RegExp(`^(#{1,6})\\s+.+\\{[^}]*#${anchor}(?=\\s|})[^}]*\\}\\s*$`, "m");
  const heading = source.match(headingPattern);
  if (!heading) throw new Error(`Source segment has no heading: ${reference.label}`);
  const content = source.slice(heading.index);
  const nextHeading = new RegExp(`^#{1,${reference.level}}\\s+`, "m");
  const boundary = content.slice(heading[0].length).search(nextHeading);
  return boundary < 0 ? content.trim() : content.slice(0, heading[0].length + boundary).trim();
}

function inline(markdown) {
  return markdown
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\`([^\`]+)\`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function renderMarkdown(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let paragraph = [], list = null, code = null;
  const flushParagraph = () => { if (paragraph.length) { html.push(`<p>${inline(paragraph.join(" "))}</p>`); paragraph = []; } };
  const flushList = () => { if (list) { html.push(`<${list.type}>${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${list.type}>`); list = null; } };
  const flushCode = () => { if (code) { html.push(`<pre><code>${inline(code.lines.join("\n"))}</code></pre>`); code = null; } };
  const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^<a id="[^"]+"><\/a>$/.test(line.trim())) continue;
    if (line.startsWith("```")) { if (code) flushCode(); else { flushParagraph(); flushList(); code = { lines: [] }; } continue; }
    if (code) { code.lines.push(line); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const item = line.match(/^([*+-]|\d+\.)\s+(.+)$/);
    const separator = lines[index + 1]?.trim().match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/);
    if (line.trim().startsWith("|") && separator) {
      flushParagraph(); flushList();
      const header = cells(line);
      const rows = [];
      index += 2;
      while (lines[index]?.trim().startsWith("|")) { rows.push(cells(lines[index])); index += 1; }
      index -= 1;
      html.push(`<table><thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    } else if (heading) {
      flushParagraph(); flushList();
      const attributes = heading[2].match(/\s+\{([^}]+)\}\s*$/);
      const id = attributes?.[1].match(/(?:^|\s)#([^\s.]+)/)?.[1];
      const label = attributes ? heading[2].slice(0, attributes.index) : heading[2];
      html.push(`<h${heading[1].length}${id ? ` id="${id}"` : ""}>${inline(label)}</h${heading[1].length}>`);
    }
    else if (item) { flushParagraph(); const type = /\d+\./.test(item[1]) ? "ol" : "ul"; if (!list || list.type !== type) { flushList(); list = { type, items: [] }; } list.items.push(item[2]); }
    else if (/^---+$/.test(line)) { flushParagraph(); flushList(); html.push("<hr>"); }
    else if (line.startsWith("> ")) { flushParagraph(); flushList(); html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); }
    else if (!line.trim()) { flushParagraph(); flushList(); }
    else paragraph.push(line.trim());
  }
  flushParagraph(); flushList(); flushCode();
  return html.join("");
}

export async function showPaperReference(key) {
  const reference = referenceFor(key);
  const dialog = document.querySelector("#paper-reader");
  const title = document.querySelector("#paper-reader-title");
  const content = document.querySelector("#paper-reader-content");
  title.textContent = `${reference.label} — ${reference.description}`;
  content.innerHTML = "<p>Loading source…</p>";
  if (!dialog.open) dialog.showModal();
  try {
    sourcePromise ||= fetch(PAPER_SOURCE).then((response) => {
      if (!response.ok) throw new Error(`Source request failed (${response.status})`);
      return response.text();
    });
    content.innerHTML = renderMarkdown(extractPaperSegment(await sourcePromise, reference));
  } catch (error) {
    content.textContent = `Could not load this paper segment: ${error.message}`;
  }
}

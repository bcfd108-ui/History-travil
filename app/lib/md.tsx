// Minimal markdown renderer for dossier text. The dossiers use a small
// subset: paragraphs, ###/#### headings, bold, italic, links, bare URLs,
// bullet and numbered lists, blockquotes, and occasional pipe tables.
// Content comes from our own research files; HTML is escaped before any
// inline formatting is applied.
import { readingBlocks, readingText } from "./record-reading";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

export function renderMarkdown(md: string, voices?: string[]): string {
  if (!md) return "";
  const lines = (voices ? readingText(md) : md).split("\n");
  const paragraphs = (value: string) => readingBlocks(value, voices || []).map(block => {
    const tag = block.quote ? "blockquote" : "p";
    return `<${tag}>${inline(block.text)}</${tag}>`;
  }).join("");
  const listItem = (value: string) => voices ? paragraphs(value) : inline(value);
  const blocks: string[] = [];
  let i = 0;
  const isBlockStart = (l: string) =>
    /^#{3,6}\s/.test(l) || /^[-*]\s/.test(l.trim()) || /^\d+[.)]\s/.test(l.trim()) ||
    /^>\s?/.test(l.trim()) || /^\|/.test(l.trim()) || /^---+$/.test(l.trim());
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }
    const h = t.match(/^(#{3,6})\s+(.*)$/);
    if (h) { blocks.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^---+$/.test(t)) { blocks.push("<hr/>"); i++; continue; }
    if (/^\|/.test(t)) {
      const rows: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) { rows.push(lines[i].trim()); i++; }
      const cells = rows
        .filter((r) => !/^\|[\s:|-]+\|$/.test(r))
        .map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => `<td>${inline(c.trim())}</td>`).join(""));
      blocks.push(`<table>${cells.map((c) => `<tr>${c}</tr>`).join("")}</table>`);
      continue;
    }
    if (/^[-*]\s/.test(t) || /^\d+[.)]\s/.test(t)) {
      const ordered = /^\d+[.)]\s/.test(t);
      const items: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        const bm = lt.match(/^(?:[-*]|\d+[.)])\s+(.*)$/);
        if (bm) { items.push(bm[1]); i++; }
        else if (lt && !isBlockStart(lines[i]) && items.length) {
          items[items.length - 1] = items[items.length - 1] + " " + lt;
          i++;
        } else break;
      }
      const tag = ordered ? "ol" : "ul";
      blocks.push(`<${tag}>${items.map(item => `<li>${listItem(item)}</li>`).join("")}</${tag}>`);
      continue;
    }
    if (/^>\s?/.test(t)) {
      const parts: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { parts.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      blocks.push(`<blockquote>${inline(parts.join(" "))}</blockquote>`);
      continue;
    }
    const parts = [t];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { parts.push(lines[i].trim()); i++; }
    blocks.push(voices ? paragraphs(parts.join(" ")) : `<p>${inline(parts.join(" "))}</p>`);
  }
  return blocks.join("\n");
}

export function Md({ text, className, voices }: { text: string; className?: string; voices?: string[] }) {
  if (!text) return null;
  return <div className={className || "md"} dangerouslySetInnerHTML={{ __html: renderMarkdown(text, voices) }} />;
}

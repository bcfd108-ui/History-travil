// Reading-only typography. Source disclosures always use the original Markdown.
const sentences = new Intl.Segmenter("en", { granularity: "sentence" });
const words = (value: string) => value.trim().split(/\s+/u).length;

function paragraphs(text: string): string[] {
  const output: string[] = [];
  let paragraph = "";
  for (const { segment } of sentences.segment(text)) {
    // Long sentences keep their words and punctuation, breaking only at a clause.
    const clauses = words(segment) > 60 ? segment.split(/(?<=[,;:])\s+|(?<=\s[—–])\s+/u) : [segment];
    for (const clause of clauses) {
      if (paragraph && words(paragraph + " " + clause) > 60) {
        output.push(paragraph);
        paragraph = "";
      }
      paragraph = (paragraph + " " + clause.trim()).trim();
    }
  }
  if (paragraph) output.push(paragraph);
  return output;
}

export function readingText(text: string): string {
  // Exclude Markdown link labels. S-prefixed IDs and page-qualified source
  // markers occur alongside the simple numeric form in older dossiers.
  return text.replace(/\s*\[(?:S?\d+[a-z]?(?:[\s,;–—-]+S?\d+[a-z]?)*(?:,?\s*(?:printed\s+)?pp?\.\s*[\d,\s–—-]+)?)\](?!\()/gi, "")
    .replace(/\*\*/g, "");
}

export function readingBlocks(text: string, voices: string[]): { quote: boolean; text: string }[] {
  // Only exact passages selected as testimony become quotations. Nicknames,
  // work titles and words mentioned in passing stay within their sentences.
  const blocks: { quote: boolean; text: string }[] = [];
  let remaining = text;
  while (remaining) {
    let index = remaining.length;
    let voice = "";
    for (const candidate of voices) {
      const pos = remaining.indexOf(candidate);
      if (pos >= 0 && pos < index) { index = pos; voice = candidate; }
    }
    for (const part of paragraphs(remaining.slice(0, index).trim())) blocks.push({ quote: false, text: part });
    if (!voice) break;
    remaining = remaining.slice(index + voice.length);
    const punctuation = remaining.match(/^[.,;:!?]+/)?.[0] || "";
    blocks.push({ quote: true, text: voice + punctuation });
    remaining = remaining.slice(punctuation.length);
  }
  return blocks;
}

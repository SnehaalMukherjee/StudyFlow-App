export interface VivaItem {
  n: number;
  question: string;
  answer: string;
}

/** Parse Q1:/A1: structured viva output from the AI. */
export function parseVivaQa(text: string): VivaItem[] {
  const items: VivaItem[] = [];
  const sections = text.split(/\n(?=Q\d+\s*:)/i).filter((s) => s.trim());

  for (const section of sections) {
    const qMatch = section.match(/^Q(\d+)\s*:\s*([\s\S]*?)(?=\n\s*A\d+\s*:|$)/i);
    const aMatch = section.match(/\nA(\d+)\s*:\s*([\s\S]*)/i);
    if (!qMatch || !aMatch || qMatch[1] !== aMatch[1]) continue;

    const answer = aMatch[2]
      .trim()
      .replace(/\n(?=Q\d+\s*:)[\s\S]*$/i, "")
      .trim();

    items.push({
      n: parseInt(qMatch[1], 10),
      question: qMatch[2].trim().replace(/^\d+[.)]\s+/, ""),
      answer,
    });
  }

  return items.sort((a, b) => a.n - b.n);
}

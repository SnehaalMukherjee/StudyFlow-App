import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Renders AI markdown as readable document-style UI (no raw ### or **). */
export function AiFormattedResult({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);

  return (
    <article
      className={cn(
        "ai-result text-sm leading-relaxed text-foreground space-y-4 max-h-[min(70vh,32rem)] overflow-y-auto pr-2 rounded-md",
        className,
      )}
    >
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h1":
            return (
              <h2 key={i} className="text-xl font-bold tracking-tight border-b border-border pb-2">
                {block.content}
              </h2>
            );
          case "h2":
            return (
              <h3 key={i} className="text-lg font-semibold mt-2">
                {block.content}
              </h3>
            );
          case "h3":
            return (
              <h4 key={i} className="text-base font-semibold text-foreground/95 mt-1">
                {block.content}
              </h4>
            );
          case "hr":
            return <hr key={i} className="border-border" />;
          case "ul":
            return (
              <ul key={i} className="list-disc pl-5 space-y-2 text-foreground/90">
                {block.items.map((item, j) => (
                  <li key={j}>{formatInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal pl-5 space-y-2 text-foreground/90">
                {block.items.map((item, j) => (
                  <li key={j}>{formatInline(item)}</li>
                ))}
              </ol>
            );
          case "p":
            return (
              <p key={i} className="text-foreground/90">
                {formatInline(block.content)}
              </p>
            );
        }
      })}
    </article>
  );
}

type Block =
  | { type: "h1" | "h2" | "h3"; content: string }
  | { type: "hr" }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "p"; content: string };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list || list.items.length === 0) return;
    blocks.push({ type: list.ordered ? "ol" : "ul", items: list.items });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      // Blank lines between "1." items should not start a new <ol> (fixes all "1." in viva)
      if (list?.ordered) continue;
      flushList();
      continue;
    }

    if (/^={3,}$|^-{3,}$|^\*{3,}$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.+)$/);
    const h2 = trimmed.match(/^##\s+(.+)$/);
    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h3 || h2 || h1) {
      flushList();
      const content = stripMarkdownDecorations((h3 ?? h2 ?? h1)![1]);
      blocks.push({ type: h1 ? "h1" : h2 ? "h2" : "h3", content });
      continue;
    }

    const ul = trimmed.match(/^[*+\-•]\s+(.+)$/);
    const ol = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (ul || ol) {
      const item = stripMarkdownDecorations((ul ?? ol)![1]);
      const ordered = Boolean(ol);
      if (list && list.ordered === ordered) {
        list.items.push(item);
      } else {
        flushList();
        list = { ordered, items: [item] };
      }
      continue;
    }

    flushList();
    if (looksLikeSectionHeading(trimmed)) {
      blocks.push({ type: "h3", content: stripMarkdownDecorations(trimmed) });
      continue;
    }
    blocks.push({ type: "p", content: stripMarkdownDecorations(trimmed) });
  }

  flushList();
  return blocks;
}

function looksLikeSectionHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 56) return false;
  if (/[.!?:,;]$/.test(t)) return false;
  if (/^[*+\-•\d]/.test(t)) return false;
  return /^[A-Z0-9]/.test(t) && !t.includes("  ");
}

function stripMarkdownDecorations(s: string): string {
  return s.replace(/^\*\*(.+)\*\*$/g, "$1").replace(/^__(.+)__$/g, "$1").trim();
}

function formatInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /(\*\*.+?\*\*|__.+?__|\*.+?\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

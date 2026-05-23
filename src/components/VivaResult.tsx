import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { parseVivaQa } from "@/lib/viva";
import { AiFormattedResult } from "@/components/AiFormattedResult";
import { cn } from "@/lib/utils";

export function VivaResult({ text }: { text: string }) {
  const items = parseVivaQa(text);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());

  if (items.length === 0) {
    return <AiFormattedResult text={text} />;
  }

  const allRevealed = revealed.size === items.length;
  const toggle = (n: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  return (
    <div className="space-y-4 max-h-[min(70vh,32rem)] overflow-y-auto pr-2">
      <div className="flex flex-wrap gap-2 sticky top-0 bg-card/95 backdrop-blur-sm py-1 z-[1]">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRevealed(new Set(items.map((i) => i.n)))}
          disabled={allRevealed}
        >
          <Eye className="size-3.5" /> Show all answers
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRevealed(new Set())}
          disabled={revealed.size === 0}
        >
          <EyeOff className="size-3.5" /> Hide all
        </Button>
      </div>

      <ol className="space-y-4 list-none pl-0">
        {items.map((item) => {
          const open = revealed.has(item.n);
          return (
            <li
              key={item.n}
              className="rounded-lg border border-border/80 bg-background/40 p-4 space-y-3"
            >
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold tabular-nums">
                  {item.n}
                </span>
                <p className="text-sm leading-relaxed text-foreground/95 flex-1 pt-0.5">
                  {item.question}
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => toggle(item.n)}
              >
                {open ? (
                  <>
                    <ChevronUp className="size-3.5" /> Hide answer
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" /> Show answer
                  </>
                )}
              </Button>

              <div
                className={cn(
                  "rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/90 transition-all",
                  open ? "block" : "hidden",
                )}
              >
                <p className="text-xs font-medium text-primary mb-1">Model answer</p>
                {item.answer}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

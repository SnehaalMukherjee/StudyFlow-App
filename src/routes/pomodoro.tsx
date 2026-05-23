import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SubjectPicker } from "@/components/SubjectPicker";
import { useAuth } from "@/lib/auth-context";
import {
  countTodayFocusSessions,
  logPomodoroFocusSession,
  POMODORO_FOCUS_MINUTES,
} from "@/lib/pomodoro-sessions";
import { Play, Pause, RotateCcw, Coffee, Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pomodoro")({
  component: () => <AppShell><PomodoroView /></AppShell>,
  head: () => ({ meta: [{ title: "Pomodoro — StudyFlow" }] }),
});

const FOCUS = POMODORO_FOCUS_MINUTES * 60;
const BREAK = 5 * 60;

function PomodoroView() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secs, setSecs] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [subject, setSubject] = useState("");
  const [logging, setLogging] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    countTodayFocusSessions()
      .then(setSessions)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (running) {
      tick.current = setInterval(() => setSecs((s) => s - 1), 1000);
    } else if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  useEffect(() => {
    if (secs > 0) {
      completedRef.current = false;
      return;
    }
    if (completedRef.current) return;
    completedRef.current = true;
    setRunning(false);

    try {
      new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play();
    } catch {
      /* ignore */
    }

    if (mode === "focus") {
      void handleFocusComplete();
    } else {
      toast("Break over — back to focus");
      setMode("focus");
      setSecs(FOCUS);
    }
    // ref resets when secs > 0 (next phase)
  }, [secs, mode]);

  const handleFocusComplete = async () => {
    setMode("break");
    setSecs(BREAK);
    const sub = subject.trim() || "General study";
    if (!user) {
      setSessions((n) => n + 1);
      toast.success("Focus complete! Take a break.");
      return;
    }

    setLogging(true);
    try {
      await logPomodoroFocusSession(user.id, sub);
      const count = await countTodayFocusSessions();
      setSessions(count);
      toast.success(`Focus logged · ${POMODORO_FOCUS_MINUTES} min added to study hours`);
    } catch (e) {
      setSessions((n) => n + 1);
      toast.error(e instanceof Error ? e.message : "Could not log session");
      toast.success("Focus complete! Take a break.");
    } finally {
      setLogging(false);
    }
  };

  const reset = () => {
    setRunning(false);
    setSecs(mode === "focus" ? FOCUS : BREAK);
    completedRef.current = false;
  };

  const switchMode = (m: "focus" | "break") => {
    setMode(m);
    setSecs(m === "focus" ? FOCUS : BREAK);
    setRunning(false);
    completedRef.current = false;
  };

  const total = mode === "focus" ? FOCUS : BREAK;
  const pct = ((total - secs) / total) * 100;
  const mm = Math.floor(Math.max(secs, 0) / 60)
    .toString()
    .padStart(2, "0");
  const ss = (Math.max(secs, 0) % 60).toString().padStart(2, "0");

  return (
    <>
      <PageHeader title="Pomodoro Timer" description="Focus in sprints — logged to your study hours" />
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <SubjectPicker
            id="pom-subject"
            label="Subject for this session"
            value={subject}
            onChange={setSubject}
            disabled={running || logging}
            placeholder="Pick a subject"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Each completed focus block saves {POMODORO_FOCUS_MINUTES} min to Study Hours.
          </p>
        </div>

        <div className="flex gap-2 justify-center mb-6">
          <Button variant={mode === "focus" ? "default" : "outline"} size="sm" onClick={() => switchMode("focus")}>
            <Brain className="size-4" /> Focus
          </Button>
          <Button variant={mode === "break" ? "default" : "outline"} size="sm" onClick={() => switchMode("break")}>
            <Coffee className="size-4" /> Break
          </Button>
        </div>

        <div className="relative aspect-square max-w-sm mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-border)" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={mode === "focus" ? "var(--color-primary)" : "var(--color-success)"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - pct / 100)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl font-bold tabular-nums tracking-tight">{mm}:{ss}</div>
            <div className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">{mode}</div>
            {logging && <Loader2 className="size-5 animate-spin text-primary mt-2" />}
          </div>
        </div>

        <div className="flex gap-3 justify-center mt-8">
          <Button
            size="lg"
            onClick={() => setRunning((r) => !r)}
            className="shadow-[var(--shadow-glow)]"
            disabled={logging}
          >
            {running ? (
              <>
                <Pause className="size-4" /> Pause
              </>
            ) : (
              <>
                <Play className="size-4" /> Start
              </>
            )}
          </Button>
          <Button size="lg" variant="outline" onClick={reset} disabled={logging}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>

        <div className="text-center text-muted-foreground mt-6">
          Completed focus sessions today:{" "}
          <span className="font-semibold text-foreground">{sessions}</span>
        </div>
      </div>
    </>
  );
}

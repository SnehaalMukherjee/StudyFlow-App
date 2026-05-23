import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell, PageHeader, EmptyState, LoadingBlock } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { hasDuplicateExam } from "@/lib/exam-duplicates";
import { duplicateMessage, getDbErrorMessage } from "@/lib/supabase-errors";
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/exams")({
  component: ExamsPage,
  head: () => ({ meta: [{ title: "Exams — StudyFlow" }] }),
});

interface Exam {
  id: string; subject: string; exam_date: string; notes: string | null; created_at: string;
}

function countdown(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { label: `${Math.abs(diff)}d ago`, tone: "muted" as const };
  if (diff === 0) return { label: "Today", tone: "destructive" as const };
  if (diff === 1) return { label: "Tomorrow", tone: "primary" as const };
  return { label: `${diff} days left`, tone: diff <= 7 ? ("primary" as const) : ("muted" as const) };
}

function ExamsPage() {
  return (
    <AppShell>
      <ExamsView />
    </AppShell>
  );
}

function ExamsView() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("exams").select("*").order("exam_date", { ascending: true });
    if (error) toast.error(error.message); else setExams(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { setExams((e) => e.filter((x) => x.id !== id)); toast.success("Exam removed"); }
  };

  return (
    <>
      <PageHeader
        title="Exams"
        description="Stay ahead of every deadline"
        action={<NewExamDialog open={open} setOpen={setOpen} userId={user!.id} onCreated={load} />}
      />
      {loading ? <LoadingBlock /> : exams.length === 0 ? (
        <EmptyState>No exams scheduled. Add your first exam to start the countdown.</EmptyState>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {exams.map((e) => {
            const c = countdown(e.exam_date);
            const toneClass = c.tone === "destructive" ? "bg-destructive/15 text-destructive"
              : c.tone === "primary" ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground";
            return (
              <li key={e.id} className="bg-card border rounded-xl p-5 shadow-[var(--shadow-card)] group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{e.subject}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <CalendarClock className="size-3.5" />
                      {new Date(e.exam_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {e.notes && <p className="text-sm text-muted-foreground mt-2">{e.notes}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${toneClass}`}>{c.label}</span>
                </div>
                <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition">
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label="Delete">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function NewExamDialog({ open, setOpen, userId, onCreated }: { open: boolean; setOpen: (o: boolean) => void; userId: string; onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const trimmedSubject = subject.trim();
    try {
      if (await hasDuplicateExam(userId, trimmedSubject, date)) {
        toast.error(duplicateMessage("exam"));
        return;
      }
      const { error } = await supabase.from("exams").insert({
        user_id: userId,
        subject: trimmedSubject,
        exam_date: date,
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(getDbErrorMessage(error, "exam"));
        return;
      }
      toast.success("Exam added");
      setSubject("");
      setDate("");
      setNotes("");
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add exam");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-[var(--shadow-glow)]"><Plus className="size-4" /> New exam</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add an exam</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="s">Subject</Label><Input id="s" value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="d">Exam date</Label><Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="n">Notes (optional)</Label><Textarea id="n" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !subject || !date}>
              {busy && <Loader2 className="size-4 animate-spin" />} Add exam
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

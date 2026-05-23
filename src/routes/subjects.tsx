import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell, PageHeader, EmptyState, LoadingBlock } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { duplicateMessage, getDbErrorMessage } from "@/lib/supabase-errors";
import { hasDuplicateSubject } from "@/lib/subject-duplicates";
import { Award, Loader2, Plus, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/subjects")({
  component: () => <AppShell><SubjectsView /></AppShell>,
  head: () => ({ meta: [{ title: "Subjects — StudyFlow" }] }),
});

interface Row { id: string; subject_name: string; completed_topics: number; total_topics: number; }

function SubjectsView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("subjects").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { setRows((r) => r.filter((x) => x.id !== id)); toast.success("Removed"); }
  };

  return (
    <>
      <PageHeader
        title="Subject Progress"
        description="Track topic coverage per subject"
        action={<Button className="shadow-[var(--shadow-glow)]" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Add subject</Button>}
      />
      {loading ? <LoadingBlock /> : rows.length === 0 ? (
        <EmptyState>No subjects yet.</EmptyState>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {rows.map((r) => {
            const pct = r.total_topics === 0 ? 0 : Math.round((r.completed_topics / r.total_topics) * 100);
            const done = pct === 100 && r.total_topics > 0;
            return (
              <li key={r.id} className="bg-card border rounded-xl p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {r.subject_name}
                      {done && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/15 text-success"><Award className="size-3" /> Done</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{r.completed_topics} / {r.total_topics} topics</div>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{pct}%</span>
                </div>
                <Progress value={pct} className="mt-3" />
                <div className="mt-3 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }} aria-label="Edit"><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <SubjectDialog open={open} setOpen={setOpen} userId={user!.id} editing={editing} onSaved={load} />
    </>
  );
}

function SubjectDialog({ open, setOpen, userId, editing, onSaved }: {
  open: boolean; setOpen: (o: boolean) => void; userId: string; editing: Row | null; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [completed, setCompleted] = useState("0");
  const [total, setTotal] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.subject_name ?? "");
      setCompleted(String(editing?.completed_topics ?? 0));
      setTotal(String(editing?.total_topics ?? 0));
    }
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseInt(completed), t = parseInt(total);
    if (c > t) return toast.error("Completed cannot exceed total");
    setBusy(true);
    const trimmedName = name.trim();
    const payload = { subject_name: trimmedName, completed_topics: c, total_topics: t };
    try {
      if (await hasDuplicateSubject(userId, trimmedName, editing?.id)) {
        toast.error(duplicateMessage("subject"));
        return;
      }
      const { error } = editing
        ? await supabase.from("subjects").update(payload).eq("id", editing.id)
        : await supabase.from("subjects").insert({ ...payload, user_id: userId });
      if (error) {
        toast.error(getDbErrorMessage(error, "subject"));
        return;
      }
      toast.success(editing ? "Updated" : "Added");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save subject");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} subject</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="n">Subject name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="c">Completed topics</Label><Input id="c" type="number" min="0" value={completed} onChange={(e) => setCompleted(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="t">Total topics</Label><Input id="t" type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} required /></div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !name}>{busy && <Loader2 className="size-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { touchStreak } from "@/lib/streaks";
import { AppShell, PageHeader, EmptyState, LoadingBlock } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SubjectPicker } from "@/components/SubjectPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Loader2, Plus, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/study-hours")({
  component: () => <AppShell><HoursView /></AppShell>,
  head: () => ({ meta: [{ title: "Study Hours — StudyFlow" }] }),
});

interface Session { id: string; subject: string; duration_minutes: number; session_date: string; }

function HoursView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("study_sessions").select("*").order("session_date", { ascending: false }).limit(100);
    if (error) toast.error(error.message); else setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("study_sessions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { setRows((r) => r.filter((x) => x.id !== id)); toast.success("Removed"); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayMins = rows.filter((r) => r.session_date === today).reduce((s, r) => s + r.duration_minutes, 0);
  const weekData = buildWeekData(rows);
  const weekTotal = weekData.reduce((s, d) => s + d.minutes, 0);

  return (
    <>
      <PageHeader
        title="Study Hours"
        description="Log sessions, watch progress build up"
        action={<NewSessionDialog open={open} setOpen={setOpen} userId={user!.id} onCreated={load} />}
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Today" value={fmt(todayMins)} icon={Clock} />
        <StatCard label="This week" value={fmt(weekTotal)} />
        <StatCard label="Sessions logged" value={String(rows.length)} />
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-[var(--shadow-card)] mb-8">
        <div className="font-semibold mb-4">Last 7 days</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                formatter={(v: number) => [`${v} min`, "Studied"]}
              />
              <Bar dataKey="minutes" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="font-semibold mb-3">Recent sessions</div>
      {loading ? <LoadingBlock /> : rows.length === 0 ? (
        <EmptyState>No sessions logged yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 20).map((r) => (
            <li key={r.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3 shadow-[var(--shadow-card)] group">
              <div>
                <div className="font-medium">{r.subject}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.session_date).toLocaleDateString()} · {fmt(r.duration_minutes)}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="opacity-0 group-hover:opacity-100 transition" aria-label="Delete">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function fmt(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildWeekData(rows: Session[]) {
  const days: { day: string; date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), date: iso, minutes: 0 });
  }
  for (const r of rows) {
    const day = days.find((d) => d.date === r.session_date);
    if (day) day.minutes += r.duration_minutes;
  }
  return days;
}

function NewSessionDialog({ open, setOpen, userId, onCreated }: { open: boolean; setOpen: (o: boolean) => void; userId: string; onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("30");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subject.trim();
    if (!sub) return toast.error("Enter a subject");
    setBusy(true);
    const { error } = await supabase.from("study_sessions").insert({
      user_id: userId,
      subject: sub,
      duration_minutes: parseInt(duration),
      session_date: date,
    });
    if (!error) await touchStreak(userId).catch(() => {});
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Session logged");
    setSubject(""); setDuration("30"); setOpen(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-[var(--shadow-glow)]"><Plus className="size-4" /> Log session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log a study session</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <SubjectPicker id="s" value={subject} onChange={setSubject} disabled={busy} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="dur">Duration (min)</Label><Input id="dur" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="d">Date</Label><Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !subject.trim()}>{busy && <Loader2 className="size-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

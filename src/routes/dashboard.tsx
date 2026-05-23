import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { touchStreak } from "@/lib/streaks";
import { AppShell, PageHeader, LoadingBlock } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { duplicateMessage, getDbErrorMessage } from "@/lib/supabase-errors";
import { hasDuplicateTask, normalizeTaskDueDate } from "@/lib/task-duplicates";
import { examDueSoonLabel, daysUntilExam, isExamDueSoon } from "@/lib/exam-alerts";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Calendar, ListTodo, Loader2, Flame, Clock, CalendarClock, BookOpen, Pencil, AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Task { id: string; title: string; description: string | null; due_date: string | null; completed: boolean; created_at: string; }
interface Exam { id: string; subject: string; exam_date: string; }
interface Subject { subject_name: string; completed_topics: number; total_topics: number; }
interface Session { duration_minutes: number; session_date: string; }
interface Streak { streak_count: number; last_active_date: string | null; }

export const Route = createFileRoute("/dashboard")({
  component: () => <AppShell><Dashboard /></AppShell>,
  head: () => ({ meta: [{ title: "Dashboard — StudyFlow" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subs, setSubs] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [t, e, s, sess, st] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("exams").select("id, subject, exam_date").order("exam_date", { ascending: true }),
      supabase.from("subjects").select("subject_name, completed_topics, total_topics"),
      supabase.from("study_sessions").select("duration_minutes, session_date").gte("session_date", weekAgo()),
      supabase.from("streaks").select("streak_count, last_active_date").maybeSingle(),
    ]);
    setTasks(t.data ?? []);
    setExams(e.data ?? []);
    setSubs(s.data ?? []);
    setSessions(sess.data ?? []);
    setStreak(st.data ?? null);
    setLoading(false);
  };

  useEffect(() => { if (user) loadAll(); }, [user]);

  const toggleTask = async (task: Task) => {
    const next = !task.completed;
    const { error } = await supabase.from("tasks").update({ completed: next }).eq("id", task.id);
    if (error) return toast.error(error.message);
    setTasks((arr) => arr.map((x) => (x.id === task.id ? { ...x, completed: next } : x)));
    if (next && user) {
      const s = await touchStreak(user.id).catch(() => null);
      if (s != null) setStreak((prev) => ({ streak_count: s, last_active_date: new Date().toISOString().slice(0, 10) }));
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setTasks((t) => t.filter((x) => x.id !== id));
  };

  if (loading) return <LoadingBlock />;

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingExams = exams.filter((e) => e.exam_date >= today).slice(0, 3);
  const examsDueSoon = exams.filter((e) => isExamDueSoon(e.exam_date, today));
  const weekMinutes = sessions.reduce((s, r) => s + r.duration_minutes, 0);
  const weekData = buildWeekData(sessions);

  return (
    <>
      <PageHeader
        title={`Welcome back${user!.email ? `, ${user!.email.split("@")[0]}` : ""}`}
        description={`${pending.length} pending · ${completed.length} completed tasks`}
        action={
          <Button
            className="shadow-[var(--shadow-glow)]"
            onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}
          >
            <Plus className="size-4" /> New task
          </Button>
        }
      />

      {examsDueSoon.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              {examsDueSoon.length} exam{examsDueSoon.length === 1 ? "" : "s"} in the next 7 days
            </p>
            <p className="text-muted-foreground mt-0.5">
              {examsDueSoon.map((e) => e.subject).join(", ")} —{" "}
              <Link to="/exams" className="text-primary hover:underline">
                View exams
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={ListTodo} label="Total tasks" value={tasks.length} />
        <Stat icon={CalendarClock} label="Upcoming exams" value={exams.filter((e) => e.exam_date >= today).length} />
        <Stat icon={Clock} label="Hours this week" value={`${(weekMinutes / 60).toFixed(1)}h`} />
        <Stat icon={Flame} label="Day streak" value={streak?.streak_count ?? 0} accent="primary" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold flex items-center gap-2"><Clock className="size-4 text-primary" /> Study hours · last 7 days</div>
            <Link to="/study-hours" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="h-56">
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

        <div className="bg-card border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold flex items-center gap-2"><CalendarClock className="size-4 text-primary" /> Upcoming exams</div>
            <Link to="/exams" className="text-xs text-primary hover:underline">All</Link>
          </div>
          {upcomingExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exams scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingExams.map((e) => {
                const days = daysUntilExam(e.exam_date, today);
                const soon = isExamDueSoon(e.exam_date, today);
                return (
                  <li
                    key={e.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2",
                      soon && "bg-destructive/10 border border-destructive/25",
                    )}
                  >
                    <div>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {soon && <AlertTriangle className="size-3.5 text-destructive" />}
                        {e.subject}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(e.exam_date).toLocaleDateString()}</div>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        soon ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
                      )}
                    >
                      {examDueSoonLabel(days)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-[var(--shadow-card)] mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Subject progress</div>
          <Link to="/subjects" className="text-xs text-primary hover:underline">All</Link>
        </div>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add subjects to track topic coverage.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {subs.slice(0, 4).map((s) => {
              const pct = s.total_topics === 0 ? 0 : Math.round((s.completed_topics / s.total_topics) * 100);
              return (
                <li key={s.subject_name}>
                  <div className="flex justify-between text-sm mb-1"><span>{s.subject_name}</span><span className="text-muted-foreground">{pct}%</span></div>
                  <Progress value={pct} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <TaskList
            tasks={pending}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true); }}
            emptyText="No pending tasks. Add one to get started."
          />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <TaskList
            tasks={completed}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true); }}
            emptyText="Nothing completed yet."
          />
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={taskDialogOpen}
        setOpen={setTaskDialogOpen}
        task={editingTask}
        userId={user!.id}
        onSaved={() => { setTaskDialogOpen(false); setEditingTask(null); loadAll(); }}
      />
    </>
  );
}

function weekAgo() {
  const d = new Date(); d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

function buildWeekData(rows: Session[]) {
  const days: { day: string; date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), date: d.toISOString().slice(0, 10), minutes: 0 });
  }
  for (const r of rows) {
    const day = days.find((d) => d.date === r.session_date);
    if (day) day.minutes += r.duration_minutes;
  }
  return days;
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; accent?: "primary" | "success" }) {
  const color = accent === "primary" ? "text-primary" : accent === "success" ? "text-success" : "text-muted-foreground";
  return (
    <div className="bg-card border rounded-xl p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${color}`} />
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function TaskList({ tasks, onToggle, onDelete, onEdit, emptyText }: {
  tasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  onEdit: (t: Task) => void;
  emptyText: string;
}) {
  if (tasks.length === 0) return <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">{emptyText}</div>;
  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id} className="bg-card border rounded-xl p-4 flex items-start gap-3 shadow-[var(--shadow-card)] group hover:border-primary/40 transition">
          <Checkbox checked={task.completed} onCheckedChange={() => onToggle(task)} className="mt-1" />
          <div className="flex-1 min-w-0">
            <div className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</div>
            {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
            {task.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Calendar className="size-3" /> Due {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex opacity-0 group-hover:opacity-100 transition">
            <Button variant="ghost" size="icon" onClick={() => onEdit(task)} aria-label="Edit">
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} aria-label="Delete">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function taskDueInputValue(due: string | null) {
  if (!due) return "";
  return due.slice(0, 10);
}

function TaskFormDialog({
  open,
  setOpen,
  task,
  userId,
  onSaved,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  task: Task | null;
  userId: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const isEdit = task !== null;

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setDueDate(taskDueInputValue(task?.due_date ?? null));
    }
  }, [open, task]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const trimmedTitle = title.trim();
    const payload = {
      title: trimmedTitle,
      description: description.trim() || null,
      due_date: dueDate ? normalizeTaskDueDate(dueDate) : null,
    };

    try {
      const duplicate = await hasDuplicateTask(
        userId,
        trimmedTitle,
        dueDate,
        isEdit ? task.id : undefined,
      );
      if (duplicate) {
        toast.error(duplicateMessage("task"));
        return;
      }

      const { error } = isEdit
        ? await supabase.from("tasks").update(payload).eq("id", task.id)
        : await supabase.from("tasks").insert({ ...payload, user_id: userId });

      if (error) {
        toast.error(getDbErrorMessage(error, "task"));
        return;
      }
      toast.success(isEdit ? "Task updated" : "Task added");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "Add a task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Math homework chapter 5"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes, links, requirements…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due">Due date (optional)</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

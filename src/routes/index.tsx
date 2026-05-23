import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle2, ListTodo, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "StudyFlow — Student Productivity Dashboard" },
      { name: "description", content: "Track assignments, manage tasks, and stay on top of your studies with a clean, modern dashboard." },
    ],
  }),
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <GraduationCap className="size-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">StudyFlow</span>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/auth">Log in</Link></Button>
          <Button asChild><Link to="/auth">Get started</Link></Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center text-center py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/40 border text-sm text-muted-foreground mb-6">
          <Sparkles className="size-3.5 text-primary" />
          Built for focused students
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-3xl bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
          Your study life, organized.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl">
          Capture assignments, track deadlines, and check off tasks as you go. A calm, modern dashboard for students who want to stay on top.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg" className="shadow-[var(--shadow-glow)]">
            <Link to="/auth">Start for free</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-20 w-full max-w-4xl">
          {[
            { icon: ListTodo, title: "Plan assignments", desc: "Add tasks with due dates and details." },
            { icon: CheckCircle2, title: "Track progress", desc: "Mark complete and watch the list shrink." },
            { icon: Sparkles, title: "Stay focused", desc: "A clean, distraction-free dark UI." },
          ].map((f) => (
            <div key={f.title} className="bg-card border rounded-xl p-6 text-left shadow-[var(--shadow-card)]">
              <f.icon className="size-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

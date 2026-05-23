import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, FileText, MessageSquareQuote, CalendarDays } from "lucide-react";
import { generateWithAi } from "@/lib/ai";
import { AiFormattedResult } from "@/components/AiFormattedResult";
import { VivaResult } from "@/components/VivaResult";
import { toast } from "sonner";

export const Route = createFileRoute("/ai")({
  component: () => <AppShell><AIView /></AppShell>,
  head: () => ({ meta: [{ title: "AI Tools — StudyFlow" }] }),
});

function AIView() {
  return (
    <>
      <PageHeader title="AI Tools" description="Free AI helpers for planning, summarizing, and viva prep" />
      <Tabs defaultValue="planner">
        <TabsList>
          <TabsTrigger value="planner"><CalendarDays className="size-4" /> Planner</TabsTrigger>
          <TabsTrigger value="summarizer"><FileText className="size-4" /> Summarizer</TabsTrigger>
          <TabsTrigger value="viva"><MessageSquareQuote className="size-4" /> Viva Qs</TabsTrigger>
        </TabsList>
        <TabsContent value="planner" className="mt-6"><Planner /></TabsContent>
        <TabsContent value="summarizer" className="mt-6"><Summarizer /></TabsContent>
        <TabsContent value="viva" className="mt-6"><Viva /></TabsContent>
      </Tabs>
    </>
  );
}

function ToolCard({ title, description, children, output }: { title: string; description: string; children: React.ReactNode; output: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-card border rounded-xl p-6 shadow-[var(--shadow-card)]">
        <h3 className="font-semibold flex items-center gap-2"><Sparkles className="size-4 text-primary" /> {title}</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{description}</p>
        {children}
      </div>
      <div className="bg-card border rounded-xl p-6 shadow-[var(--shadow-card)] min-h-[240px]">
        <h3 className="font-semibold mb-4">Result</h3>
        {output}
      </div>
    </div>
  );
}

function ResultOutput({ text }: { text: string }) {
  return <AiFormattedResult text={text} />;
}

function Planner() {
  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState("2");
  const [exams, setExams] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const result = await generateWithAi("planner", { subjects, hours, exams });
      setOut(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolCard
      title="Study Planner"
      description="Generate a balanced daily plan from your subjects, time budget, and exam dates."
      output={out ? <ResultOutput text={out} /> : <p className="text-sm text-muted-foreground">Fill the form and generate to see your plan.</p>}
    >
      <div className="space-y-3">
        <div className="space-y-1"><Label>Subjects (comma separated)</Label><Input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Math, Physics, History" /></div>
        <div className="space-y-1"><Label>Available hours / day</Label><Input type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
        <div className="space-y-1"><Label>Exam dates (optional)</Label><Input value={exams} onChange={(e) => setExams(e.target.value)} placeholder="Math: Jun 12, Physics: Jun 20" /></div>
        <Button onClick={run} disabled={busy || !subjects.trim()} className="w-full mt-2">{busy && <Loader2 className="size-4 animate-spin" />} Generate plan</Button>
      </div>
    </ToolCard>
  );
}

function Summarizer() {
  const [text, setText] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const result = await generateWithAi("summarizer", { text });
      setOut(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to summarize");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolCard
      title="Notes Summarizer"
      description="Paste notes and get a concise summary you can revise from."
      output={out ? <ResultOutput text={out} /> : <p className="text-sm text-muted-foreground">Your summary will appear here.</p>}
    >
      <div className="space-y-3">
        <div className="space-y-1"><Label>Notes</Label><Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your notes…" /></div>
        <Button onClick={run} disabled={busy || !text.trim()} className="w-full">{busy && <Loader2 className="size-4 animate-spin" />} Summarize</Button>
      </div>
    </ToolCard>
  );
}

function Viva() {
  const [topic, setTopic] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const result = await generateWithAi("viva", { topic });
      setOut(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate questions");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolCard
      title="Viva Question Generator"
      description="Get practice questions for any topic to prep for orals and interviews."
      output={out ? <VivaResult text={out} /> : <p className="text-sm text-muted-foreground">Questions will appear here.</p>}
    >
      <div className="space-y-3">
        <div className="space-y-1"><Label>Topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Photosynthesis, Big-O notation…" /></div>
        <Button onClick={run} disabled={busy || !topic.trim()} className="w-full">{busy && <Loader2 className="size-4 animate-spin" />} Generate questions</Button>
      </div>
    </ToolCard>
  );
}

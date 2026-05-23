import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: () => (
    <AppShell>
      <SettingsView />
    </AppShell>
  ),
  head: () => ({ meta: [{ title: "Settings — StudyFlow" }] }),
});

function SettingsView() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPassword("");
    setConfirm("");
  };

  return (
    <>
      <PageHeader title="Settings" description="Account and appearance" />

      <div className="grid gap-6 max-w-lg">
        <section className="bg-card border rounded-xl p-6 shadow-[var(--shadow-card)] space-y-4">
          <h2 className="font-semibold">Account</h2>
          <div className="space-y-1">
            <Label className="text-muted-foreground">Email</Label>
            <p className="text-sm font-medium break-all">{user?.email ?? "—"}</p>
          </div>
        </section>

        <section className="bg-card border rounded-xl p-6 shadow-[var(--shadow-card)] space-y-4">
          <h2 className="font-semibold">Appearance</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="size-5 text-primary" />
              ) : (
                <Sun className="size-5 text-primary" />
              )}
              <div>
                <p className="font-medium text-sm">Light theme</p>
                <p className="text-xs text-muted-foreground">Switch between dark and light mode</p>
              </div>
            </div>
            <Switch
              checked={theme === "light"}
              onCheckedChange={(on) => setTheme(on ? "light" : "dark")}
              aria-label="Toggle light theme"
            />
          </div>
        </section>

        <section className="bg-card border rounded-xl p-6 shadow-[var(--shadow-card)] space-y-4">
          <h2 className="font-semibold">Change password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">New password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input
                id="pw2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={busy || !password}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}

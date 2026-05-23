import { type ReactNode, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  LogOut,
  Loader2,
  LayoutDashboard,
  CalendarClock,
  BookOpen,
  Timer,
  Clock,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { to: "/exams", label: "Exams", icon: CalendarClock, mobile: true },
  { to: "/subjects", label: "Subjects", icon: BookOpen, mobile: false },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer, mobile: true },
  { to: "/study-hours", label: "Hours", icon: Clock, mobile: true },
  { to: "/ai", label: "AI", icon: Sparkles, mobile: true },
] as const;

const MOBILE_NAV = NAV.filter((n) => n.mobile);

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/40 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div
              className="size-9 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <GraduationCap className="size-5 text-primary-foreground" />
            </div>
            <span className="font-semibold hidden sm:inline">StudyFlow</span>
          </Link>

          <nav className="flex-1 overflow-x-auto hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} label={n.label} icon={n.icon} active={path === n.to} />
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
              <Link to="/settings" aria-label="Settings">
                <Settings className="size-4" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground hidden lg:inline truncate max-w-[140px]">
              {user.email}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-6xl pb-24 md:pb-8">
        {children}
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-card/95 backdrop-blur-md safe-area-pb"
        aria-label="Main navigation"
      >
        <ul className="flex items-stretch justify-around px-1 py-2">
          {MOBILE_NAV.map((n) => {
            const active = path === n.to;
            return (
              <li key={n.to} className="flex-1 max-w-[5.5rem]">
                <Link
                  to={n.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition",
                    active ? "text-primary bg-primary/15" : "text-muted-foreground",
                  )}
                >
                  <n.icon className="size-5" />
                  <span className="truncate w-full text-center px-0.5">{n.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1 max-w-[5.5rem]">
            <Link
              to="/settings"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition",
                path === "/settings" ? "text-primary bg-primary/15" : "text-muted-foreground",
              )}
            >
              <Settings className="size-5" />
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
      {children}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

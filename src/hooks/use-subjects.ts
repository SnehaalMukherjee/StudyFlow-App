import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useSubjectNames() {
  const { user } = useAuth();
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNames([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("subjects")
        .select("subject_name")
        .order("subject_name", { ascending: true });

      if (!cancelled) {
        if (!error) setNames((data ?? []).map((r) => r.subject_name));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { names, loading };
}

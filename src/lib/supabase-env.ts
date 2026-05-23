/** Project ref from https://<ref>.supabase.co */
export function projectRefFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

/** Project ref embedded in the anon JWT (`ref` claim). */
export function projectRefFromAnonKey(key: string): string | null {
  try {
    const part = key.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { ref?: string };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

/** Returns a user-facing message when URL and anon key are from different projects. */
export function supabaseEnvMismatchMessage(url: string, anonKey: string): string | null {
  const urlRef = projectRefFromUrl(url);
  const keyRef = projectRefFromAnonKey(anonKey);
  if (!urlRef || !keyRef || urlRef === keyRef) return null;
  return (
    `Supabase misconfiguration: URL is for project "${urlRef}" but your API key is for "${keyRef}". ` +
    `Open Supabase → Settings → API for project ${urlRef}, copy the anon public key into .env ` +
    `(SUPABASE_PUBLISHABLE_KEY and VITE_SUPABASE_PUBLISHABLE_KEY), then restart the dev server.`
  );
}

# StudyFlow

Student productivity dashboard: tasks, exams, subject progress, Pomodoro, study hours, and AI tools.

## Stack

- React + TypeScript + Vite + TanStack Start/Router
- Supabase (auth, database, edge functions)
- Tailwind CSS + shadcn/ui

## Local setup

1. Clone and install:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill Supabase keys from [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API.

3. Run SQL migrations in `supabase/migrations/` (in order) via Supabase SQL Editor.

4. Deploy edge function `ai-tools` and set secrets `GEMINI_API_KEY` and/or `GROQ_API_KEY`.

5. Start dev server:

```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Deploy

Build with env vars set on your host (Cloudflare, Vercel, etc.):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Redeploy after env changes.

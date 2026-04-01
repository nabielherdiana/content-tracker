# Content Tracker

Production-ready web app untuk content creator high-workload (40+ konten/bulan) dengan dashboard operasional, task management, custom fields dinamis, dan AI import workflow.

## Live Website

- Production URL: [http://aicontenttracker.netlify.app](http://aicontenttracker.netlify.app)

## Stack

- Next.js App Router + TypeScript strict
- Tailwind CSS + shadcn/ui + Lucide
- Supabase (Auth + Database)
- React Hook Form + Zod
- TanStack Table
- Recharts
- OpenAI-compatible AI parser abstraction (+ Google fallback)

## Fitur Utama (MVP++)

- Auth wajib login (Google OAuth via Supabase)
- Route protection `/dashboard`, `/tasks`, `/ai-import`, `/settings`
- Dashboard KPI: total, progress bulanan, due today/week, overdue, status breakdown
- CRUD task lengkap: create, read, update, delete, duplicate
- Bulk update status task
- Task views: table, card, kanban
- Search, filter, sort
- Task detail + activity log
- Custom fields dinamis dari UI (text, textarea, number, date, select, multi-select, boolean, url)
- AI prompt import dengan flow parse -> preview/edit -> save
- AI action mode: `create_one`, `create_many`, `update_existing`
- AI prompt logs
- i18n dasar (ID/EN) + language switcher
- Theme toggle (light/dark/system) + persistence

## Struktur Folder

```txt
src/
  app/
    (auth)/login
    (dashboard)/dashboard
    (dashboard)/tasks
    (dashboard)/ai-import
    (dashboard)/settings
    api/ai/parse
    auth/callback
  components/
    providers/
    shared/
    ui/
  features/
    ai-import/
    auth/
    content/
    custom-fields/
    dashboard/
    settings/
  lib/
    ai/
    i18n/
    supabase/
  types/
  validations/
```

## Database Setup (Supabase)

1. Buka Supabase Project -> SQL Editor.
2. Jalankan file schema:
   - `src/lib/supabase/schema.sql`
3. Jika project sudah pernah jalan sebelumnya dan muncul error `preferred_language`/`preferred_theme`:
   - Jalankan migration:
   - `src/lib/supabase/migrations/20260331_add_profile_preferences.sql`
4. (Opsional) isi dummy data:
   - `src/lib/supabase/seed.sql`

Tabel utama:

- `profiles`
- `content_items`
- `custom_field_definitions`
- `custom_field_options`
- `content_item_custom_values`
- `activity_logs`
- `ai_prompt_logs`

## Environment Variables

Copy `.env.example` ke `.env.local` lalu isi nilainya.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

AI parser default:

- `OPENAI_API_KEY`
- `OPENAI_API_BASE_URL` (default `https://api.openai.com/v1`)
- `OPENAI_MODEL`

Fallback (opsional):

- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_MODEL`

AI anti-spam (opsional, direkomendasikan):

- `AI_PARSE_COOLDOWN_MS` (default `3000`)
- `AI_PARSE_MAX_PER_10_MIN` (default `40`)

Catatan provider AI:

- Jika `OPENAI_API_KEY` diisi, parser akan mencoba provider OpenAI-compatible lebih dulu.
- Jika ingin full Gemini, kosongkan `OPENAI_API_KEY` dan isi `GOOGLE_GENERATIVE_AI_API_KEY`.

## Google OAuth Setup (Supabase Auth)

1. Google Cloud Console:
   - Buat OAuth Client ID (Web application)
   - Authorized redirect URI local: `http://localhost:3000/auth/callback`
   - Authorized redirect URI production: `https://<your-domain>/auth/callback`
2. Supabase -> Authentication -> Providers -> Google:
   - Isi Client ID + Client Secret
3. Supabase -> Authentication -> URL Configuration:
   - Site URL local: `http://localhost:3000`
   - Tambahkan redirect URL production

## Jalankan Lokal

```bash
npm install
npm run dev
```

Akses:

- `http://localhost:3000`

## Deploy ke Vercel

1. Push repo ke GitHub.
2. Import project di Vercel.
3. Isi env vars yang sama dengan `.env.example`.
4. Tambahkan domain bila perlu.
5. Di Supabase, update redirect URL ke domain Vercel.

## Deploy ke Netlify

1. Connect repo ke Netlify.
2. Netlify akan membaca `netlify.toml` otomatis.
3. Pastikan settings berikut:
   - Build command: `npm run build`
   - Publish directory: kosongkan (otomatis ditangani Next.js runtime Netlify)
4. Isi environment variables di Netlify UI:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = URL site Netlify production (contoh: `https://aicontenttracker.netlify.app`)
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `GOOGLE_MODEL` (disarankan: `gemini-2.0-flash` atau model Gemini aktif lain)
   - Optional: `OPENAI_API_KEY`, `OPENAI_API_BASE_URL`, `OPENAI_MODEL`
5. Di Supabase Auth > URL Configuration:
   - Site URL: URL Netlify production
   - Redirect URL: `https://<netlify-domain>/auth/callback`
6. Di Google Cloud OAuth client:
   - Authorized redirect URI: `https://<netlify-domain>/auth/callback`
7. Trigger deploy.

## Checklist Sebelum Deploy Netlify

Jalankan ini di lokal sebelum push:

```bash
npm run predeploy:netlify
```

Checklist:

- Migration Supabase sudah dijalankan.
- OAuth redirect URL sudah sinkron (Google + Supabase + Netlify domain).
- Variable `NEXT_PUBLIC_SITE_URL` mengarah ke domain production.
- Jika pakai Gemini saja, `OPENAI_API_KEY` dikosongkan.

## Custom Domain

1. Tambahkan custom domain di Vercel/Netlify.
2. Arahkan DNS di registrar:
   - `A` / `CNAME` sesuai instruksi hosting.
3. Tunggu propagasi DNS.
4. Update:
   - `NEXT_PUBLIC_SITE_URL`
   - Supabase Auth redirect URLs
   - Google OAuth authorized redirect URIs

## Security Checklist

- Jangan expose service role key ke client.
- Gunakan anon key hanya di frontend.
- RLS aktif untuk seluruh tabel user data.
- Semua write action server-side tervalidasi Zod.
- AI endpoint harus login dulu.

## Future Roadmap

- Multi-user team roles
- Attachment upload (Supabase Storage)
- Calendar planner
- Internal comments
- AI brief rewriting + suggestion engine
- WhatsApp/Telegram reminders
- Recurring content template engine

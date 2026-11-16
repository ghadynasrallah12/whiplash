# Whiplash dashboard — going live

Until you do this, the dashboard runs in **demo mode** (open `admin/index.html`, any email/password, data stays in your browser).

Everything below is free. About 15 minutes.

## 1. Supabase (database + logins)
1. Create a project at supabase.com (pick a region close to Lebanon, e.g. Frankfurt).
2. **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up" (people are added from the dashboard instead).
4. **Authentication → Users → Add user → Create new user**: your email + a password, tick "Auto Confirm User".
   The first user created becomes the **owner** automatically.
5. **Project Settings → API**: copy the **Project URL**, the **anon / publishable** key and the **service_role / secret** key.

## 2. Uploads
Nothing to set up: images and clips go into Supabase Storage (the `media` bucket that schema.sql creates).

Free plan limits: 1 GB in total, 50 MB per file. Keep preview clips short (10 to 20 seconds, 1080p, about 5 to 15 MB each).
Full films go in as Vimeo / YouTube links, which have no limit.

## 3. admin/config.js
Fill in `supabaseUrl` and `supabaseAnonKey` (these two are safe to be public). Commit and push.

## 4. Vercel → Project → Settings → Environment Variables
Add these (Production + Preview), then **redeploy**:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_KEY` | service_role / secret key — **never** put this in config.js |

## 5. Use it
Open `https://<your-site>/admin`, sign in, then **People → Add person** for the client's team.
Give each person their first password yourself; they change it under **Account**.

## Files
- `admin/` — the dashboard (`index.html`, `admin.css`, `admin.js`, `config.js`)
- `api/users.js` — add / remove people (owners only)
- `supabase/schema.sql` — tables, security rules, the upload bucket, starting texts and categories

Note: People → Add/Remove needs the `api/` function, so it works on Vercel (or `vercel dev`), not on a plain local file server.
Free Supabase projects pause after a week with no activity — any visit to the site counts once the site reads from it.

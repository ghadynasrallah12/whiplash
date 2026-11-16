-- =========================================================
-- WHIPLASH — database for the dashboard + website
-- Run this once: Supabase → SQL Editor → paste → Run.
-- Safe to run again (it only creates what is missing).
-- =========================================================

-- ---------- Who may use the dashboard ----------
create table if not exists public.editors (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null default '',
  role       text not null default 'editor' check (role in ('owner','editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editors where user_id = auth.uid());
$$;

-- The very first user you create becomes the owner automatically.
create or replace function public.first_user_is_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.editors) then
    insert into public.editors (user_id, email, name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''), 'owner')
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists whiplash_first_owner on auth.users;
create trigger whiplash_first_owner after insert on auth.users
  for each row execute function public.first_user_is_owner();

-- ---------- Content ----------
create table if not exists public.categories (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  position int  not null default 0
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  position    int  not null default 0,
  name        text not null,
  type        text not null default '',          -- "Music Video", "Fashion Film"…
  category_id uuid references public.categories(id) on delete set null,
  description text not null default '',
  thumb_url   text not null default '',          -- 16:9 still shown in the list
  video_url   text not null default '',          -- short preview clip (uploaded)
  film_link   text not null default '',          -- full film on Vimeo / YouTube
  logo_url    text not null default '',
  award_url   text not null default '',
  credits     jsonb not null default '[]',       -- [["Director","Name"], …]
  is_hero     boolean not null default false,    -- its clip plays behind the homepage
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.clients (
  id       uuid primary key default gen_random_uuid(),
  position int  not null default 0,
  name     text not null,
  logo_url text not null default '',
  website  text not null default ''
);

-- About page: the chapters (History, Countries, Services…)
create table if not exists public.chapters (
  id        uuid primary key default gen_random_uuid(),
  position  int  not null default 0,
  title     text not null,                       -- the big word in the list
  caption   text not null default '',            -- small line under the picture ("Since 20XX")
  image_url text not null default '',
  page      text not null default ''             -- 'timeline' = clicking it opens the History timeline
);
alter table public.chapters add column if not exists page text not null default '';

-- History timeline: the dates the playhead runs through
create table if not exists public.milestones (
  id       uuid primary key default gen_random_uuid(),
  position int  not null default 0,
  year     text not null default '',             -- "2014" (text, so "Now" or "20XX" work too)
  title    text not null,
  line     text not null default ''
);

create table if not exists public.texts (
  key        text primary key,                   -- "about.lead1"
  group_name text not null,                      -- "About"
  label      text not null,                      -- shown in the dashboard
  kind       text not null default 'long' check (kind in ('short','long')),
  value      text not null default '',
  position   int  not null default 0
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------- Security: everyone can read, only editors can change ----------
alter table public.editors    enable row level security;
alter table public.categories enable row level security;
alter table public.projects   enable row level security;
alter table public.clients    enable row level security;
alter table public.texts      enable row level security;
alter table public.chapters   enable row level security;
alter table public.milestones enable row level security;

drop policy if exists "editors read"     on public.editors;
create policy "editors read" on public.editors for select using (public.is_editor());
-- (adding / removing people goes through the server function, which uses the secret key)

drop policy if exists "public read"  on public.categories;
drop policy if exists "editor write" on public.categories;
create policy "public read"  on public.categories for select using (true);
create policy "editor write" on public.categories for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists "public read"  on public.projects;
drop policy if exists "editor write" on public.projects;
create policy "public read"  on public.projects for select using (published or public.is_editor());
create policy "editor write" on public.projects for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists "public read"  on public.clients;
drop policy if exists "editor write" on public.clients;
create policy "public read"  on public.clients for select using (true);
create policy "editor write" on public.clients for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists "public read"  on public.texts;
drop policy if exists "editor write" on public.texts;
create policy "public read"  on public.texts for select using (true);
create policy "editor write" on public.texts for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists "public read"  on public.chapters;
drop policy if exists "editor write" on public.chapters;
create policy "public read"  on public.chapters for select using (true);
create policy "editor write" on public.chapters for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists "public read"  on public.milestones;
drop policy if exists "editor write" on public.milestones;
create policy "public read"  on public.milestones for select using (true);
create policy "editor write" on public.milestones for all using (public.is_editor()) with check (public.is_editor());

-- ---------- Uploaded images and clips ----------
-- One public bucket: anyone can view a file by its link, only editors can add / replace / delete.
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "whiplash media insert" on storage.objects;
drop policy if exists "whiplash media update" on storage.objects;
drop policy if exists "whiplash media delete" on storage.objects;
create policy "whiplash media insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_editor());
create policy "whiplash media update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_editor());
create policy "whiplash media delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_editor());

-- ---------- Starting content (only added when missing) ----------
insert into public.categories (name, position)
select v.name, v.position from (values
  ('Runway',1), ('Cuts on Beat',2), ('Director''s Cut',3), ('Full Throttle',4), ('Postcards',5), ('Prime Time',6)
) as v(name, position)
where not exists (select 1 from public.categories);

insert into public.chapters (title, caption, position, page)
select v.title, v.caption, v.position, v.page from (values
  ('History',   'Since 20XX',           1, 'timeline'),
  ('Countries', 'Beirut / Dubai / KSA', 2, ''),
  ('Services',  'Edit to delivery',     3, '')
) as v(title, caption, position, page)
where not exists (select 1 from public.chapters);

insert into public.milestones (year, title, line, position)
select v.year, v.title, v.line, v.position from (values
  ('20XX', 'Founded in Beirut',       'Two editors, one room, one deadline.', 1),
  ('20XX', 'First global brand',      'The cut that put us on the map.',      2),
  ('20XX', 'Colour & sound in-house', 'Every craft under one roof.',          3),
  ('20XX', 'Dubai',                   'A second home for the studio.',        4),
  ('20XX', 'KSA',                     'Cutting for the Kingdom.',             5),
  ('20XX', 'Now',                     'Still obsessed with the frame.',       6)
) as v(year, title, line, position)
where not exists (select 1 from public.milestones);

insert into public.texts (key, group_name, label, kind, value, position) values
  ('home.tagline',    'Home', 'Line under the film, left',  'short', 'Post-production · Beirut / Dubai / KSA', 1),
  ('home.reel_label', 'Home', 'Label next to the timecode', 'short', 'Showreel 26', 2),
  ('about.lead1',  'About',   'Opening line',        'long',  'We come from music, not film. That''s why we care so much about timing. If it doesn''t feel right, we don''t move on.', 1),
  ('about.lead2',  'About',   'Second paragraph',    'long',  'Whiplash is a post-production studio that believes in the power of precision-driven storytelling where every frame is intentional, every cut has weight, and every detail exists.', 2),
  ('about.lead3',  'About',   'Third paragraph',     'long',  'We combine strong creative direction with disciplined execution.', 3),
  ('about.small1', 'About',   'Small text, left',    'long',  'Driven by sound design as much as image, we shape a complete sensory experience; where audio and visuals work seamlessly and land deeply, memorably and with impact.', 4),
  ('about.small2', 'About',   'Small text, right',   'long',  'From offline to online edit, VFX, grading, and full creative direction, we shape every stage of the process; designing rhythm, flow, visual language, and sound to create films that don''t just tell stories, but stay with people.', 5),
  ('contact.email',     'Contact', 'Email',          'short', '', 1),
  ('contact.phone',     'Contact', 'Phone',          'short', '', 2),
  ('contact.address',   'Contact', 'Address',        'long',  '', 3),
  ('contact.instagram', 'Contact', 'Instagram link', 'short', '', 4),
  ('contact.vimeo',     'Contact', 'Vimeo link',     'short', '', 5),
  ('seo.title',         'Search and sharing', 'Site title',                      'short', 'Whiplash', 1),
  ('seo.description',   'Search and sharing', 'Description shown on Google',     'long',  'Whiplash — post-production studio.', 2)
on conflict (key) do nothing;

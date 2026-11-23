-- Heddi Strategies: Insights blog + Content Studio
-- Tables: editors, authors, topics, posts, subscribers, newsletter_settings
-- Storage: blog-media (public read, editor write)

create extension if not exists citext;

-- ---------- Editors (who can sign in to Content Studio) ----------
create table public.editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  role text not null default 'editor' check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);
alter table public.editors enable row level security;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editors where user_id = auth.uid());
$$;
revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

create policy "editors read editors" on public.editors
  for select to authenticated using (public.is_editor());

-- ---------- Authors (bylines) ----------
create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.authors enable row level security;
create policy "public reads authors" on public.authors for select using (true);
create policy "editors write authors" on public.authors for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- ---------- Topics ----------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  label text not null,
  icon text not null default 'article',
  sort int not null default 0
);
alter table public.topics enable row level security;
create policy "public reads topics" on public.topics for select using (true);
create policy "editors write topics" on public.topics for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- ---------- Posts ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null default 'Untitled article',   -- *phrase* renders as sage italics
  summary text,
  body_html text not null default '',
  cover_url text,
  cover_alt text,
  topic_id uuid references public.topics(id) on delete set null,
  author_id uuid references public.authors(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  publish_at timestamptz,
  featured boolean not null default false,
  notify_subscribers boolean not null default true,
  emailed_at timestamptz,
  meta_title text,
  meta_description text,
  read_minutes int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_live_idx on public.posts (status, publish_at desc);
alter table public.posts enable row level security;

-- Readers see published posts, and scheduled posts once their time has passed.
create policy "public reads live posts" on public.posts for select
  using (status in ('published','scheduled') and publish_at is not null and publish_at <= now());
create policy "editors read all posts" on public.posts for select to authenticated
  using (public.is_editor());
create policy "editors insert posts" on public.posts for insert to authenticated
  with check (public.is_editor());
create policy "editors update posts" on public.posts for update to authenticated
  using (public.is_editor()) with check (public.is_editor());
create policy "editors delete posts" on public.posts for delete to authenticated
  using (public.is_editor());

create or replace function public.posts_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.publish_at is null then
    new.publish_at := now();
  end if;
  return new;
end $$;
create trigger posts_before_write before insert or update on public.posts
  for each row execute function public.posts_before_write();

-- Only one featured post at a time.
create or replace function public.posts_single_featured()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.featured then
    update public.posts set featured = false where id <> new.id and featured;
  end if;
  return null;
end $$;
create trigger posts_single_featured after insert or update of featured on public.posts
  for each row when (new.featured) execute function public.posts_single_featured();

-- ---------- Subscribers (The Heddi Brief) ----------
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text,
  source text not null default 'blog',
  status text not null default 'active' check (status in ('active','unsubscribed')),
  unsub_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
alter table public.subscribers enable row level security;
create policy "editors manage subscribers" on public.subscribers for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- Public signup goes through this function so readers can't list or probe the table.
create or replace function public.subscribe(p_email text, p_source text default 'blog')
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_email is null or length(p_email) > 254 or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  insert into public.subscribers (email, source)
  values (lower(trim(p_email)), left(coalesce(p_source,'blog'), 40))
  on conflict (email) do update
    set status = 'active', unsubscribed_at = null
    where public.subscribers.status = 'unsubscribed';
  return true;
end $$;
revoke all on function public.subscribe(text, text) from public;
grant execute on function public.subscribe(text, text) to anon, authenticated;

-- ---------- Newsletter settings (single row) ----------
create table public.newsletter_settings (
  id int primary key default 1 check (id = 1),
  sender_name text not null default 'Heddi Strategies',
  reply_to text,
  send_mode text not null default 'manual' check (send_mode in ('manual','never')),
  updated_at timestamptz not null default now()
);
alter table public.newsletter_settings enable row level security;
create policy "editors manage settings" on public.newsletter_settings for all to authenticated
  using (public.is_editor()) with check (public.is_editor());
insert into public.newsletter_settings (id) values (1);

-- ---------- Storage: blog images ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-media', 'blog-media', true, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do nothing;

create policy "public reads blog media" on storage.objects for select
  using (bucket_id = 'blog-media');
create policy "editors upload blog media" on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-media' and public.is_editor());
create policy "editors update blog media" on storage.objects for update to authenticated
  using (bucket_id = 'blog-media' and public.is_editor());
create policy "editors delete blog media" on storage.objects for delete to authenticated
  using (bucket_id = 'blog-media' and public.is_editor());

-- ---------- Seed ----------
insert into public.topics (slug, label, icon, sort) values
  ('our-approach', 'Our approach', 'explore', 0),
  ('nonprofit-leadership', 'Nonprofit leadership', 'diversity_3', 1),
  ('public-sector', 'Public sector', 'account_balance', 2),
  ('systems-change', 'Systems change', 'hub', 3);

insert into public.authors (name, role, bio) values
  ('Courtney Douangdara', 'Founder & Managing Partner',
   'Courtney Douangdara is the Founder and Managing Partner of Heddi Strategies, helping organizations, public agencies and community partners move from good intentions to clear, effective action.');

-- Starter draft from the design, for Heddi to finish (not public until published).
insert into public.posts (slug, title, summary, body_html, topic_id, author_id, status, featured, meta_title, meta_description, read_minutes)
select 'observation-alignment-execution',
  'Observation, alignment, execution: how a strategy *actually works*',
  'Most plans stall between the retreat and the Tuesday staff meeting. Here is the three-step rhythm we use to close that gap.',
  '<p class="lead">Your mission deserves a strategy that actually works. Not a binder on a shelf, but a plan your team can feel on a Tuesday afternoon.</p>'
  || '<p>Heddi is a Lao word for doing good. It is the principle behind every engagement we take on: equip organizations and communities to lead change themselves. In practice, that comes down to three steps we repeat with every client.</p>'
  || '<h2>Observation</h2><p>Before we recommend anything, we listen. We work to understand your mission, your current reality and the constraints you are working within. [EXPAND WITH A REAL CLIENT STORY OR EXAMPLE.]</p>'
  || '<blockquote><p>[PULL QUOTE: one line from the article worth remembering.]</p><cite>[NAME, TITLE]</cite></blockquote>'
  || '<h2>Alignment</h2><p>Next, we align strengths, stakeholders and goals. For a nonprofit that might mean board, staff and funders agreeing on one roadmap. For a city it might mean residents, departments and community partners agreeing on what success looks like.</p>'
  || '<h2>Execution</h2><p>Finally, we turn strategy into action plans with clear accountability: who owns each priority, what happens this quarter, and how the team will know it is working.</p>'
  || '<div class="takeaways"><h3>Key takeaways</h3><ul><li>Start by listening to the mission, the reality and the constraints.</li><li>Get every stakeholder on one roadmap before you build the plan.</li><li>Give every priority an owner and a quarter.</li></ul></div>',
  t.id, a.id, 'draft', true,
  'How a strategy actually works | Heddi Strategies',
  'Observation, alignment and execution: the three-step rhythm Heddi Strategies uses to turn a nonprofit or public sector mission into a plan.',
  2
from public.topics t, public.authors a
where t.slug = 'our-approach' and a.name = 'Courtney Douangdara';

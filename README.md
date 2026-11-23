# Heddi Strategies website

Static site on Netlify (deploys from `main`). The Insights blog and Content Studio run on Supabase.

## Pages
| URL | File |
|---|---|
| `/` `/about.html` `/faq.html` `/contact.html` `/privacy.html` | marketing pages |
| `/insights` | `insights.html` blog index |
| `/insights/<slug>` | `article.html` (rewritten in `_redirects`) |
| `/studio` | `studio/index.html` Content Studio (CMS) |
| `/unsubscribe?token=` | `unsubscribe.html` |

## How it fits together
- `Public/blog/config.js` holds the Supabase URL and publishable key (safe in the browser; Row Level Security does the protecting).
- `Public/blog/lib.js` is shared by the blog and the Studio (Supabase client, sanitizer, card markup, newsletter form).
- Readers can only see posts that are `published`, or `scheduled` with a `publish_at` in the past. Scheduling needs no cron.
- Only users listed in `public.editors` can write. Signing up on your own does nothing.
- Images go to the public `blog-media` storage bucket.
- Newsletter signups go through the `subscribe()` database function, so the list can't be read publicly.
- `supabase/functions/send-post` emails an article through Resend (one send per article). `supabase/functions/unsubscribe` handles Gmail/Yahoo one-click unsubscribe.

## Database
Migrations are in `supabase/migrations/`. Apply them in order on a fresh project.

## Adding a Studio editor
1. Supabase dashboard > Authentication > Users > **Invite user** (their email).
2. Run in SQL editor:
   ```sql
   insert into public.editors (user_id, email, role)
   select id, email, 'editor' from auth.users where email = 'person@example.com';
   ```
3. They click the invite email, set a password, and land in the Studio.

## Email (Resend)
Edge Function secrets in Supabase (Project Settings > Edge Functions > Secrets):
- `RESEND_API_KEY`
- `FROM_EMAIL` (an address on a domain verified in Resend, e.g. `brief@heddistrategies.com`)
- `SITE_URL` (the live site URL, e.g. `https://heddistrategies.com`)

Deploy `unsubscribe` with JWT verification off; `send-post` keeps it on.

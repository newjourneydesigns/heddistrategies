// Sends a published article to every active subscriber of The Heddi Brief via Resend.
// Secrets (set in Supabase > Edge Functions > Secrets):
//   RESEND_API_KEY  your Resend API key
//   FROM_EMAIL      a sender on your verified Resend domain, e.g. brief@heddistrategies.com
//   SITE_URL        optional, defaults to https://heddistrategies.com
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const plain = (t: string) => t.replace(/\*/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const RESEND = Deno.env.get('RESEND_API_KEY');
  const FROM = Deno.env.get('FROM_EMAIL');
  const SITE = (Deno.env.get('SITE_URL') || 'https://heddistrategies.com').replace(/\/$/, '');
  const FN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/unsubscribe`;
  if (!RESEND || !FROM) return json({ error: 'Email is not set up yet: add RESEND_API_KEY and FROM_EMAIL in Supabase.' }, 500);

  // Caller must be a signed-in Studio editor.
  const auth = req.headers.get('Authorization') || '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: isEditor } = await userClient.rpc('is_editor');
  if (!isEditor) return json({ error: 'Only Studio editors can send email.' }, 403);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { post_id } = await req.json().catch(() => ({}));
  if (!post_id) return json({ error: 'Missing post_id' }, 400);

  const { data: settings } = await admin.from('newsletter_settings').select('*').eq('id', 1).single();
  if (settings?.send_mode === 'never') return json({ error: 'Emails are turned off in Subscribers settings.' }, 400);

  // Claim the send atomically so a double click can't email twice.
  const { data: post } = await admin.from('posts')
    .update({ emailed_at: new Date().toISOString() })
    .eq('id', post_id).is('emailed_at', null).in('status', ['published', 'scheduled']).lte('publish_at', new Date().toISOString())
    .select('id, slug, title, summary, cover_url, cover_alt, author:authors(name)').maybeSingle();
  if (!post) return json({ error: 'This article is not live yet, or it was already emailed.' }, 409);

  const { data: subs } = await admin.from('subscribers').select('email, unsub_token').eq('status', 'active');
  if (!subs?.length) return json({ sent: 0 });

  const url = `${SITE}/insights/${post.slug}`;
  const title = plain(post.title);
  const sender = `${settings?.sender_name || 'Heddi Strategies'} <${FROM}>`;
  const html = (unsub: string) => `<!doctype html><html><body style="margin:0;background:#16111e;padding:32px 16px;font-family:Manrope,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e1926;border-radius:8px;overflow:hidden">
<tr><td style="padding:28px 36px 0"><p style="margin:0;font-size:12px;font-weight:800;letter-spacing:3px;color:#b0decf">THE HEDDI BRIEF</p></td></tr>
${post.cover_url ? `<tr><td style="padding:24px 36px 0"><a href="${url}"><img src="${esc(post.cover_url)}" alt="${esc(post.cover_alt || '')}" width="528" style="width:100%;height:auto;border-radius:6px;display:block"></a></td></tr>` : ''}
<tr><td style="padding:28px 36px 8px"><h1 style="margin:0;font-family:Georgia,'Noto Serif',serif;font-weight:400;font-size:30px;line-height:1.2;color:#e9dff1">${esc(title)}</h1></td></tr>
${post.summary ? `<tr><td style="padding:8px 36px 0"><p style="margin:0;font-size:16px;line-height:1.7;color:#c0c8c4">${esc(post.summary)}</p></td></tr>` : ''}
<tr><td style="padding:28px 36px 36px"><a href="${url}" style="display:inline-block;background:#95c2b4;color:#255146;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:2px;padding:16px 28px;border-radius:6px">READ THE ARTICLE</a></td></tr>
</table>
<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#9a94a4">You are receiving this because you subscribed to The Heddi Brief from Heddi Strategies.<br><a href="${unsub}" style="color:#cdc2d9">Unsubscribe</a></p>
</td></tr></table></body></html>`;
  const text = (unsub: string) => `${title}\n\n${post.summary || ''}\n\nRead it: ${url}\n\nUnsubscribe: ${unsub}`;

  let sent = 0;
  const failures: string[] = [];
  for (let i = 0; i < subs.length; i += 100) {
    const batch = subs.slice(i, i + 100).map((s) => {
      const unsub = `${SITE}/unsubscribe?token=${s.unsub_token}`;
      const oneClick = `${FN_URL}?token=${s.unsub_token}`;
      return {
        from: sender, to: [s.email], subject: title,
        ...(settings?.reply_to ? { reply_to: settings.reply_to } : {}),
        html: html(unsub), text: text(unsub),
        headers: { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      };
    });
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' }, body: JSON.stringify(batch),
    });
    if (r.ok) sent += batch.length; else failures.push(await r.text());
  }

  if (sent === 0) {
    await admin.from('posts').update({ emailed_at: null }).eq('id', post.id); // let them retry
    return json({ error: 'Resend rejected the send: ' + (failures[0] || 'unknown error').slice(0, 300) }, 502);
  }
  return json({ sent, failed: subs.length - sent });
});

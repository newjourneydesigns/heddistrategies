// RFC 8058 one-click unsubscribe endpoint (used by Gmail/Yahoo "Unsubscribe" buttons).
// The human-facing page is /unsubscribe on the website. Deploy with JWT verification off.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Use the unsubscribe link in the email.', { status: 405 });
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response('bad token', { status: 400 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await admin.from('subscribers').update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('unsub_token', token).eq('status', 'active');
  return new Response('ok');
});

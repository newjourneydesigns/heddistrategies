-- Public unsubscribe by token (used by /unsubscribe on the website).
create or replace function public.unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.subscribers set status = 'unsubscribed', unsubscribed_at = now()
  where unsub_token = p_token and status = 'active';
  get diagnostics n = row_count;
  return n > 0 or exists (select 1 from public.subscribers where unsub_token = p_token);
end $$;
revoke all on function public.unsubscribe(uuid) from public;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

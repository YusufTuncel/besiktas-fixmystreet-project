-- Beşiktaş Sokak: yeni özellikler için EK (additive) migration. Supabase > SQL Editor'da bir kez çalıştırın.
-- Mevcut tablo/politikalara dokunmaz; yalnızca sütun/tablo/fonksiyon/trigger ekler.

alter table reports add column if not exists after_photo_path text;
alter table reports add column if not exists resolved_at timestamptz;
alter table reports add column if not exists confirmed boolean not null default false;
alter table reports add column if not exists hidden boolean not null default false;
alter table reports add column if not exists anonymous boolean not null default false;
alter table reports add column if not exists rewarded boolean not null default false;
alter table profiles add column if not exists karma int not null default 0;
alter table profiles add column if not exists hoods text[] not null default '{}';

create table if not exists report_votes   (report_id uuid references reports(id) on delete cascade, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, primary key (report_id, user_id));
create table if not exists report_follows (report_id uuid references reports(id) on delete cascade, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, primary key (report_id, user_id));
create table if not exists comments (
  id uuid primary key default gen_random_uuid(), report_id uuid not null references reports(id) on delete cascade,
  user_id uuid default auth.uid(), author text, role text, body text not null check (char_length(body) between 1 and 300),
  system boolean not null default false, hidden boolean not null default false, created_at timestamptz not null default now());
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references reports(id) on delete cascade, body text not null, read boolean not null default false, created_at timestamptz not null default now());

alter table report_votes enable row level security; alter table report_follows enable row level security;
alter table comments enable row level security;     alter table notifications enable row level security;
drop policy if exists bs_votes_read on report_votes;   create policy bs_votes_read on report_votes for select to authenticated using (true);
drop policy if exists bs_votes_ins on report_votes;    create policy bs_votes_ins on report_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists bs_votes_del on report_votes;    create policy bs_votes_del on report_votes for delete to authenticated using (user_id = auth.uid());
drop policy if exists bs_fol_all on report_follows;    create policy bs_fol_all on report_follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists bs_com_read on comments;         create policy bs_com_read on comments for select to authenticated using (true);
drop policy if exists bs_com_ins on comments;          create policy bs_com_ins on comments for insert to authenticated with check (user_id = auth.uid() and system = false);
drop policy if exists bs_not_read on notifications;    create policy bs_not_read on notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists bs_not_upd on notifications;     create policy bs_not_upd on notifications for update to authenticated using (user_id = auth.uid());

-- Liderlik tablosu (profiles'ın tamamını açmadan yalnızca ad + puan)
create or replace view leaderboard as select coalesce(full_name, 'Vatandaş') as full_name, karma from profiles where role = 'citizen' order by karma desc limit 8;
grant select on leaderboard to authenticated;

-- Yardımcılar
create or replace function bs_notify(rid uuid, msg text, skip uuid) returns void language sql security definer set search_path = public as $$
  insert into notifications(user_id, report_id, body)
  select u, rid, msg from (select created_by as u from reports where id = rid union select user_id from report_follows where report_id = rid) a
  where u is not null and u is distinct from skip $$;

-- Yorum: yazar adı/rolü sunucuda atanır (sahtecilik olmasın)
create or replace function bs_comment_before() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.system then select coalesce(full_name, 'Vatandaş'), role into new.author, new.role from profiles where id = auth.uid(); new.user_id := auth.uid(); end if;
  return new; end $$;
drop trigger if exists bs_comment_before on comments; create trigger bs_comment_before before insert on comments for each row execute function bs_comment_before();
create or replace function bs_comment_after() returns trigger language plpgsql security definer set search_path = public as $$
begin if not new.system then perform bs_notify(new.report_id, (select code from reports where id = new.report_id) || ': yeni yorum — ' || left(new.body, 60), new.user_id); end if; return new; end $$;
drop trigger if exists bs_comment_after on comments; create trigger bs_comment_after after insert on comments for each row execute function bs_comment_after();

-- Yeni ihbar: +10 puan, otomatik takip, mahalle abonelerine bildirim
create or replace function bs_report_after_ins() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    update profiles set karma = karma + 10 where id = new.created_by;
    insert into report_follows(report_id, user_id) values (new.id, new.created_by) on conflict do nothing;
  end if;
  insert into notifications(user_id, report_id, body) select id, new.id, coalesce(new.hood, '') || ': yeni ihbar ' || coalesce(new.code, '') || ' (' || new.category || ')'
    from profiles where new.hood = any(hoods) and id is distinct from new.created_by;
  return new; end $$;
drop trigger if exists bs_report_after_ins on reports; create trigger bs_report_after_ins after insert on reports for each row execute function bs_report_after_ins();

-- Durum değişimi: çözüm zamanı + bildirim
create or replace function bs_report_before_upd() returns trigger language plpgsql as $$
begin if new.status = 'resolved' and old.status is distinct from 'resolved' then new.resolved_at := now(); new.confirmed := false; end if; return new; end $$;
drop trigger if exists bs_report_before_upd on reports; create trigger bs_report_before_upd before update on reports for each row execute function bs_report_before_upd();
create or replace function bs_report_after_upd() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.status is distinct from old.status then
  perform bs_notify(new.id, new.code || case new.status when 'enroute' then ' için ekip yola çıktı' when 'working' then ' onarımı başladı' when 'resolved' then ' çözüldü — lütfen onaylayın' else ' güncellendi' end, auth.uid());
end if; return new; end $$;
drop trigger if exists bs_report_after_upd on reports; create trigger bs_report_after_upd after update on reports for each row execute function bs_report_after_upd();

-- Oy sayacı (reports.supporters) + oy verince otomatik takip
create or replace function bs_vote_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update reports set supporters = supporters + 1 where id = new.report_id; insert into report_follows(report_id, user_id) values (new.report_id, new.user_id) on conflict do nothing;
  else update reports set supporters = greatest(0, supporters - 1) where id = old.report_id; end if;
  return null; end $$;
drop trigger if exists bs_vote_count on report_votes; create trigger bs_vote_count after insert or delete on report_votes for each row execute function bs_vote_count();

-- Vatandaş onayı (+50 puan) ya da yeniden açma
create or replace function confirm_report(rid uuid, ok boolean) returns void language plpgsql security definer set search_path = public as $$
declare r reports;
begin
  select * into r from reports where id = rid;
  if r.id is null or r.created_by is distinct from auth.uid() or r.status <> 'resolved' or r.confirmed then raise exception 'not allowed'; end if;
  if ok then
    update reports set confirmed = true, rewarded = true where id = rid;
    if not r.rewarded then update profiles set karma = karma + 50 where id = auth.uid(); end if;
  else
    update reports set status = 'pending', team = null, after_photo_path = null, resolved_at = null where id = rid;
    insert into comments(report_id, author, role, body, system) values (rid, 'Sistem', 'system', 'Vatandaş çözümü onaylamadı; ihbar yeniden açıldı.', true);
    perform bs_notify(rid, r.code || ' yeniden açıldı', auth.uid());
  end if; end $$;

-- Moderasyon (yalnızca supervisor)
create or replace function bs_is_sup() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from profiles where id = auth.uid() and role = 'supervisor') $$;
create or replace function moderate_report(rid uuid, hide boolean) returns void language plpgsql security definer set search_path = public as $$
begin if not bs_is_sup() then raise exception 'forbidden'; end if; update reports set hidden = hide where id = rid; end $$;
create or replace function moderate_comment(cid uuid) returns void language plpgsql security definer set search_path = public as $$
begin if not bs_is_sup() then raise exception 'forbidden'; end if; update comments set hidden = not hidden where id = cid; end $$;

-- Mahalle aboneliği
create or replace function set_hoods(h text[]) returns void language sql security definer set search_path = public as $$ update profiles set hoods = h where id = auth.uid() $$;

-- Canlı güncelleme (Realtime)
do $$ begin
  begin alter publication supabase_realtime add table comments; exception when others then null; end;
  begin alter publication supabase_realtime add table notifications; exception when others then null; end;
  begin alter publication supabase_realtime add table report_votes; exception when others then null; end;
end $$;

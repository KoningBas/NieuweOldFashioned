-- Workflow foundation: full status chain, activity timeline, document
-- numbering and the settings needed for quotes/invoices.
--
-- Design doc: docs/superpowers/specs/2026-07-18-admin-locatie-workflow-design.md

-- 1. Status chain -----------------------------------------------------------
-- 'confirmed' becomes 'booked'; the chain now runs through to 'paid'.

alter table quote_requests drop constraint quote_requests_status_check;
update quote_requests set status = 'booked' where status = 'confirmed';
alter table quote_requests add constraint quote_requests_status_check
  check (status in ('new','reviewed','quoted','booked','completed','invoiced','paid','declined','cancelled'));

-- The public wizard checks availability through this view. It must follow the
-- rename or every existing booking disappears from the date check and the
-- site double-books. A booked date stays taken through completion/invoicing.
drop view public_confirmed_event_dates;
create view public_confirmed_event_dates as
  select event_date from quote_requests
  where status in ('booked','completed','invoiced','paid');
grant select on public_confirmed_event_dates to anon;

-- 2. New request columns ----------------------------------------------------
-- source: which form the request came from (workshop reservations join the
-- same pipeline in migration 0006). arrangement only applies to workshops.

alter table quote_requests
  add column source text not null default 'wizard_locatie'
    check (source in ('wizard_locatie','wizard_workshop_locatie','workshop_bar')),
  add column event_address text not null default '',
  add column arrangement text check (arrangement in ('Bites','Streetfood')),
  add column internal_notes text;

-- 3. Activity timeline ------------------------------------------------------
-- kind 'system' rows are written by the app on status changes and document
-- events; the other kinds are the admin's own quick-log entries.

create table quote_activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references quote_requests(id) on delete cascade,
  kind text not null check (kind in ('system','call','email','whatsapp','note')),
  body text not null default '',
  created_at timestamptz not null default now()
);
create index quote_activity_request_idx on quote_activity(request_id, created_at desc);

alter table quote_activity enable row level security;
create policy "admin all quote_activity" on quote_activity
  for all using (is_admin()) with check (is_admin());

-- 4. Document numbering -----------------------------------------------------
-- One counter row per kind per year. The function runs as security definer so
-- it can bump the counter atomically; the explicit is_admin() check keeps it
-- closed to the public despite that.

create table document_counters (
  kind text not null check (kind in ('quote','invoice')),
  year integer not null,
  last_number integer not null default 0,
  primary key (kind, year)
);

alter table document_counters enable row level security;
create policy "admin all document_counters" on document_counters
  for all using (is_admin()) with check (is_admin());

create or replace function next_document_number(p_kind text, p_year integer)
returns text as $$
declare n integer;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if p_kind not in ('quote','invoice') then
    raise exception 'unknown document kind %', p_kind;
  end if;
  insert into document_counters (kind, year, last_number)
  values (p_kind, p_year, 1)
  on conflict (kind, year) do update
    set last_number = document_counters.last_number + 1
  returning last_number into n;
  return (case p_kind when 'quote' then 'OF-' else 'F-' end)
    || p_year || '-' || lpad(n::text, 3, '0');
end;
$$ language plpgsql security definer set search_path = public;

-- 5. Settings for documents and dashboard signals ---------------------------

alter table service_settings
  add column kvk_number text not null default '',
  add column vat_number text not null default '',
  add column iban text not null default '',
  add column quote_valid_days integer not null default 14,
  add column invoice_due_days integer not null default 14,
  add column vat_rate numeric(4,2) not null default 21,
  add column nudge_new_days integer not null default 3,
  add column nudge_quote_days integer not null default 7;

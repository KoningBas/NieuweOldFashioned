-- GEGENEREERD BESTAND — niet met de hand bewerken.
-- Bron: migraties 0003, 0004 en 0005 achter elkaar geplakt, in volgorde.
-- Plak dit in de Supabase SQL-editor en voer het in één keer uit.
-- Alles staat in één transactie: faalt er iets, dan rolt de hele run terug.
-- Draai het één keer per database; opnieuw draaien faalt op bestaande tabellen.

begin;

-- ======================================================================
-- 0003_workflow_foundation.sql
-- ======================================================================
-- Workflow foundation: full status chain, activity timeline, document
-- numbering and the settings needed for quotes/invoices.
--
-- Design doc: docs/superpowers/specs/2026-07-18-admin-locatie-workflow-design.md

-- 1. Status chain -----------------------------------------------------------
-- 'confirmed' becomes 'booked'; the chain now runs through to 'paid'.

-- The old constraint was declared inline, so its name is whatever Postgres
-- generated. Drop every check constraint that touches `status` instead of
-- guessing the name; leaving one behind would reject 'booked' after the update.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'quote_requests'::regclass
      and con.contype = 'c'
      and att.attname = 'status'
  loop
    execute format('alter table quote_requests drop constraint %I', c.conname);
  end loop;
end $$;

update quote_requests set status = 'booked' where status = 'confirmed';
alter table quote_requests add constraint quote_requests_status_check
  check (status in ('new','reviewed','quoted','booked','completed','invoiced','paid','declined','cancelled'));

-- The public wizard checks availability through this view. It must follow the
-- rename or every existing booking disappears from the date check and the
-- site double-books. A booked date stays taken through completion/invoicing.
drop view if exists public_confirmed_event_dates;
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

-- ======================================================================
-- 0004_quotes_invoices.sql
-- ======================================================================
-- Quotes and invoices. Line prices are VAT-inclusive; invoice lines are a
-- copy of the quote lines at invoicing time (an issued invoice must never
-- change because the quote was edited later).

create table quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references quote_requests(id) on delete cascade,
  -- A revised quote keeps its number and bumps the version, so the customer
  -- always talks about one quote number.
  quote_number text not null,
  version integer not null default 1,
  unique (quote_number, version),
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','declined','expired')),
  valid_until date not null,
  total_incl numeric(10,2) not null default 0,
  notes text,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index quotes_request_idx on quotes(request_id);

create table quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'st',
  unit_price_incl numeric(10,2) not null default 0,
  vat_rate numeric(4,2) not null default 21,
  sort_order integer not null default 0
);
create index quote_lines_quote_idx on quote_lines(quote_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  -- restrict: a request with an invoice under it cannot be deleted.
  request_id uuid not null references quote_requests(id) on delete restrict,
  quote_id uuid references quotes(id) on delete set null,
  invoice_number text not null unique,
  issued_on date not null default current_date,
  due_on date not null,
  paid_on date,
  total_incl numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index invoices_request_idx on invoices(request_id);
create index invoices_open_idx on invoices(due_on) where paid_on is null;

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'st',
  unit_price_incl numeric(10,2) not null default 0,
  vat_rate numeric(4,2) not null default 21,
  sort_order integer not null default 0
);
create index invoice_lines_invoice_idx on invoice_lines(invoice_id);

-- RLS: admin only. Customer PII and financial records — no public access.
alter table quotes enable row level security;
alter table quote_lines enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;

create policy "admin all quotes" on quotes for all using (is_admin()) with check (is_admin());
create policy "admin all quote_lines" on quote_lines for all using (is_admin()) with check (is_admin());
create policy "admin all invoices" on invoices for all using (is_admin()) with check (is_admin());
create policy "admin all invoice_lines" on invoice_lines for all using (is_admin()) with check (is_admin());

-- ======================================================================
-- 0005_packing.sql
-- ======================================================================
-- Packing lists: templates per package, per-job lists with checkable items,
-- cocktail ingredients for the shopping calculation.

create table packing_templates (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references service_packages(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table packing_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references packing_templates(id) on delete cascade,
  name text not null,
  category text not null check (category in
    ('sterke_drank','mixers','vers','ijs','glaswerk','barmateriaal','verbruik','techniek')),
  perishability text not null default 'houdbaar'
    check (perishability in ('houdbaar','vers','diepvries')),
  unit text not null default 'st',
  -- scale_basis × scale_factor: 'per_guest' 1.5 on 80 guests = 120 pieces;
  -- 'fixed' 3 is always 3.
  scale_basis text not null default 'fixed'
    check (scale_basis in ('fixed','per_guest','per_cocktail')),
  scale_factor numeric(10,3) not null default 1,
  sort_order integer not null default 0
);
create index packing_template_items_template_idx on packing_template_items(template_id);

create table packing_lists (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references quote_requests(id) on delete cascade,
  notes text,
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create table packing_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references packing_lists(id) on delete cascade,
  name text not null,
  category text not null check (category in
    ('sterke_drank','mixers','vers','ijs','glaswerk','barmateriaal','verbruik','techniek')),
  perishability text not null default 'houdbaar'
    check (perishability in ('houdbaar','vers','diepvries')),
  quantity numeric(10,2) not null default 1,
  unit text not null default 'st',
  is_checked boolean not null default false,
  origin text not null default 'manual'
    check (origin in ('template','cocktails','scaling','manual')),
  sort_order integer not null default 0
);
create index packing_list_items_list_idx on packing_list_items(list_id);

create table cocktail_ingredients (
  id uuid primary key default gen_random_uuid(),
  cocktail_id uuid not null references cocktail_menu(id) on delete cascade,
  name text not null,
  amount numeric(10,2) not null,
  unit text not null check (unit in ('ml','cl','g','st')),
  category text not null check (category in
    ('sterke_drank','mixers','vers','ijs','glaswerk','barmateriaal','verbruik','techniek')),
  perishability text not null default 'houdbaar'
    check (perishability in ('houdbaar','vers','diepvries')),
  -- pack_size/pack_unit turn totals into shopping units:
  -- 200 cocktails x 30 ml with pack 700 ml "fles" -> 9 flessen.
  pack_size numeric(10,2),
  pack_unit text,
  sort_order integer not null default 0
);
create index cocktail_ingredients_cocktail_idx on cocktail_ingredients(cocktail_id);

create table request_cocktails (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references quote_requests(id) on delete cascade,
  cocktail_id uuid not null references cocktail_menu(id) on delete cascade,
  planned_count integer not null default 0,
  unique (request_id, cocktail_id)
);

-- RLS: admin only.
alter table packing_templates enable row level security;
alter table packing_template_items enable row level security;
alter table packing_lists enable row level security;
alter table packing_list_items enable row level security;
alter table cocktail_ingredients enable row level security;
alter table request_cocktails enable row level security;

create policy "admin all packing_templates" on packing_templates for all using (is_admin()) with check (is_admin());
create policy "admin all packing_template_items" on packing_template_items for all using (is_admin()) with check (is_admin());
create policy "admin all packing_lists" on packing_lists for all using (is_admin()) with check (is_admin());
create policy "admin all packing_list_items" on packing_list_items for all using (is_admin()) with check (is_admin());
create policy "admin all cocktail_ingredients" on cocktail_ingredients for all using (is_admin()) with check (is_admin());
create policy "admin all request_cocktails" on request_cocktails for all using (is_admin()) with check (is_admin());

-- Seed: one editable base template per package.
insert into packing_templates (package_id, name)
select id, 'Basislijst ' || package_name from service_packages
where package_name in ('Bartending op Locatie', 'Workshop op Locatie');

insert into packing_template_items (template_id, name, category, perishability, unit, scale_basis, scale_factor, sort_order)
select t.id, v.name, v.category, v.perishability, v.unit, v.scale_basis, v.scale_factor, v.sort_order
from packing_templates t
join service_packages p on p.id = t.package_id and p.package_name = 'Bartending op Locatie'
cross join (values
  ('Shakers',            'barmateriaal', 'houdbaar',  'st', 'fixed',        3::numeric,    10),
  ('Jiggers',            'barmateriaal', 'houdbaar',  'st', 'fixed',        3,             11),
  ('Barlepels',          'barmateriaal', 'houdbaar',  'st', 'fixed',        2,             12),
  ('Strainers',          'barmateriaal', 'houdbaar',  'st', 'fixed',        3,             13),
  ('Muddler',            'barmateriaal', 'houdbaar',  'st', 'fixed',        1,             14),
  ('Snijplank + mes',    'barmateriaal', 'houdbaar',  'st', 'fixed',        1,             15),
  ('Koelboxen',          'barmateriaal', 'houdbaar',  'st', 'fixed',        2,             16),
  ('Highball glazen',    'glaswerk',     'houdbaar',  'st', 'per_guest',    1.5,           20),
  ('Coupe glazen',       'glaswerk',     'houdbaar',  'st', 'per_guest',    0.75,          21),
  ('IJsblokjes',         'ijs',          'diepvries', 'kg', 'per_cocktail', 0.25,          30),
  ('Rietjes',            'verbruik',     'houdbaar',  'st', 'per_cocktail', 1,             40),
  ('Servetten',          'verbruik',     'houdbaar',  'st', 'per_guest',    1.5,           41),
  ('Bardoeken',          'verbruik',     'houdbaar',  'st', 'fixed',        6,             42),
  ('Mobiele bar',        'techniek',     'houdbaar',  'st', 'fixed',        1,             50),
  ('Barverlichting',     'techniek',     'houdbaar',  'st', 'fixed',        1,             51),
  ('Verlengsnoeren',     'techniek',     'houdbaar',  'st', 'fixed',        2,             52)
) as v(name, category, perishability, unit, scale_basis, scale_factor, sort_order);

insert into packing_template_items (template_id, name, category, perishability, unit, scale_basis, scale_factor, sort_order)
select t.id, v.name, v.category, v.perishability, v.unit, v.scale_basis, v.scale_factor, v.sort_order
from packing_templates t
join service_packages p on p.id = t.package_id and p.package_name = 'Workshop op Locatie'
cross join (values
  ('Shakersets',         'barmateriaal', 'houdbaar',  'st', 'per_guest',    0.5::numeric,  10),
  ('Jiggers',            'barmateriaal', 'houdbaar',  'st', 'per_guest',    0.5,           11),
  ('Snijplanken',        'barmateriaal', 'houdbaar',  'st', 'fixed',        2,             12),
  ('Werkglazen',         'glaswerk',     'houdbaar',  'st', 'per_guest',    2,             20),
  ('IJsblokjes',         'ijs',          'diepvries', 'kg', 'per_guest',    0.5,           30),
  ('Servetten',          'verbruik',     'houdbaar',  'st', 'per_guest',    2,             40),
  ('Schorten',           'verbruik',     'houdbaar',  'st', 'per_guest',    1,             41),
  ('Werktafels',         'techniek',     'houdbaar',  'st', 'fixed',        2,             50)
) as v(name, category, perishability, unit, scale_basis, scale_factor, sort_order);

commit;

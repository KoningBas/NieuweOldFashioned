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

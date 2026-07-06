-- Tables
create table service_packages (
  id uuid primary key default gen_random_uuid(),
  package_name text not null,
  description text not null default '',
  price numeric(10,2) not null,
  price_unit text not null check (price_unit in ('per_cocktail', 'per_person')),
  min_quantity integer not null default 1,
  category text not null default '',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cocktail_menu (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default '',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  event_type text not null,
  guest_count integer not null check (guest_count >= 0),
  cocktail_count integer not null check (cocktail_count >= 0),
  package_id uuid not null references service_packages(id),
  event_date date not null,
  event_city text not null,
  event_postcode text not null,
  distance_km numeric not null check (distance_km >= 0),
  estimated_total numeric(10,2) not null check (estimated_total >= 0),
  status text not null default 'new' check (status in ('new','reviewed','quoted','confirmed','declined')),
  special_requests text,
  created_at timestamptz not null default now()
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null unique check (weekday between 0 and 6),
  is_available boolean not null default false,
  start_time time not null default '18:00',
  end_time time not null default '23:00'
);

create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

create table service_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_email text not null,
  business_phone text not null,
  business_address text not null,
  cocktail_price numeric(10,2) not null,
  min_cocktails integer not null,
  workshop_price_per_person numeric(10,2) not null,
  travel_fee_near numeric(10,2) not null,
  travel_fee_far numeric(10,2) not null,
  travel_near_km_limit numeric not null,
  booking_notice_hours integer not null,
  max_guests integer not null,
  created_at timestamptz not null default now()
);

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Indexes
create index quote_requests_event_date_idx on quote_requests(event_date);
create index quote_requests_status_idx on quote_requests(status);

-- RLS
alter table service_packages enable row level security;
alter table cocktail_menu enable row level security;
alter table quote_requests enable row level security;
alter table availability enable row level security;
alter table blocked_dates enable row level security;
alter table service_settings enable row level security;
alter table admin_users enable row level security;

create or replace function is_admin() returns boolean as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$ language sql stable security definer set search_path = public;

-- public read policies
create policy "public read active packages" on service_packages for select using (is_active = true);
create policy "public read active cocktails" on cocktail_menu for select using (is_active = true);
create policy "public read availability" on availability for select using (true);
create policy "public read blocked dates" on blocked_dates for select using (true);
create policy "public read service settings" on service_settings for select using (true);

-- public insert quote requests only
create policy "public insert quote requests" on quote_requests for insert with check (status = 'new');

-- admin_users: users can read their own row (used by the login gate)
create policy "self read admin_users" on admin_users for select using (auth.uid() = user_id);

-- admin full access
create policy "admin all service_packages" on service_packages for all using (is_admin()) with check (is_admin());
create policy "admin all cocktail_menu" on cocktail_menu for all using (is_admin()) with check (is_admin());
create policy "admin all quote_requests" on quote_requests for all using (is_admin()) with check (is_admin());
create policy "admin all availability" on availability for all using (is_admin()) with check (is_admin());
create policy "admin all blocked_dates" on blocked_dates for all using (is_admin()) with check (is_admin());
create policy "admin all service_settings" on service_settings for all using (is_admin()) with check (is_admin());
create policy "admin all admin_users" on admin_users for all using (is_admin()) with check (is_admin());

-- Seed data
insert into service_settings (business_name, business_email, business_phone, business_address, cocktail_price, min_cocktails, workshop_price_per_person, travel_fee_near, travel_fee_far, travel_near_km_limit, booking_notice_hours, max_guests)
values ('The Old Fashioned', 'Theqingzakelijk@gmail.com', '', 'Grotestraat 12, 7461 KG Rijssen', 8, 50, 32, 50, 75, 10, 72, 200);

insert into service_packages (package_name, description, price, price_unit, min_quantity, category, is_featured, is_active) values
('Bartending op Locatie', 'Professionele bartenders verzorgen een complete cocktailervaring op jouw feest of evenement. Keuze uit onze vaste kaart of een maatwerk cocktailmenu, inclusief alle ingredienten en materialen.', 8, 'per_cocktail', 50, 'bartending', true, true),
('Workshop op Locatie', 'Leer onder begeleiding van onze bartender twee cocktails maken, inclusief shots en materialen. Wij komen naar jouw locatie toe.', 32, 'per_person', 4, 'workshop', true, true);

insert into cocktail_menu (name, description, category, is_featured, is_active) values
('The Old Fashioned', 'Onze signature cocktail: bourbon, huisgemaakte bitters en een vleugje sinaasappel.', 'signature', true, true),
('Smoked Negroni', 'Een verfijnde twist op de klassieker, licht gerookt voor extra diepte.', 'signature', true, true),
('Espresso Martini', 'Romige wodka-cocktail met verse espresso en koffielikeur.', 'klassiek', true, true),
('Rijssen Sour', 'Whiskey sour met een lokale twist en huisgemaakte citrusmix.', 'signature', false, true),
('Garden Mule', 'Alcoholvrije mocktail met gember, munt en verse limoen.', 'mocktail', true, true),
('Golden Fizz', 'Sprankelende mocktail met perzik, citroen en tonic.', 'mocktail', false, true);

insert into availability (weekday, is_available, start_time, end_time) values
(0, false, '18:00', '23:00'),
(1, false, '18:00', '23:00'),
(2, false, '18:00', '23:00'),
(3, false, '18:00', '23:00'),
(4, true, '18:00', '23:00'),
(5, true, '18:00', '23:00'),
(6, true, '18:00', '23:00');

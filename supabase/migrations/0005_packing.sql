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

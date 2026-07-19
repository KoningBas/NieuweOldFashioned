-- One base packing template for every on-location job (package_id is null),
-- plus a stamp on quote_requests so the packing list can tell you when the
-- cocktail choice moved on without it.

begin;

-- Exactly one base template can exist. Per-package templates stay unconstrained
-- (a partial index cannot cover the null rows and the package rows at once).
create unique index if not exists packing_templates_base_unique
  on packing_templates ((package_id is null)) where package_id is null;

insert into packing_templates (package_id, name)
select null, 'Basisuitrusting op locatie'
where not exists (select 1 from packing_templates where package_id is null);

-- Kit that goes in the van regardless of the package. It lived in the
-- bartending template; moving it keeps every item on one screen.
update packing_template_items i
set template_id = (select id from packing_templates where package_id is null)
from packing_templates t
join service_packages p on p.id = t.package_id
where i.template_id = t.id
  and p.package_name = 'Bartending op Locatie'
  and i.name in (
    'Mobiele bar', 'Barverlichting', 'Verlengsnoeren',
    'Koelboxen', 'Snijplank + mes', 'Bardoeken'
  );

-- Same names in the workshop template would now double up; the base covers them.
delete from packing_template_items i
using packing_templates t, service_packages p
where i.template_id = t.id
  and t.package_id = p.id
  and p.package_name = 'Workshop op Locatie'
  and lower(i.name) in (
    'mobiele bar', 'barverlichting', 'verlengsnoeren',
    'koelboxen', 'snijplank + mes', 'bardoeken'
  );

-- Starting set. Sort order leaves room below the moved rows.
insert into packing_template_items (template_id, name, category, perishability, unit, scale_basis, scale_factor, sort_order)
select t.id, v.name, v.category, v.perishability, v.unit, v.scale_basis, v.scale_factor, v.sort_order
from packing_templates t
cross join (values
  ('Emmer',                   'barmateriaal', 'houdbaar', 'st',  'fixed', 1::numeric,  60),
  ('Sopje: afwasmiddel',      'verbruik',     'houdbaar', 'st',  'fixed', 1,           61),
  ('Sponzen',                 'verbruik',     'houdbaar', 'st',  'fixed', 3,           62),
  ('Theedoeken',              'verbruik',     'houdbaar', 'st',  'fixed', 4,           63),
  ('Handdoeken',              'verbruik',     'houdbaar', 'st',  'fixed', 2,           64),
  ('Keukenrol',               'verbruik',     'houdbaar', 'rol', 'fixed', 2,           65),
  ('Afvalzakken',             'verbruik',     'houdbaar', 'st',  'fixed', 10,          66),
  ('Prullenbak',              'barmateriaal', 'houdbaar', 'st',  'fixed', 1,           67),
  ('Handgel',                 'verbruik',     'houdbaar', 'st',  'fixed', 1,           68),
  ('Speedpourers',            'barmateriaal', 'houdbaar', 'st',  'fixed', 10,          69),
  ('EHBO-koffer',             'barmateriaal', 'houdbaar', 'st',  'fixed', 1,           70),
  ('Gereedschapskist',        'techniek',     'houdbaar', 'st',  'fixed', 1,           71),
  ('Stekkerdozen',            'techniek',     'houdbaar', 'st',  'fixed', 2,           72),
  ('Tape + tie-wraps',        'techniek',     'houdbaar', 'st',  'fixed', 1,           73)
) as v(name, category, perishability, unit, scale_basis, scale_factor, sort_order)
where t.package_id is null
  and not exists (
    select 1 from packing_template_items e
    where e.template_id = t.id and lower(e.name) = lower(v.name)
  );

-- Stamped whenever the cocktail selection changes, so a generated packing list
-- knows it is out of date. Null means "never touched".
alter table quote_requests add column if not exists cocktails_updated_at timestamptz;

commit;

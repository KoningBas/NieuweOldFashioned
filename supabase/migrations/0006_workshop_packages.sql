-- Workshops in the bar join the same pipeline as everything else. They need a
-- package row because quote_requests.package_id is not null and every price
-- route in the admin runs through service_packages.
--
-- Design doc: docs/superpowers/specs/2026-07-18-admin-locatie-workflow-design.md

insert into service_packages
  (package_name, description, price, price_unit, min_quantity, category, is_featured, is_active)
values
  ('Workshop in de Bar (Bites)',
   'Cocktailworkshop in onze eigen bar: twee cocktails onder begeleiding, met bites erbij. Duurt 1,5 tot 2 uur.',
   32, 'per_person', 4, 'workshop', false, true),
  ('Workshop in de Bar (Streetfood)',
   'Cocktailworkshop in onze eigen bar: twee cocktails onder begeleiding, met streetfood erbij. Duurt 2 tot 2,5 uur.',
   42, 'per_person', 4, 'workshop', false, true);

-- Packing template for both, so a bar workshop lands on a usable list too.
-- Everything is per guest here: the bar itself supplies the fixed kit.
insert into packing_templates (package_id, name)
select id, 'Basislijst ' || package_name from service_packages
where package_name in ('Workshop in de Bar (Bites)', 'Workshop in de Bar (Streetfood)');

insert into packing_template_items (template_id, name, category, perishability, unit, scale_basis, scale_factor, sort_order)
select t.id, v.name, v.category, v.perishability, v.unit, v.scale_basis, v.scale_factor, v.sort_order
from packing_templates t
join service_packages p
  on p.id = t.package_id
 and p.package_name in ('Workshop in de Bar (Bites)', 'Workshop in de Bar (Streetfood)')
cross join (values
  ('Shakersets',   'barmateriaal', 'houdbaar',  'st', 'per_guest', 0.5::numeric, 10),
  ('Jiggers',      'barmateriaal', 'houdbaar',  'st', 'per_guest', 0.5,          11),
  ('Werkglazen',   'glaswerk',     'houdbaar',  'st', 'per_guest', 2,            20),
  ('IJsblokjes',   'ijs',          'diepvries', 'kg', 'per_guest', 0.5,          30),
  ('Servetten',    'verbruik',     'houdbaar',  'st', 'per_guest', 2,            40),
  ('Schorten',     'verbruik',     'houdbaar',  'st', 'per_guest', 1,            41)
) as v(name, category, perishability, unit, scale_basis, scale_factor, sort_order);

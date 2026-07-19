-- Cocktail menu refresh: swap out the six launch cocktails for three new
-- ones, recipe included. `cocktail_ingredients` cascades on cocktail_menu
-- delete, so removing the old menu rows clears their recipes too.

begin;

delete from cocktail_menu where name in (
  'The Old Fashioned',
  'Smoked Negroni',
  'Espresso Martini',
  'Rijssen Sour',
  'Garden Mule',
  'Golden Fizz'
);

insert into cocktail_menu (name, description, category, is_featured, is_active) values
('Pornstar Martini', 'Wodka met mangosap, passievrucht en vanille, afgewerkt met een schuimige top.', 'klassiek', false, true),
('1985', 'Fruitige mix van wodka, passoa, aardbei en ananas met een vleugje vanille.', 'signature', false, true),
('Amaretto Sour', 'Amaretto met citroensap, suikersiroop en een romige schuimtop.', 'klassiek', false, true);

insert into cocktail_ingredients (cocktail_id, name, amount, unit, category, perishability, sort_order)
select m.id, v.name, v.amount, v.unit, v.category, v.perishability, v.sort_order
from cocktail_menu m
join (values
  ('Pornstar Martini', 'Vodka',                   45::numeric, 'ml', 'sterke_drank', 'houdbaar', 0),
  ('Pornstar Martini', 'Mangosap',                 70,         'ml', 'mixers',       'houdbaar', 1),
  ('Pornstar Martini', 'Passievruchtpuree',        20,         'ml', 'vers',         'vers',     2),
  ('Pornstar Martini', 'Eiwit / Foambitters',      20,         'ml', 'vers',         'vers',     3),
  ('Pornstar Martini', 'Limoensap',                 5,         'ml', 'vers',         'vers',     4),
  ('Pornstar Martini', 'Vanille siroop',            5,         'ml', 'mixers',       'houdbaar', 5),

  ('1985', 'Vodka',                                40,         'ml', 'sterke_drank', 'houdbaar', 0),
  ('1985', 'Passoa',                                20,         'ml', 'sterke_drank', 'houdbaar', 1),
  ('1985', 'Aardbeipuree',                          20,         'ml', 'vers',         'vers',     2),
  ('1985', 'Vanille siroop',                         5,         'ml', 'mixers',       'houdbaar', 3),
  ('1985', 'Limoensap',                              5,         'ml', 'vers',         'vers',     4),
  ('1985', 'Grenadine',                              5,         'ml', 'mixers',       'houdbaar', 5),
  ('1985', 'Ananassap',                             80,         'ml', 'mixers',       'houdbaar', 6),

  ('Amaretto Sour', 'Amaretto',                     60,         'ml', 'sterke_drank', 'houdbaar', 0),
  ('Amaretto Sour', 'Citroensap',                   45,         'ml', 'vers',         'vers',     1),
  ('Amaretto Sour', 'Suikersiroop',                 15,         'ml', 'mixers',       'houdbaar', 2),
  ('Amaretto Sour', 'Eiwit / Foambitters',          20,         'ml', 'vers',         'vers',     3)
) as v(cocktail_name, name, amount, unit, category, perishability, sort_order)
  on v.cocktail_name = m.name
where m.name in ('Pornstar Martini', '1985', 'Amaretto Sour');

commit;

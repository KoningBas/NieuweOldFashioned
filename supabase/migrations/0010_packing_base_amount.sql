-- Packing lines carry two numbers now.
--
-- A line generated from recipes converts a total into shopping units: 200 x
-- 30 ml against a 700 ml bottle becomes 9 flessen, and until now the 6.000 ml
-- behind that was thrown away. Next to the crate that is the number you want —
-- it tells you how much actually gets poured, so you can see how much is left
-- in the last bottle.
--
-- Null on both columns means quantity IS the amount (25 limoenen, 12 kg ijs).
-- Manual lines and template lines stay null; so do lines generated before this
-- migration, until the list is generated again.

alter table packing_list_items
  add column base_amount numeric(10,2),
  add column base_unit text;

comment on column packing_list_items.base_amount is
  'Recipe total behind a packed quantity (6000 for 9 x 700ml). Null when quantity is already the base amount.';
comment on column packing_list_items.base_unit is
  'Unit of base_amount (ml/cl/g/st). Null together with base_amount.';

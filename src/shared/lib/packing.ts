// Packing list generation: template scaling, ingredient aggregation and
// merging. Pure functions — the tab component only does I/O around these.

import type {
  CocktailIngredient, PackingCategory, PackingItemOrigin, PackingTemplateItem, Perishability,
} from '../types/db';

export interface DraftItem {
  name: string;
  category: PackingCategory;
  perishability: Perishability;
  quantity: number;
  unit: string;
  origin: PackingItemOrigin;
  sort_order: number;
}

export const CATEGORY_LABELS: Record<PackingCategory, string> = {
  sterke_drank: 'Sterke drank',
  mixers: 'Mixers & siropen',
  vers: 'Vers',
  ijs: 'IJs',
  glaswerk: 'Glaswerk',
  barmateriaal: 'Barmateriaal',
  verbruik: 'Verbruik',
  techniek: 'Bar & techniek',
};

export const CATEGORY_ORDER: PackingCategory[] = [
  'sterke_drank', 'mixers', 'vers', 'ijs', 'glaswerk', 'barmateriaal', 'verbruik', 'techniek',
];

export const PERISHABILITY_LABELS: Record<Perishability, string> = {
  houdbaar: 'Houdbaar',
  vers: 'Vers',
  diepvries: 'Diepvries / ijs',
};

export const PERISHABILITY_ORDER: Perishability[] = ['houdbaar', 'vers', 'diepvries'];

/** Weight/volume units keep one decimal; countable units round up to whole. */
function roundQuantity(value: number, unit: string): number {
  const fractional = ['kg', 'l', 'g', 'ml', 'cl'].includes(unit.toLowerCase());
  return fractional ? Math.ceil(value * 10) / 10 : Math.ceil(value);
}

export function scaleTemplateItem(
  item: Pick<PackingTemplateItem, 'name' | 'category' | 'perishability' | 'unit' | 'scale_basis' | 'scale_factor' | 'sort_order'>,
  guests: number,
  cocktails: number,
): DraftItem {
  const base =
    item.scale_basis === 'per_guest' ? item.scale_factor * guests :
    item.scale_basis === 'per_cocktail' ? item.scale_factor * cocktails :
    item.scale_factor;
  return {
    name: item.name,
    category: item.category,
    perishability: item.perishability,
    quantity: roundQuantity(base, item.unit),
    unit: item.unit,
    origin: item.scale_basis === 'fixed' ? 'template' : 'scaling',
    sort_order: item.sort_order,
  };
}

interface PlannedCocktail {
  cocktail_id: string;
  planned_count: number;
}

/**
 * Sum ingredients across the planned cocktails, then convert to shopping
 * units: 200 x 30 ml with a 700 ml bottle becomes 9 bottles (always rounded
 * up — running out mid-event is the expensive failure).
 */
export function aggregateIngredients(
  planned: PlannedCocktail[],
  ingredients: CocktailIngredient[],
  startSort = 100,
): DraftItem[] {
  const byCocktail = new Map<string, number>();
  for (const p of planned) {
    if (p.planned_count > 0) byCocktail.set(p.cocktail_id, p.planned_count);
  }

  // Merge on name + base unit so limes from two recipes become one line.
  const merged = new Map<string, { total: number; ing: CocktailIngredient }>();
  for (const ing of ingredients) {
    const count = byCocktail.get(ing.cocktail_id);
    if (!count) continue;
    const key = `${ing.name.toLowerCase()}|${ing.unit}`;
    const entry = merged.get(key);
    if (entry) entry.total += ing.amount * count;
    else merged.set(key, { total: ing.amount * count, ing });
  }

  let sort = startSort;
  return [...merged.values()].map(({ total, ing }) => {
    if (ing.pack_size && ing.pack_size > 0) {
      return {
        name: ing.name,
        category: ing.category,
        perishability: ing.perishability,
        quantity: Math.ceil(total / ing.pack_size),
        unit: ing.pack_unit || 'st',
        origin: 'cocktails' as const,
        sort_order: sort++,
      };
    }
    return {
      name: ing.name,
      category: ing.category,
      perishability: ing.perishability,
      quantity: roundQuantity(total, ing.unit),
      unit: ing.unit,
      origin: 'cocktails' as const,
      sort_order: sort++,
    };
  });
}

/**
 * Template items + cocktail totals, merged where name and unit coincide.
 *
 * The two merges differ on purpose. Template rows overlap because the base kit
 * and a package both claim a snijplank; you own one, so the larger number wins.
 * Cocktail rows are consumption on top of what the template already asks for,
 * so those add up.
 */
export function buildPackingItems(
  templateItems: Pick<PackingTemplateItem, 'name' | 'category' | 'perishability' | 'unit' | 'scale_basis' | 'scale_factor' | 'sort_order'>[],
  planned: PlannedCocktail[],
  ingredients: CocktailIngredient[],
  guests: number,
  cocktails: number,
): DraftItem[] {
  const byKey = new Map<string, DraftItem>();
  const keyOf = (item: DraftItem) => `${item.name.toLowerCase()}|${item.unit}`;

  for (const raw of templateItems) {
    const item = scaleTemplateItem(raw, guests, cocktails);
    const existing = byKey.get(keyOf(item));
    if (existing) existing.quantity = Math.max(existing.quantity, item.quantity);
    else byKey.set(keyOf(item), { ...item });
  }

  for (const item of aggregateIngredients(planned, ingredients)) {
    const existing = byKey.get(keyOf(item));
    if (existing) existing.quantity = roundQuantity(existing.quantity + item.quantity, item.unit);
    else byKey.set(keyOf(item), { ...item });
  }

  return [...byKey.values()].sort((a, b) => a.sort_order - b.sort_order);
}

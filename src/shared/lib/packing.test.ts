import { describe, expect, it } from 'vitest';
import {
  aggregateIngredients, buildPackingItems, formatQuantity, ORDER_CATEGORY_ORDER, scaleTemplateItem,
} from './packing';
import type { CocktailIngredient } from '../types/db';

const templateItem = (over: Partial<Parameters<typeof scaleTemplateItem>[0]> = {}) => ({
  name: 'Highball glazen', category: 'glaswerk' as const, perishability: 'houdbaar' as const,
  unit: 'st', scale_basis: 'per_guest' as const, scale_factor: 1.5, sort_order: 0, ...over,
});

const ingredient = (over: Partial<CocktailIngredient> = {}): CocktailIngredient => ({
  id: 'i1', cocktail_id: 'c1', name: 'Koffielikeur', amount: 30, unit: 'ml',
  category: 'sterke_drank', perishability: 'houdbaar', pack_size: 700, pack_unit: 'fles',
  sort_order: 0, ...over,
});

describe('scaleTemplateItem', () => {
  it('scales per guest and rounds countables up', () => {
    expect(scaleTemplateItem(templateItem(), 80, 200).quantity).toBe(120);
    expect(scaleTemplateItem(templateItem({ scale_factor: 0.75 }), 80, 200).quantity).toBe(60);
    expect(scaleTemplateItem(templateItem({ scale_factor: 0.7 }), 81, 200).quantity).toBe(57); // 56.7 -> 57
  });

  it('scales per cocktail with one decimal for weights', () => {
    const ijs = templateItem({ name: 'IJsblokjes', unit: 'kg', scale_basis: 'per_cocktail', scale_factor: 0.25 });
    expect(scaleTemplateItem(ijs, 80, 150).quantity).toBe(37.5);
  });

  it('keeps fixed items fixed', () => {
    const shaker = templateItem({ name: 'Shakers', scale_basis: 'fixed', scale_factor: 3 });
    expect(scaleTemplateItem(shaker, 500, 900).quantity).toBe(3);
  });
});

describe('aggregateIngredients', () => {
  it('converts totals to packs, rounded up: 200 x 30 ml / 700 ml = 9 bottles', () => {
    const items = aggregateIngredients([{ cocktail_id: 'c1', planned_count: 200 }], [ingredient()]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(9);
    expect(items[0].unit).toBe('fles');
  });

  it('keeps the poured total behind the pack count', () => {
    const items = aggregateIngredients([{ cocktail_id: 'c1', planned_count: 200 }], [ingredient()]);
    // 9 flessen is 6.300 ml ingekocht; de recepten schenken er 6.000 uit.
    expect(items[0].base_amount).toBe(6000);
    expect(items[0].base_unit).toBe('ml');
  });

  it('leaves the bracket empty when quantity already is the amount', () => {
    const munt = ingredient({ name: 'Munt', amount: 8, unit: 'g', pack_size: null, pack_unit: null });
    const items = aggregateIngredients([{ cocktail_id: 'c1', planned_count: 40 }], [munt]);
    expect(items[0].base_amount).toBeNull();
    expect(items[0].base_unit).toBeNull();
  });

  it('merges the same ingredient across cocktails before packing', () => {
    const limoenA = ingredient({ id: 'a', cocktail_id: 'c1', name: 'Limoensap', amount: 25, unit: 'ml', pack_size: 500, pack_unit: 'fles' });
    const limoenB = ingredient({ id: 'b', cocktail_id: 'c2', name: 'Limoensap', amount: 20, unit: 'ml', pack_size: 500, pack_unit: 'fles' });
    const items = aggregateIngredients(
      [{ cocktail_id: 'c1', planned_count: 60 }, { cocktail_id: 'c2', planned_count: 50 }],
      [limoenA, limoenB],
    );
    // 60x25 + 50x20 = 2500 ml -> 5 flessen
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it('keeps the base unit when no pack size is set', () => {
    const munt = ingredient({ name: 'Munt', amount: 8, unit: 'g', pack_size: null, pack_unit: null, perishability: 'vers' });
    const items = aggregateIngredients([{ cocktail_id: 'c1', planned_count: 40 }], [munt]);
    expect(items[0].quantity).toBe(320);
    expect(items[0].unit).toBe('g');
  });

  it('skips cocktails planned at zero', () => {
    expect(aggregateIngredients([{ cocktail_id: 'c1', planned_count: 0 }], [ingredient()])).toHaveLength(0);
  });
});

describe('buildPackingItems', () => {
  it('merges template and cocktail lines with the same name and unit', () => {
    const template = [templateItem({ name: 'Limoenen', category: 'vers' as const, unit: 'st', scale_basis: 'fixed' as const, scale_factor: 10 })];
    const limoen = ingredient({ name: 'Limoenen', amount: 0.5, unit: 'st', pack_size: null, pack_unit: null, category: 'vers', perishability: 'vers' });
    const items = buildPackingItems(template, [{ cocktail_id: 'c1', planned_count: 100 }], [limoen], 80, 200);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(60); // 10 vast + 50 uit cocktails
  });

  it('takes the largest count when base and package template overlap', () => {
    const base = templateItem({ name: 'Snijplank + mes', category: 'barmateriaal' as const, unit: 'st', scale_basis: 'fixed' as const, scale_factor: 1, sort_order: 60 });
    const pkg = templateItem({ name: 'Snijplank + mes', category: 'barmateriaal' as const, unit: 'st', scale_basis: 'fixed' as const, scale_factor: 2, sort_order: 12 });
    const items = buildPackingItems([base, pkg], [], [], 80, 200);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2); // niet 3 — je hebt er twee, geen drie
  });

  it('keeps distinct units apart', () => {
    const template = [templateItem({ name: 'IJsblokjes', unit: 'kg', scale_basis: 'per_cocktail' as const, scale_factor: 0.25, category: 'ijs' as const })];
    const zak = ingredient({ name: 'IJsblokjes', amount: 0.2, unit: 'g', pack_size: null, pack_unit: null, category: 'ijs' });
    const items = buildPackingItems(template, [{ cocktail_id: 'c1', planned_count: 100 }], [zak], 80, 100);
    expect(items).toHaveLength(2);
  });

  it('carries the poured total through a merge with a template line', () => {
    const template = [templateItem({ name: 'Koffielikeur', category: 'sterke_drank' as const, unit: 'fles', scale_basis: 'fixed' as const, scale_factor: 1 })];
    const items = buildPackingItems(template, [{ cocktail_id: 'c1', planned_count: 200 }], [ingredient()], 80, 200);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(10); // 1 uit het sjabloon + 9 uit de cocktails
    expect(items[0].base_amount).toBe(6000); // het sjabloon draagt geen ml bij
  });

  it('gives template lines no bracketed amount', () => {
    const items = buildPackingItems([templateItem()], [], [], 80, 200);
    expect(items[0].base_amount).toBeNull();
  });
});

describe('formatQuantity', () => {
  it('puts the poured total in brackets behind the packs', () => {
    expect(formatQuantity({ quantity: 9, unit: 'fles', base_amount: 6000, base_unit: 'ml' }))
      .toBe('9 fles (6.000 ml)');
  });

  it('says one number when there is one number', () => {
    expect(formatQuantity({ quantity: 25, unit: 'st', base_amount: null, base_unit: null }))
      .toBe('25 st');
  });
});

describe('ORDER_CATEGORY_ORDER', () => {
  it('leaves glassware off the shopping list — it rides along in the van', () => {
    expect(ORDER_CATEGORY_ORDER).not.toContain('glaswerk');
    expect(ORDER_CATEGORY_ORDER).toContain('sterke_drank');
  });
});

// Money math for quotes and invoices. Line prices are VAT-inclusive (the
// customer-facing choice); the VAT specification is computed back from them.
// Rounding happens per line total and then per rate group — never per unit —
// so the printed sum always equals the sum of the printed lines.

export interface MoneyLine {
  quantity: number;
  unit_price_incl: number;
  vat_rate: number;
}

export interface VatGroup {
  rate: number;
  incl: number;
  ex: number;
  vat: number;
}

export interface DocumentTotals {
  totalIncl: number;
  totalEx: number;
  totalVat: number;
  groups: VatGroup[];
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineTotalIncl(line: MoneyLine): number {
  return round2(line.quantity * line.unit_price_incl);
}

export function documentTotals(lines: MoneyLine[]): DocumentTotals {
  const byRate = new Map<number, number>();
  for (const line of lines) {
    byRate.set(line.vat_rate, round2((byRate.get(line.vat_rate) ?? 0) + lineTotalIncl(line)));
  }
  const groups: VatGroup[] = [...byRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, incl]) => {
      const ex = round2(incl / (1 + rate / 100));
      return { rate, incl, ex, vat: round2(incl - ex) };
    });
  const totalIncl = round2(groups.reduce((sum, g) => sum + g.incl, 0));
  const totalEx = round2(groups.reduce((sum, g) => sum + g.ex, 0));
  return { totalIncl, totalEx, totalVat: round2(totalIncl - totalEx), groups };
}

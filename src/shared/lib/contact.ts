/**
 * Contactgegevens van The Old Fashioned Rijssen.
 *
 * Enige bron van waarheid voor de React-pagina's. De statische index.html
 * herhaalt deze waarden met de hand — pas die mee aan bij een wijziging.
 */

export const EMAIL = 'info@oldfashionedbar.nl';

export const TELEFOON = '+31548519804';
export const TELEFOON_WEERGAVE = '0548 51 98 04';

export const ADRES = {
  straat: 'Grotestraat 12',
  postcode: '7461 KG',
  plaats: 'Rijssen',
} as const;

export const SOCIALS = [
  { naam: 'Instagram', href: 'https://www.instagram.com/oldfashionedrijssen' },
  { naam: 'Facebook', href: 'https://www.facebook.com/oldfashionedrijssen' },
  { naam: 'TikTok', href: 'https://www.tiktok.com/@theoldfashionedbar' },
] as const;

export function mailtoHref(onderwerp?: string): string {
  return onderwerp ? `mailto:${EMAIL}?subject=${encodeURIComponent(onderwerp)}` : `mailto:${EMAIL}`;
}

import { SOCIALS } from '../lib/contact';

const ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
  ),
  Facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
  ),
  TikTok: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0115.54 3h-3.09v12.4a2.59 2.59 0 01-2.59 2.5 2.6 2.6 0 01-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 004.3 1.38V7.3c-.01 0-1.89.09-3.24-1.48z" /></svg>
  ),
};

export function SocialLinks() {
  return (
    <div className="flex items-center gap-4">
      {SOCIALS.map((social) => (
        <a
          key={social.naam}
          href={social.href}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded text-white transition-colors hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
          aria-label={social.naam}
        >
          {ICONS[social.naam]}
        </a>
      ))}
    </div>
  );
}

import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ open, title, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-surface-elevated border-l border-white/10 p-8 overflow-y-auto shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-heading text-2xl">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-white text-2xl leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 rounded" aria-label="Sluiten">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

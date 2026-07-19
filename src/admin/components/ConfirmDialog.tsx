// Confirmation for the deletions that reach outside this screen: a package or a
// cocktail is referenced by the public site and by past jobs. Row-level
// deletions inside a table do not use this; they get an undo toast instead,
// because clearing out a recipe means deleting five things in a row.
//
// Built on <dialog>, so focus trapping, Escape and the backdrop are the
// browser's job rather than ours.

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  tone?: 'danger' | 'neutral';
}

export function ConfirmDialog({
  open, title, children, confirmLabel, onConfirm, onCancel, busy = false, tone = 'danger',
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // onCancel is Escape. Opening and closing is driven by the `open` prop, so
  // there is deliberately no onClose handler to echo back into it.
  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-surface-elevated p-6 text-white shadow-[0_24px_60px_-24px_rgb(0_0_0/0.7)] backdrop:bg-black/60"
    >
      <h2 className="font-heading text-xl">{title}</h2>
      <div className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{children}</div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          disabled={busy}
          className="h-11 rounded-lg border border-white/15 px-5 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          Annuleren
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`h-11 rounded-lg px-5 text-[0.9375rem] font-medium transition-colors duration-200 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            tone === 'danger'
              ? 'border border-danger/40 bg-danger/15 text-danger hover:bg-danger/25 focus-visible:outline-danger'
              : 'bg-gold text-surface hover:bg-gold-light focus-visible:outline-gold-light'
          }`}
        >
          {busy ? 'Bezig…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

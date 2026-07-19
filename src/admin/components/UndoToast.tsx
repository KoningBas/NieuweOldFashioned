// Sits above the phone tab bar and never takes focus: you should be able to
// carry on deleting rows while it is up.

import type { Undoable } from '../lib/undo';
import { IconX } from './icons';

interface Props {
  pending: Undoable | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ pending, onUndo, onDismiss }: Props) {
  if (!pending) return null;

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface-raised px-4 py-3 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.7)]">
        <span className="text-[0.9375rem] text-white/85">{pending.label}</span>
        <button
          type="button"
          onClick={onUndo}
          className="h-9 rounded-lg px-3 text-[0.9375rem] font-medium text-gold-light transition-colors duration-150 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          Ongedaan maken
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Melding sluiten"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}

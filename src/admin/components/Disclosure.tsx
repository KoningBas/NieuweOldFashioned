// Row expander used by the beheer lists: a cocktail opens its ingredients, a
// package opens its packing template. The panel mounts only while open, so a
// list of twenty packages does not fetch twenty templates on load.

import { useId, useState, type ReactNode } from 'react';
import { IconChevronRight } from './icons';

interface Props {
  /** Rendered inside the toggle button, right of the chevron. */
  summary: ReactNode;
  /** Sits beside the toggle, outside it — a button cannot nest a button. */
  actions?: ReactNode;
  children: ReactNode;
}

export function Disclosure({ summary, actions, children }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-5 py-4 text-left transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light"
        >
          <IconChevronRight
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
          <span className="min-w-0 flex-1">{summary}</span>
        </button>
        {actions}
      </div>
      {open && (
        <div id={panelId} className="border-t border-white/5 bg-surface/40 px-5 py-5">
          {children}
        </div>
      )}
    </>
  );
}

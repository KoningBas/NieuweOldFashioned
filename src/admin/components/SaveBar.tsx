// The one place on a beheer screen that answers "is my work safe?". It sits at
// the foot of the page and follows you down it, above the phone tab bar.
//
// Everything here saves itself, so most of the time this bar is reassurance
// rather than a control. It still carries a real button: the reflex to press
// something before closing a laptop is older than autosave, and honouring it
// costs one row of pixels. The button only turns gold when there is actually
// something to save — a full-strength accent on an idle control would compete
// with the screen's own primary action for no reason.

import { useEffect } from 'react';
import { usePageSaveState, type SaveStatus } from '../lib/saveState';
import { IconCheck } from './icons';

const LABELS: Record<SaveStatus, string> = {
  idle: 'Alles opgeslagen',
  dirty: 'Nog niet opgeslagen',
  saving: 'Opslaan…',
  saved: 'Opgeslagen',
  error: 'Opslaan mislukt',
};

const QUIET_BUTTON =
  'border border-white/15 text-white/85 hover:border-white/30 hover:text-white focus-visible:outline-gold-light';
const LOUD_BUTTON =
  'bg-gold text-surface hover:bg-gold-light focus-visible:outline-gold-light';
const DANGER_BUTTON =
  'border border-danger/40 text-danger hover:bg-danger/10 focus-visible:outline-danger';

export function SaveBar() {
  const { status, error, unsaved, saveNow } = usePageSaveState();

  // Leaving with a write still in the air loses it. The browser's own dialog is
  // the only thing that can interrupt a tab close, so use that.
  useEffect(() => {
    if (!unsaved) return;
    function warn(e: BeforeUnloadEvent) { e.preventDefault(); }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const failed = status === 'error';
  const pending = status === 'dirty' || status === 'saving';

  return (
    <div
      className={`save-bar mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3 backdrop-blur transition-colors duration-200 ${
        failed ? 'border-danger/40 bg-danger/10' : 'border-white/10 bg-surface-elevated/95'
      }`}
    >
      <p role="status" aria-live="polite" className="flex min-w-0 items-center gap-2.5 text-sm">
        <Indicator status={status} />
        <span className={failed ? 'text-danger' : status === 'saved' ? 'text-ok' : 'text-muted'}>
          {failed && error ? error : LABELS[status]}
        </span>
      </p>

      <button
        type="button"
        onClick={() => { void saveNow(); }}
        disabled={status === 'saving'}
        className={`ml-auto h-11 shrink-0 rounded-lg px-6 text-[0.9375rem] font-medium transition-colors duration-200 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          failed ? DANGER_BUTTON : pending ? LOUD_BUTTON : QUIET_BUTTON
        }`}
      >
        {failed ? 'Opnieuw proberen' : 'Opslaan'}
      </button>
    </div>
  );
}

function Indicator({ status }: { status: SaveStatus }) {
  if (status === 'saved') {
    return <IconCheck size={16} className="shrink-0 text-ok" aria-hidden="true" />;
  }
  const tone =
    status === 'error' ? 'bg-danger'
    : status === 'saving' ? 'bg-gold animate-pulse motion-reduce:animate-none'
    : status === 'dirty' ? 'bg-gold'
    : 'bg-muted/50';
  return <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden="true" />;
}

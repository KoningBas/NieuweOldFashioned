// Two confirmations, deliberately different from each other.
//
// The first one is informative: it names what hangs under this request, which
// is the thing you cannot see from the page you are on. The second one is a
// plain stop — short, red, and it repeats the customer's name, so a double
// click on the first button cannot carry you through both.
//
// Reading the snapshot up front does double duty: it is what the first dialog
// counts, and it is what undo writes back afterwards.

import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { IconTrash } from './icons';
import {
  deleteRequest, snapshotLines, snapshotRequest, UNDO_WINDOW_MS, type RequestSnapshot,
} from '../lib/requestDeletion';
import { formatDateNL } from '../../shared/lib/format';
import type { QuoteRequest } from '../../shared/types/db';

interface Props {
  request: QuoteRequest;
  /** Fired once the rows are gone; the snapshot is the undo material. */
  onDeleted: (snapshot: RequestSnapshot) => void;
}

type Step = 'closed' | 'what-goes' | 'are-you-sure';

export function DeleteRequestButton({ request, onDeleted }: Props) {
  const [step, setStep] = useState<Step>('closed');
  const [snapshot, setSnapshot] = useState<RequestSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setStep('what-goes');
    setBusy(true);
    setError(null);
    setSnapshot(await snapshotRequest(request));
    setBusy(false);
  }

  function close() {
    setStep('closed');
    setSnapshot(null);
    setError(null);
  }

  async function confirmDelete() {
    if (!snapshot) return;
    setBusy(true);
    const message = await deleteRequest(snapshot);
    setBusy(false);
    if (message) { setError(message); return; }
    setStep('closed');
    onDeleted(snapshot);
  }

  const goes = snapshot ? snapshotLines(snapshot) : [];
  const invoiceNumbers = snapshot?.invoices.map((i) => i.invoice_number) ?? [];

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-danger/30 px-4 text-[0.9375rem] text-danger transition-colors duration-200 hover:bg-danger/10 hover:border-danger/50 active:bg-danger/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
      >
        <IconTrash size={16} /> Aanvraag verwijderen
      </button>

      <ConfirmDialog
        open={step === 'what-goes'}
        title="Aanvraag verwijderen?"
        confirmLabel="Verwijderen"
        busy={busy}
        onCancel={close}
        onConfirm={() => setStep('are-you-sure')}
      >
        <p>
          {request.full_name} — {formatDateNL(request.event_date)} in {request.event_city} — verdwijnt
          uit de database.
        </p>
        {busy ? (
          <p className="mt-3 text-muted">Nakijken wat eraan vastzit…</p>
        ) : goes.length > 0 ? (
          <>
            <p className="mt-3">Hier gaat mee weg:</p>
            <ul className="mt-1.5 list-disc pl-5 marker:text-white/30">
              {goes.map((line) => (
                <li key={line.text} className={line.grave ? 'text-danger marker:text-danger/50' : undefined}>
                  {line.text}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3">Er hangt verder niets aan deze aanvraag.</p>
        )}
        <p className="mt-3 text-white/70">
          Daarna heb je {UNDO_WINDOW_MS / 1000} seconden om het terug te draaien.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={step === 'are-you-sure'}
        title="Zeker weten?"
        confirmLabel="Ja, verwijderen"
        busy={busy}
        onCancel={close}
        onConfirm={confirmDelete}
      >
        {invoiceNumbers.length > 0 && (
          <p className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-danger">
            {invoiceNumbers.length === 1 ? 'Factuur' : 'Facturen'} {invoiceNumbers.join(', ')} {invoiceNumbers.length === 1 ? 'staat' : 'staan'} in
            je boekhouding en {invoiceNumbers.length === 1 ? 'verdwijnt' : 'verdwijnen'} mee uit je omzetcijfers.
          </p>
        )}
        <p>Nog één keer klikken en {request.full_name} is weg.</p>
        {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      </ConfirmDialog>
    </>
  );
}

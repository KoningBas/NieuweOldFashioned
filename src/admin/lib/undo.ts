// Undo for row deletions. The row is gone from the database by the time the
// toast appears — no pending-delete limbo, so what you see on screen is what is
// stored. Undo puts it back by its original id, which works because these rows
// own nothing below them.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Undoable {
  label: string;
  undo: () => void | Promise<void>;
}

const WINDOW_MS = 6000;

/** @param windowMs how long the toast stays up. Longer for deletions that took
 *  a confirmation to make — you want time to read what you just did. */
export function useUndoable(windowMs: number = WINDOW_MS) {
  const [pending, setPending] = useState<Undoable | null>(null);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const offer = useCallback((label: string, undo: Undoable['undo']) => {
    stop();
    setPending({ label, undo });
    timer.current = window.setTimeout(() => { setPending(null); timer.current = null; }, windowMs);
  }, [stop, windowMs]);

  const run = useCallback(async () => {
    stop();
    const current = pending;
    setPending(null);
    await current?.undo();
  }, [pending, stop]);

  const dismiss = useCallback(() => { stop(); setPending(null); }, [stop]);

  useEffect(() => stop, [stop]);

  return { pending, offer, run, dismiss };
}

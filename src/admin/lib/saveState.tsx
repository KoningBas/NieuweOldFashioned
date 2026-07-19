// A beheer screen is not one form. It is a page with several editors on it that
// each write to their own table: a settings block, a table of rows, a template
// per package. This file is the wire between them. Every editor reports what it
// is doing under its own key; the save bar at the bottom of the page shows the
// aggregate and can push every pending write out at once.
//
// Saving happens on its own ~800ms after the last keystroke. The button exists
// for the moment you distrust that, and for the reassurance of a green line
// before you close the laptop.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/** A save returns null when it worked, or the message to show when it didn't. */
export type SaveResult = string | null;

interface Entry {
  status: SaveStatus;
  error: string | null;
}

interface Channel {
  setStatus: (key: string, status: SaveStatus, error: string | null) => void;
  setFlush: (key: string, flush: (() => Promise<void>) | null) => void;
  release: (key: string) => void;
  entries: Record<string, Entry>;
  flushAll: () => Promise<void>;
}

const SaveChannel = createContext<Channel | null>(null);

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const flushes = useRef(new Map<string, () => Promise<void>>());

  const setStatus = useCallback((key: string, status: SaveStatus, error: string | null) => {
    setEntries((prev) => {
      const current = prev[key];
      if (current && current.status === status && current.error === error) return prev;
      return { ...prev, [key]: { status, error } };
    });
  }, []);

  const setFlush = useCallback((key: string, flush: (() => Promise<void>) | null) => {
    if (flush) flushes.current.set(key, flush);
    else flushes.current.delete(key);
  }, []);

  const release = useCallback((key: string) => {
    flushes.current.delete(key);
    setEntries((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const flushAll = useCallback(async () => {
    await Promise.all([...flushes.current.values()].map((run) => run()));
  }, []);

  const value = useMemo<Channel>(
    () => ({ setStatus, setFlush, release, entries, flushAll }),
    [setStatus, setFlush, release, entries, flushAll],
  );

  return <SaveChannel.Provider value={value}>{children}</SaveChannel.Provider>;
}

/** The worst state on the page wins: one failed write matters more than five
 *  quiet ones. */
function aggregate(entries: Record<string, Entry>): Entry {
  const list = Object.values(entries);
  const failed = list.find((e) => e.status === 'error');
  if (failed) return { status: 'error', error: failed.error };
  if (list.some((e) => e.status === 'saving')) return { status: 'saving', error: null };
  if (list.some((e) => e.status === 'dirty')) return { status: 'dirty', error: null };
  if (list.some((e) => e.status === 'saved')) return { status: 'saved', error: null };
  return { status: 'idle', error: null };
}

export interface PageSaveState {
  status: SaveStatus;
  error: string | null;
  /** True while there is work the page would lose on navigation. */
  unsaved: boolean;
  saveNow: () => Promise<void>;
}

export function usePageSaveState(): PageSaveState {
  const channel = useContext(SaveChannel);
  const [forced, setForced] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const confirmTimer = useRef<number | null>(null);

  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const live = channel ? aggregate(channel.entries) : { status: 'idle' as SaveStatus, error: null };

  const saveNow = useCallback(async () => {
    if (!channel) return;
    setForced(true);
    setConfirmed(false);
    await channel.flushAll();
    setForced(false);
    // Pressing save with nothing pending should still answer you.
    setConfirmed(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmed(false), 2500);
  }, [channel]);

  let status = live.status;
  if (forced && status !== 'error') status = 'saving';
  else if (confirmed && status === 'idle') status = 'saved';

  return {
    status,
    error: live.error,
    unsaved: live.status === 'dirty' || live.status === 'saving' || forced,
    saveNow,
  };
}

/** Shared plumbing: keeps a hook's status in sync with the page channel and
 *  hands the channel a way to force this editor's pending write. */
function useChannelReport(key: string) {
  const channel = useContext(SaveChannel);
  const ref = useRef(channel);
  ref.current = channel;

  const report = useCallback((status: SaveStatus, error: string | null = null) => {
    ref.current?.setStatus(key, status, error);
  }, [key]);

  const registerFlush = useCallback((flush: () => Promise<void>) => {
    ref.current?.setFlush(key, flush);
  }, [key]);

  useEffect(() => {
    const channelAtMount = ref.current;
    return () => { channelAtMount?.release(key); };
  }, [key]);

  return { report, registerFlush };
}

interface AutosaveOptions<T> {
  /** Unique within the page. Two editors sharing a key overwrite each other. */
  key: string;
  value: T;
  save: (value: T) => Promise<SaveResult>;
  /** False parks the editor: no scheduling, no status. Read-only documents. */
  enabled?: boolean;
  delay?: number;
}

/**
 * Watches one value and writes it back on its own. Comparison is by JSON, which
 * is exact enough for the shapes here (settings rows, form state) and cheap.
 */
export function useAutosave<T>({ key, value, save, enabled = true, delay = 800 }: AutosaveOptions<T>) {
  const { report, registerFlush } = useChannelReport(key);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const serialized = JSON.stringify(value);
  const baseline = useRef(serialized);
  const latest = useRef({ value, save });
  latest.current = { value, save };

  const timer = useRef<number | null>(null);
  const settle = useRef<number | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  const announce = useCallback((next: SaveStatus, message: string | null = null) => {
    if (mounted.current) {
      setStatus(next);
      setError(message);
    }
    report(next, message);
  }, [report]);

  const run = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (inFlight.current) await inFlight.current;

    const snapshot = JSON.stringify(latest.current.value);
    if (snapshot === baseline.current) return;

    announce('saving');
    const pending = (async () => {
      const message = await latest.current.save(latest.current.value);
      if (message) { announce('error', message); return; }
      baseline.current = snapshot;
      announce('saved');
      if (settle.current) clearTimeout(settle.current);
      settle.current = window.setTimeout(() => announce('idle'), 2500);
    })();

    inFlight.current = pending;
    await pending;
    inFlight.current = null;

    // Typing carried on during the write; go round again for the remainder.
    if (JSON.stringify(latest.current.value) !== baseline.current) {
      timer.current = window.setTimeout(() => { void run(); }, delay);
    }
  }, [announce, delay]);

  useEffect(() => {
    if (!enabled || serialized === baseline.current) return;
    announce('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void run(); }, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [serialized, enabled, delay, run, announce]);

  useEffect(() => { registerFlush(run); }, [registerFlush, run]);

  useEffect(() => () => {
    mounted.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (settle.current) clearTimeout(settle.current);
    // Closing a panel mid-edit should not throw the edit away.
    if (JSON.stringify(latest.current.value) !== baseline.current) {
      void latest.current.save(latest.current.value);
    }
  }, []);

  /** Call after loading fresh data so the new values do not read as edits. */
  const reset = useCallback((next: T) => {
    baseline.current = JSON.stringify(next);
  }, []);

  return { status, error, saveNow: run, reset };
}

interface RowSaverOptions {
  key: string;
  /** Writes one row by id. Reads the row from current state itself. */
  save: (id: string) => Promise<SaveResult>;
  delay?: number;
}

/**
 * For editable tables. Rows are saved one at a time, so a table of forty lines
 * does not round-trip forty rows because you fixed one typo. `touch` after
 * every change; the rest is timing.
 */
export function useRowSaver({ key, save, delay = 800 }: RowSaverOptions) {
  const { report, registerFlush } = useChannelReport(key);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const queue = useRef(new Set<string>());
  const timer = useRef<number | null>(null);
  const settle = useRef<number | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const mounted = useRef(true);

  const announce = useCallback((next: SaveStatus, message: string | null = null) => {
    if (mounted.current) {
      setStatus(next);
      setError(message);
    }
    report(next, message);
  }, [report]);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (queue.current.size === 0) return;

    const ids = [...queue.current];
    queue.current.clear();
    announce('saving');

    const results = await Promise.all(ids.map((id) => saveRef.current(id)));
    const failure = results.find((r): r is string => Boolean(r));
    if (failure) { announce('error', failure); return; }

    announce('saved');
    if (settle.current) clearTimeout(settle.current);
    settle.current = window.setTimeout(() => announce('idle'), 2500);
  }, [announce]);

  const touch = useCallback((id: string) => {
    queue.current.add(id);
    announce('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, delay);
  }, [announce, delay, flush]);

  /** A row that no longer exists must not be written back after deletion. */
  const forget = useCallback((id: string) => {
    queue.current.delete(id);
  }, []);

  useEffect(() => { registerFlush(flush); }, [registerFlush, flush]);

  useEffect(() => () => {
    mounted.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (settle.current) clearTimeout(settle.current);
    if (queue.current.size > 0) {
      const ids = [...queue.current];
      queue.current.clear();
      ids.forEach((id) => { void saveRef.current(id); });
    }
  }, []);

  return { status, error, touch, forget, saveNow: flush };
}

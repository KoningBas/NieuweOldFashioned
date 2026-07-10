import { useEffect, useMemo, useRef, useState } from 'react';
import type { AvailabilityContext } from '../../../shared/lib/availability';
import { isDateSelectable } from '../../../shared/lib/availability';
import { toDateOnly, parseDateOnly, formatDateLongNL } from '../../../shared/lib/format';

interface Props {
  /** Selected date as 'YYYY-MM-DD', or '' when nothing is picked yet. */
  value: string;
  onChange: (value: string) => void;
  /** Availability rules; null while still loading — every day renders unselectable until it arrives. */
  ctx: AvailabilityContext | null;
}

const WEEKDAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const MONTH_YEAR = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' });

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Only Sundays and explicitly blocked dates are struck through; every other
 *  unavailable day (past, within booking notice, already booked, other closed
 *  weekdays) renders as a plain dimmed cell. */
function isStruck(date: Date, ctx: AvailabilityContext | null): boolean {
  if (date.getDay() === 0) return true;
  if (ctx && ctx.blockedDates.some((b) => b.blocked_date === toDateOnly(date))) return true;
  return false;
}

export function Calendar({ value, onChange, ctx }: Props) {
  const today = useMemo(() => new Date(), []);
  const selected = value ? parseDateOnly(value) : null;

  // The month currently on screen, and the day that owns keyboard focus.
  const [view, setView] = useState<Date>(() => startOfMonth(selected ?? today));
  const [focusDate, setFocusDate] = useState<Date>(() => selected ?? today);

  const gridRef = useRef<HTMLDivElement>(null);
  // Only steal DOM focus after a keyboard move, never on first paint.
  const shouldFocusRef = useRef(false);

  // Keep the visible month in sync whenever keyboard focus crosses a boundary.
  useEffect(() => {
    if (!sameMonth(focusDate, view)) setView(startOfMonth(focusDate));
  }, [focusDate, view]);

  useEffect(() => {
    if (!shouldFocusRef.current || !gridRef.current) return;
    shouldFocusRef.current = false;
    const el = gridRef.current.querySelector<HTMLButtonElement>(`[data-date="${toDateOnly(focusDate)}"]`);
    el?.focus();
  }, [focusDate, view]);

  const canGoPrev = view > startOfMonth(today);

  function moveFocus(next: Date) {
    shouldFocusRef.current = true;
    setFocusDate(next);
  }

  function select(date: Date) {
    if (!ctx || !isDateSelectable(date, ctx)) return;
    onChange(toDateOnly(date));
    setFocusDate(date);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let next: Date | null = null;
    switch (e.key) {
      case 'ArrowLeft': next = addDays(focusDate, -1); break;
      case 'ArrowRight': next = addDays(focusDate, 1); break;
      case 'ArrowUp': next = addDays(focusDate, -7); break;
      case 'ArrowDown': next = addDays(focusDate, 7); break;
      case 'Home': next = addDays(focusDate, -focusDate.getDay()); break;
      case 'End': next = addDays(focusDate, 6 - focusDate.getDay()); break;
      case 'PageUp': next = addMonths(focusDate, -1); break;
      case 'PageDown': next = addMonths(focusDate, 1); break;
      default: return;
    }
    e.preventDefault();
    moveFocus(next);
  }

  // Build the leading blanks + numbered days for the visible month.
  const first = startOfMonth(view);
  const offset = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  return (
    <div className="rounded-xl bg-surface border border-white/10 p-4 md:p-5 select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => canGoPrev && setView(addMonths(view, -1))}
          disabled={!canGoPrev}
          aria-label="Vorige maand"
          className="grid h-9 w-9 place-items-center rounded-full text-prose transition-colors duration-200 hover:bg-white/5 hover:text-gold-light disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-prose focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <ChevronLeft />
        </button>
        <div aria-live="polite" className="font-heading text-lg md:text-xl text-white tracking-wide">
          {capitalize(MONTH_YEAR.format(view))}
        </div>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          aria-label="Volgende maand"
          className="grid h-9 w-9 place-items-center rounded-full text-prose transition-colors duration-200 hover:bg-white/5 hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1" role="row">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} role="columnheader" className="py-1.5 text-center text-xs font-medium uppercase tracking-wider text-muted">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div ref={gridRef} role="grid" onKeyDown={onKeyDown} className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} role="gridcell" aria-hidden="true" />;

          const selectable = ctx ? isDateSelectable(date, ctx) : false;
          const isSelected = selected != null && sameDay(date, selected);
          const struck = !selectable && isStruck(date, ctx);
          const isToday = sameDay(date, today);
          const isFocusDay = sameDay(date, focusDate);

          let stateClass: string;
          if (isSelected) {
            stateClass = 'bg-gold text-surface font-semibold shadow-[0_2px_10px_-2px_rgba(200,146,42,0.7)]';
          } else if (selectable) {
            stateClass = 'text-white hover:bg-gold/15 hover:text-gold-light';
          } else if (struck) {
            stateClass = 'text-muted/70 line-through decoration-muted/70 cursor-not-allowed';
          } else {
            stateClass = 'text-white/25 cursor-not-allowed';
          }

          return (
            <div key={toDateOnly(date)} role="gridcell" className="flex justify-center">
              <button
                type="button"
                data-date={toDateOnly(date)}
                tabIndex={isFocusDay ? 0 : -1}
                aria-label={formatDateLongNL(toDateOnly(date))}
                aria-disabled={!selectable}
                aria-selected={isSelected}
                onClick={() => select(date)}
                className={`relative grid h-10 w-10 place-items-center rounded-full text-base tabular-nums transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-1 ${stateClass}`}
              >
                {date.getDate()}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold-light" aria-hidden="true" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
  );
}
function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
  );
}

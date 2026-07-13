import { useEffect, useMemo, useRef, useState } from 'react';
import type { AvailabilityContext } from '../lib/availability';
import { isDateSelectable } from '../lib/availability';
import { toDateOnly, parseDateOnly, formatDateLongNL } from '../lib/format';

interface Props {
  /** Selected date as 'YYYY-MM-DD', or '' when nothing is picked yet. */
  value: string;
  onChange: (value: string) => void;
  /** Availability rules; null while still loading — every day renders unselectable until it arrives. */
  ctx: AvailabilityContext | null;
  /** Tighter cells and padding, for forms where the calendar sits beside other
   *  fields rather than owning its own wizard step. */
  compact?: boolean;
  /** White chrome instead of the gold-and-muted default: full-white borders and
   *  labels, and a white selected day. For surfaces that carry no gold at all. */
  wit?: boolean;
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

export function Calendar({ value, onChange, ctx, compact = false, wit = false }: Props) {
  const today = useMemo(() => new Date(), []);
  const selected = value ? parseDateOnly(value) : null;

  // Every place the calendar reaches for an accent colour, in one spot.
  const accent = wit
    ? {
        rand: 'border-white',
        chroom: 'text-white',
        knopHover: 'hover:bg-white/10 hover:text-white',
        gekozen: 'bg-white text-surface font-semibold',
        beschikbaar: 'text-white hover:bg-white/15',
        vandaag: 'bg-white',
        focus: 'focus-visible:outline-white',
      }
    : {
        rand: 'border-white/10',
        chroom: 'text-muted',
        knopHover: 'hover:bg-white/5 hover:text-gold-light',
        gekozen: 'bg-gold text-surface font-semibold shadow-[0_2px_10px_-2px_rgba(200,146,42,0.7)]',
        beschikbaar: 'text-white hover:bg-gold/15 hover:text-gold-light',
        vandaag: 'bg-gold-light',
        focus: 'focus-visible:outline-gold-light',
      };

  // The month currently on screen, and the day that owns keyboard focus.
  const [view, setView] = useState<Date>(() => startOfMonth(selected ?? today));
  const [focusDate, setFocusDate] = useState<Date>(() => selected ?? today);

  const gridRef = useRef<HTMLDivElement>(null);
  // Only steal DOM focus after a keyboard move, never on first paint.
  const shouldFocusRef = useRef(false);

  useEffect(() => {
    if (!shouldFocusRef.current || !gridRef.current) return;
    shouldFocusRef.current = false;
    const el = gridRef.current.querySelector<HTMLButtonElement>(`[data-date="${toDateOnly(focusDate)}"]`);
    el?.focus();
  }, [focusDate, view]);

  const canGoPrev = view > startOfMonth(today);

  /** Keyboard navigation may walk out of the visible month; the view follows it. */
  function moveFocus(next: Date) {
    shouldFocusRef.current = true;
    setFocusDate(next);
    if (!sameMonth(next, view)) setView(startOfMonth(next));
  }

  /**
   * The month buttons move the view. Keyboard focus moves along into the new
   * month — leaving it behind in the old one would drag the view straight back —
   * but DOM focus stays on the button that was clicked.
   */
  function showMonth(month: Date) {
    const start = startOfMonth(month);
    setView(start);
    setFocusDate(sameMonth(start, today) ? today : start);
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
    <div className={`rounded-xl bg-surface border ${accent.rand} select-none ${compact ? 'p-3' : 'p-4 md:p-5'}`}>
      {/* Month navigation */}
      <div className={`flex items-center justify-between ${compact ? 'mb-1.5' : 'mb-3'}`}>
        <button
          type="button"
          onClick={() => canGoPrev && showMonth(addMonths(view, -1))}
          disabled={!canGoPrev}
          aria-label="Vorige maand"
          className={`grid place-items-center rounded-full ${accent.chroom} ${accent.knopHover} transition-colors duration-200 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 ${accent.focus} focus-visible:outline-offset-2 ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}
        >
          <ChevronLeft />
        </button>
        <div aria-live="polite" className={`font-heading text-white tracking-wide ${compact ? 'text-base' : 'text-lg md:text-xl'}`}>
          {capitalize(MONTH_YEAR.format(view))}
        </div>
        <button
          type="button"
          onClick={() => showMonth(addMonths(view, 1))}
          aria-label="Volgende maand"
          className={`grid place-items-center rounded-full ${accent.chroom} ${accent.knopHover} transition-colors duration-200 focus-visible:outline focus-visible:outline-2 ${accent.focus} focus-visible:outline-offset-2 ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}
        >
          <ChevronRight />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1" role="row">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            role="columnheader"
            className={`text-center text-xs font-medium uppercase tracking-wider ${accent.chroom} ${compact ? 'py-0.5' : 'py-1.5'}`}
          >
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
            stateClass = accent.gekozen;
          } else if (selectable) {
            stateClass = accent.beschikbaar;
          } else if (struck) {
            stateClass = wit
              ? 'text-white/45 line-through decoration-white/45 cursor-not-allowed'
              : 'text-muted/70 line-through decoration-muted/70 cursor-not-allowed';
          } else {
            stateClass = wit ? 'text-white/35 cursor-not-allowed' : 'text-white/25 cursor-not-allowed';
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
                className={`relative grid place-items-center rounded-full tabular-nums transition-colors duration-150 focus-visible:outline focus-visible:outline-2 ${accent.focus} focus-visible:outline-offset-1 ${
                  compact ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base'
                } ${stateClass}`}
              >
                {date.getDate()}
                {isToday && !isSelected && (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${accent.vandaag}`}
                    aria-hidden="true"
                  />
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

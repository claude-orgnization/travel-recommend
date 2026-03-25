'use client';

import { useState, useCallback, useMemo } from 'react';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  minDate?: string;  // YYYY-MM-DD
  onChangeRange: (start: string, end: string) => void;
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDate(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m: m - 1, d };
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function DateRangePicker({
  startDate,
  endDate,
  minDate,
  onChangeRange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // "start" = next click sets start date, "end" = next click sets end date
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Calendar view month
  const [viewYear, setViewYear] = useState(() => {
    if (startDate) return parseDate(startDate).y;
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (startDate) return parseDate(startDate).m;
    return new Date().getMonth();
  });

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth],
  );

  const firstDayOfWeek = useMemo(
    () => new Date(viewYear, viewMonth, 1).getDay(),
    [viewYear, viewMonth],
  );

  const prevMonth = useCallback(() => {
    setViewMonth((m: number) => {
      if (m === 0) {
        setViewYear((y: number) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m: number) => {
      if (m === 11) {
        setViewYear((y: number) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  function handleDayClick(dateStr: string) {
    if (minDate && dateStr < minDate) return;

    if (selecting === 'start') {
      // Set start, clear end if new start is after current end
      if (endDate && dateStr >= endDate) {
        onChangeRange(dateStr, '');
      } else {
        onChangeRange(dateStr, endDate);
      }
      setSelecting('end');
    } else {
      // selecting === 'end'
      if (dateStr <= startDate) {
        // Clicked before start → treat as new start
        onChangeRange(dateStr, '');
        setSelecting('end');
      } else {
        onChangeRange(startDate, dateStr);
        setSelecting('start');
        setOpen(false);
      }
    }
  }

  function getDayClass(dateStr: string): string {
    const isDisabled = minDate && dateStr < minDate;
    const isStart = dateStr === startDate;
    const isEnd = dateStr === endDate;
    const isInRange =
      startDate && endDate && dateStr > startDate && dateStr < endDate;
    const isHoverRange =
      selecting === 'end' &&
      startDate &&
      !endDate &&
      hoverDate &&
      dateStr > startDate &&
      dateStr <= hoverDate;

    const base =
      'w-9 h-9 text-sm rounded-full flex items-center justify-center transition-colors';

    if (isDisabled) return `${base} text-gray-300 cursor-not-allowed`;
    if (isStart || isEnd)
      return `${base} bg-[var(--color-primary-600)] text-white font-bold cursor-pointer`;
    if (isInRange)
      return `${base} bg-[var(--color-primary-100)] text-[var(--color-primary-800)] cursor-pointer`;
    if (isHoverRange)
      return `${base} bg-[var(--color-primary-50)] text-[var(--color-primary-700)] cursor-pointer`;
    return `${base} hover:bg-gray-100 cursor-pointer`;
  }

  const nightCount =
    startDate && endDate
      ? Math.round(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            86400000,
        )
      : 0;

  function formatDisplay(d: string): string {
    if (!d) return '未選択';
    const { y, m, d: day } = parseDate(d);
    const dow = WEEKDAYS[new Date(y, m, day).getDay()];
    return `${y}/${m + 1}/${day}(${dow})`;
  }

  return (
    <div className="relative">
      {/* Display button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] bg-white flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-[var(--color-neutral-700)] shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="flex-1">
          <span className={startDate ? '' : 'text-gray-400'}>
            {formatDisplay(startDate)}
          </span>
          <span className="mx-2 text-gray-400">→</span>
          <span className={endDate ? '' : 'text-gray-400'}>
            {formatDisplay(endDate)}
          </span>
          {nightCount > 0 && (
            <span className="ml-2 text-xs text-[var(--color-primary-600)] font-medium">
              ({nightCount}泊)
            </span>
          )}
        </span>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute z-50 mt-1 bg-white border border-[var(--border)] rounded-xl shadow-lg p-4 w-[320px] left-0">
            {/* Selection hint */}
            <p className="text-xs text-center mb-2 text-[var(--color-neutral-700)]">
              {selecting === 'start'
                ? 'チェックイン日を選択'
                : 'チェックアウト日を選択'}
            </p>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-gray-100 rounded-full"
                aria-label="前月"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <span className="text-sm font-semibold">
                {viewYear}年{viewMonth + 1}月
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-gray-100 rounded-full"
                aria-label="次月"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={`text-xs text-center font-medium py-1 ${
                    i === 0
                      ? 'text-red-500'
                      : i === 6
                        ? 'text-blue-500'
                        : 'text-gray-500'
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const isDisabled = !!(minDate && dateStr < minDate);

                return (
                  <div key={day} className="flex items-center justify-center">
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDayClick(dateStr)}
                      onMouseEnter={() => setHoverDate(dateStr)}
                      onMouseLeave={() => setHoverDate(null)}
                      className={getDayClass(dateStr)}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick info */}
            {startDate && endDate && (
              <p className="mt-3 text-xs text-center text-[var(--color-neutral-700)]">
                {formatDisplay(startDate)} → {formatDisplay(endDate)}（{nightCount}泊）
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

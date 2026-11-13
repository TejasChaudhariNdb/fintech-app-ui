"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DayPicker, type Matcher } from "react-day-picker";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";

/**
 * App-wide date picker. Drop-in replacement for `<input type="date">`:
 * `value` and `onChange` use the same "YYYY-MM-DD" string ("" when empty),
 * so the value sent to the backend is unchanged.
 *
 * Desktop: popover anchored to the field. Mobile (<640px): bottom sheet with
 * larger tap targets. Month/year dropdowns jump across years quickly, and the
 * text box accepts typed dates (DD/MM/YYYY, DD-MM-YYYY or YYYY-MM-DD).
 */
export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  /** Earliest selectable date, "YYYY-MM-DD". */
  min?: string;
  /** Latest selectable date, "YYYY-MM-DD". */
  max?: string;
  required?: boolean;
  disabled?: boolean;
  /**
   * Show a Clear button that sets the value to "". Off by default: the backend
   * uses Pydantic `date` fields, which reject "". Enable only where the form
   * sends empty as null/undefined.
   */
  clearable?: boolean;
  /** Classes for the trigger. When set they replace the default field style. */
  className?: string;
  /** Classes for the outer wrapper. */
  wrapperClassName?: string;
  error?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
}

// ── Date helpers (local time, never toISOString: IST would shift the day) ──

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date as "YYYY-MM-DD" in local time. */
export function todayString(): string {
  return toDateString(new Date());
}

function fromDateString(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? undefined : d;
}

function validDate(y: number, m: number, d: number): Date | undefined {
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return undefined;
  }
  return date;
}

/** Parses typed input: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY or YYYY-MM-DD. */
function parseTyped(text: string): Date | undefined {
  const t = text.trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(t);
  if (m) {
    let y = Number(m[3]);
    if (m[3].length === 2) y += y > 50 ? 1900 : 2000;
    return validDate(y, Number(m[2]), Number(m[1]));
  }
  return undefined;
}

const displayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatTyped(d?: Date): string {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const MOBILE_QUERY = "(max-width: 639px)";
const PANEL_WIDTH = 320;
const PANEL_HEIGHT_ESTIMATE = 420;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

const DEFAULT_TRIGGER =
  "w-full px-4 py-3 bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all duration-200";

export default function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  min,
  max,
  required,
  disabled,
  clearable,
  className,
  wrapperClassName = "",
  error,
  id,
  name,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const autoId = useId();
  const triggerId = id ?? `dp-${autoId}`;
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: "below" | "above" }>({
    top: 0,
    left: 0,
    placement: "below",
  });

  const selected = fromDateString(value);
  const minDate = fromDateString(min);
  const maxDate = fromDateString(max);
  const today = new Date();
  const [month, setMonth] = useState<Date>(selected ?? today);
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState(false);
  const showClear = !!clearable && !required;

  useEffect(() => setMounted(true), []);

  // Reset the visible month and text box each time the picker opens.
  useEffect(() => {
    if (!open) return;
    const base = selected ?? (maxDate && maxDate < today ? maxDate : minDate && minDate > today ? minDate : today);
    setMonth(base);
    setTyped(formatTyped(selected));
    setTypedError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelH = panelRef.current?.offsetHeight || PANEL_HEIGHT_ESTIMATE;
    const spaceBelow = vh - r.bottom;
    const placement = spaceBelow < panelH + 12 && r.top > spaceBelow ? "above" : "below";
    const top = placement === "below" ? r.bottom + 6 : Math.max(8, r.top - panelH - 6);
    const left = Math.min(Math.max(8, r.left), vw - PANEL_WIDTH - 8);
    setPos({ top, left, placement });
  }, []);

  useLayoutEffect(() => {
    if (!open || isMobile) return;
    updatePosition();
    // Second pass once the panel has its real height.
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isMobile, updatePosition, month]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // Escape closes only the picker (capture phase, so a parent Modal's
  // window-level Escape handler doesn't also close the modal).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  // Desktop: click outside closes.
  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, isMobile, close]);

  const commit = (d?: Date) => {
    onChange(d ? toDateString(d) : "");
    close();
  };

  const isAllowed = (d: Date) => !(minDate && d < minDate) && !(maxDate && d > maxDate);

  const applyTyped = () => {
    if (!typed.trim()) return;
    const d = parseTyped(typed);
    if (!d || !isAllowed(d)) {
      setTypedError(true);
      return;
    }
    commit(d);
  };

  const disabledMatchers: Matcher[] = [];
  if (minDate) disabledMatchers.push({ before: minDate });
  if (maxDate) disabledMatchers.push({ after: maxDate });

  const startMonth = minDate ?? new Date(1950, 0, 1);
  const endMonth = maxDate ?? new Date(today.getFullYear() + 50, 11, 31);
  const todayAllowed = isAllowed(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const cell = isMobile ? "h-11 w-11 text-[15px]" : "h-9 w-9 text-sm";

  // React events bubble through portals to ancestors in the React tree, so a
  // parent Modal's drag-to-dismiss handlers would see clicks in the picker.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const portalGuards = {
    onMouseDown: stop,
    onMouseMove: stop,
    onMouseUp: stop,
    onTouchStart: stop,
    onTouchMove: stop,
    onTouchEnd: stop,
    onClick: stop,
    onKeyDown: stop,
  };

  const panelBody = (
    <div className="flex flex-col gap-3">
      <div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={typed}
          placeholder="DD/MM/YYYY"
          aria-label="Type a date"
          onChange={(e) => {
            setTyped(e.target.value);
            setTypedError(false);
            const d = parseTyped(e.target.value);
            if (d && d.getFullYear() >= 1000) setMonth(d);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyTyped();
            }
          }}
          className={`w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-white/5 border text-sm font-medium text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-primary-500/20 ${
            typedError
              ? "border-red-500"
              : "border-neutral-200 dark:border-white/10 focus:border-primary-500"
          }`}
        />
        {typedError && (
          <p className="mt-1 text-[11px] text-red-500">
            Enter a valid date{minDate || maxDate ? " within the allowed range" : ""}
          </p>
        )}
      </div>

      <DayPicker
        mode="single"
        selected={selected}
        onSelect={(d) => d && commit(d)}
        month={month}
        onMonthChange={setMonth}
        captionLayout="dropdown"
        startMonth={startMonth}
        endMonth={endMonth}
        disabled={disabledMatchers}
        weekStartsOn={1}
        showOutsideDays
        fixedWeeks
        autoFocus={!isMobile}
        components={{
          Chevron: ({ orientation, className: c }) => {
            if (orientation === "left") return <ChevronLeft size={18} className={c} />;
            if (orientation === "right") return <ChevronRight size={18} className={c} />;
            return <ChevronDown size={14} className={c} />;
          },
        }}
        classNames={{
          root: "w-full",
          months: "relative",
          month: "w-full",
          month_caption: "flex items-center h-9 mb-2 pr-20",
          caption_label:
            "inline-flex items-center gap-1 text-sm font-bold text-neutral-900 dark:text-white",
          dropdowns: "flex items-center gap-1.5",
          dropdown_root:
            "relative inline-flex items-center px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 focus-within:ring-2 focus-within:ring-primary-500/30",
          dropdown: "absolute inset-0 w-full opacity-0 cursor-pointer appearance-none z-10",
          nav: "absolute top-0 right-0 flex items-center gap-1 h-9 z-20",
          button_previous:
            "h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none",
          button_next:
            "h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none",
          month_grid: "w-full border-collapse",
          weekdays: "",
          weekday:
            "pb-1 text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500 text-center",
          week: "",
          day: "p-0 text-center group",
          day_button: `${cell} mx-auto inline-flex items-center justify-center rounded-full font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors`,
          today:
            "[&>button]:text-primary-600 dark:[&>button]:text-primary-400 [&>button]:font-bold [&>button]:ring-1 [&>button]:ring-primary-500/40",
          selected:
            "[&>button]:!bg-primary-600 [&>button]:!text-white [&>button]:hover:!bg-primary-600 [&>button]:ring-0",
          outside: "[&>button]:text-neutral-300 dark:[&>button]:text-neutral-600",
          disabled:
            "[&>button]:!text-neutral-300 dark:[&>button]:!text-neutral-700 [&>button]:line-through [&>button]:pointer-events-none",
          hidden: "invisible",
        }}
      />

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100 dark:border-white/5">
        <div className="flex gap-1">
          {showClear && (
            <button
              type="button"
              onClick={() => commit(undefined)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10"
            >
              Clear
            </button>
          )}
          {todayAllowed && (
            <button
              type="button"
              onClick={() => commit(new Date(today.getFullYear(), today.getMonth(), today.getDate()))}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-white/10"
            >
              Today
            </button>
          )}
        </div>
        {typed.trim() && formatTyped(selected) !== typed.trim() ? (
          <button
            type="button"
            onClick={applyTyped}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-700"
          >
            Set date
          </button>
        ) : (
          <button
            type="button"
            onClick={() => close()}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );

  const popover = (
    <AnimatePresence>
      {open && !isMobile && (
        <motion.div
          key="dp-popover"
          ref={panelRef}
          role="dialog"
          aria-label={label ? `Choose ${label}` : "Choose date"}
          initial={{ opacity: 0, y: pos.placement === "below" ? -4 : 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.placement === "below" ? -4 : 4, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          className="z-[10000] p-3 rounded-2xl bg-white dark:bg-[#151A23] border border-neutral-200 dark:border-white/10 shadow-2xl"
          {...portalGuards}
        >
          {panelBody}
        </motion.div>
      )}
      {open && isMobile && (
        <motion.div
          key="dp-sheet"
          className="fixed inset-0 z-[10000] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          {...portalGuards}
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={(e) => {
              e.stopPropagation();
              close(false);
            }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label ? `Choose ${label}` : "Choose date"}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full rounded-t-3xl bg-white dark:bg-[#151A23] border-t border-neutral-200 dark:border-white/10 shadow-2xl px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
          >
            <div className="flex justify-center pb-2">
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-white/20" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                {label || "Select date"}
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => close(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            {panelBody}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={`w-full relative ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={triggerId}
          className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300 ml-1"
        >
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`${className ?? DEFAULT_TRIGGER} flex items-center justify-between gap-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "!border-red-500" : ""
        }`}
      >
        <span className={`truncate ${selected ? "" : "text-neutral-400 dark:text-neutral-500"}`}>
          {selected ? displayFormat.format(selected) : placeholder}
        </span>
        <Calendar size={16} className="shrink-0 text-neutral-400" />
      </button>
      {/* Hidden mirror so native form validation still enforces `required`. */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        value={value || ""}
        required={required}
        onChange={() => {}}
        onInvalid={() => triggerRef.current?.focus()}
        className="absolute bottom-0 left-4 w-px h-px opacity-0 pointer-events-none"
      />
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400 ml-1">{error}</p>}
      {mounted && createPortal(popover, document.body)}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { IChartApi } from "lightweight-charts";

/**
 * Touch and mouse interaction for a lightweight-charts chart whose series share the same dates.
 *
 * Read one date
 *   touch: slide a finger across the chart (the page still scrolls vertically)
 *   mouse: hover (the chart's own crosshair)
 *
 * Compare two dates: the selection stays until it is cleared or a new one is started
 *   tap or click a date, then tap or click a second one (sliding or hovering in between previews it)
 *   mouse: press and drag
 *   touch: hold and drag, or place two fingers
 *
 * Indices refer to the chart's data points; `from` is the earlier one.
 */
export interface RangeSelection {
  from: number;
  to: number;
}

export interface RangeDot {
  y: number;
  color: string;
}

interface Marker {
  index: number;
  x: number;
  dots: RangeDot[];
}

export interface RangeSelectState {
  range: { from: Marker; to: Marker } | null;
  /** First date picked, waiting for the second. */
  pin: Marker | null;
  /** Date under a sliding finger. */
  scrub: Marker | null;
  paneHeight: number;
}

interface UseRangeSelectOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chartRef: React.RefObject<IChartApi | null>;
  /** Number of data points on the time axis. */
  count: number;
  /** Changes when the plotted values change on the same dates: the markers are re-placed. */
  dataKey?: unknown;
  /** Line positions at a data index, for the markers. */
  getDots?: (index: number) => RangeDot[];
  onChange?: (selection: RangeSelection | null) => void;
  onPin?: (index: number | null) => void;
  onScrub?: (index: number | null) => void;
}

const LONG_PRESS_MS = 350;
const TOUCH_SLOP_PX = 12;
const MOUSE_SLOP_PX = 4;
const EMPTY: RangeSelectState = { range: null, pin: null, scrub: null, paneHeight: 0 };

export function useRangeSelect({
  containerRef,
  chartRef,
  count,
  dataKey,
  getDots,
  onChange,
  onPin,
  onScrub,
}: UseRangeSelectOptions) {
  const [state, setState] = useState<RangeSelectState>(EMPTY);
  const clearRef = useRef<() => void>(() => {});
  const repositionRef = useRef<() => void>(() => {});

  // Latest props for the DOM listeners, which are attached once.
  const live = useRef({ count, getDots, onChange, onPin, onScrub });
  useEffect(() => {
    live.current = { count, getDots, onChange, onPin, onScrub };
  }, [count, getDots, onChange, onPin, onScrub]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Selection: `anchor` alone is a pinned first date; with `head` it is a range.
    let anchor: number | null = null;
    let head: number | null = null;
    let complete = false;
    let scrubIndex: number | null = null;

    let lastRangeKey = "";
    let lastPin: number | null = null;
    let lastScrub: number | null = null;

    const timeScale = () => chartRef.current?.timeScale() ?? null;

    const indexAt = (clientX: number): number | null => {
      const ts = timeScale();
      const n = live.current.count;
      if (!ts || n < 2) return null;
      const x = Math.max(0, Math.min(clientX - el.getBoundingClientRect().left, ts.width()));
      const logical = ts.coordinateToLogical(x);
      if (logical === null) return null;
      return Math.max(0, Math.min(Math.round(logical), n - 1));
    };

    const inPane = (clientX: number, clientY: number) => {
      const ts = timeScale();
      if (!ts) return false;
      const rect = el.getBoundingClientRect();
      return clientX - rect.left <= ts.width() && clientY - rect.top <= rect.height - ts.height();
    };

    const isZoomed = () => {
      const range = timeScale()?.getVisibleLogicalRange();
      return !!range && range.to - range.from < live.current.count - 1.5;
    };

    const marker = (index: number | null): Marker | null => {
      const ts = timeScale();
      if (!ts || index === null) return null;
      const x = ts.logicalToCoordinate(index as never);
      if (x === null) return null;
      return { index, x, dots: live.current.getDots?.(index) ?? [] };
    };

    /** Push the current selection to React state and to the callbacks that changed. */
    const publish = () => {
      const ts = timeScale();
      const hasRange = anchor !== null && head !== null && head !== anchor;
      const from = hasRange ? marker(Math.min(anchor!, head!)) : null;
      const to = hasRange ? marker(Math.max(anchor!, head!)) : null;
      const pinIndex = !hasRange ? anchor : null;

      setState({
        range: from && to ? { from, to } : null,
        pin: marker(pinIndex),
        scrub: hasRange ? null : marker(scrubIndex),
        paneHeight: ts ? el.getBoundingClientRect().height - ts.height() : 0,
      });

      const rangeKey = from && to ? `${from.index}:${to.index}` : "";
      if (rangeKey !== lastRangeKey) {
        lastRangeKey = rangeKey;
        live.current.onChange?.(from && to ? { from: from.index, to: to.index } : null);
      }
      if (pinIndex !== lastPin) {
        lastPin = pinIndex;
        live.current.onPin?.(pinIndex);
      }
      if (scrubIndex !== lastScrub) {
        lastScrub = scrubIndex;
        live.current.onScrub?.(scrubIndex);
      }
    };

    const clear = () => {
      anchor = null;
      head = null;
      complete = false;
      scrubIndex = null;
      publish();
    };
    clearRef.current = clear;

    /** A tap or click: first one pins a date, the second one closes the range. */
    const tap = (index: number | null) => {
      if (index === null) return;
      if (anchor === null || complete) {
        anchor = index;
        head = null;
        complete = false;
      } else if (index === anchor) {
        anchor = null; // same date again: nothing to compare
        head = null;
      } else {
        head = index;
        complete = true;
      }
      publish();
    };

    /** End of a drag: keep the range, or fall back to a pinned first date. */
    const settle = () => {
      if (anchor !== null && head !== null && head !== anchor) {
        complete = true;
      } else {
        head = null;
        complete = false;
      }
      publish();
    };

    const setTouchPan = (enabled: boolean) => {
      chartRef.current?.applyOptions({ handleScroll: { horzTouchDrag: enabled } });
    };

    // ── Mouse ──
    let lastTouchAt = 0;
    let mouseDownAt: { x: number; index: number } | null = null;
    let mouseDragging = false;
    const fromTouch = () => Date.now() - lastTouchAt < 800;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || fromTouch() || !inPane(e.clientX, e.clientY)) return;
      const index = indexAt(e.clientX);
      mouseDownAt = index === null ? null : { x: e.clientX, index };
      mouseDragging = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (fromTouch()) return;
      if (mouseDownAt) {
        if (!mouseDragging && Math.abs(e.clientX - mouseDownAt.x) > MOUSE_SLOP_PX) {
          mouseDragging = true;
          anchor = mouseDownAt.index;
          complete = false;
        }
        if (mouseDragging) {
          head = indexAt(e.clientX);
          publish();
        }
        return;
      }
      // First date pinned: hovering previews the range up to the pointer
      if (anchor !== null && !complete && e.target instanceof Node && el.contains(e.target)) {
        head = inPane(e.clientX, e.clientY) ? indexAt(e.clientX) : null;
        publish();
      }
    };
    const onMouseUp = () => {
      if (!mouseDownAt) return;
      const down = mouseDownAt;
      mouseDownAt = null;
      if (mouseDragging) {
        mouseDragging = false;
        settle();
      } else {
        head = null; // drop any hover preview: the click decides
        tap(down.index);
      }
    };
    const onMouseLeave = () => {
      if (!mouseDownAt && anchor !== null && !complete && head !== null) {
        head = null;
        publish();
      }
    };

    // ── Touch ──
    type TouchMode = "pending" | "scrub" | "select" | "two" | "page" | null;
    let mode: TouchMode = null;
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let touchStart = { x: 0, y: 0 };

    const clearPressTimer = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const twoFingers = (e: TouchEvent) => {
      anchor = indexAt(e.touches[0].clientX);
      head = indexAt(e.touches[1].clientX);
      complete = false;
      scrubIndex = null;
      publish();
    };

    const onTouchStart = (e: TouchEvent) => {
      lastTouchAt = Date.now();
      clearPressTimer();
      if (e.touches.length === 2) {
        if (!inPane(e.touches[0].clientX, e.touches[0].clientY)) return;
        mode = "two";
        setTouchPan(false);
        twoFingers(e);
        return;
      }
      const t = e.touches[0];
      if (e.touches.length !== 1 || !inPane(t.clientX, t.clientY)) {
        mode = null;
        return;
      }
      mode = "pending";
      touchStart = { x: t.clientX, y: t.clientY };
      // A zoomed chart pans under the finger; otherwise the finger reads dates.
      setTouchPan(isZoomed());
      pressTimer = setTimeout(() => {
        pressTimer = null;
        if (mode !== "pending") return;
        const index = indexAt(touchStart.x);
        if (index === null) return;
        mode = "select";
        setTouchPan(false);
        anchor = index;
        head = null;
        complete = false;
        try {
          navigator.vibrate?.(10);
        } catch {
          /* not allowed: no haptic */
        }
        publish();
      }, LONG_PRESS_MS);
    };

    const onTouchMove = (e: TouchEvent) => {
      lastTouchAt = Date.now();
      const t = e.touches[0];
      if (!t || mode === null || mode === "page") return;

      if (mode === "two") {
        if (e.touches.length < 2) return;
        if (e.cancelable) e.preventDefault();
        twoFingers(e);
        return;
      }
      if (mode === "pending") {
        const dx = Math.abs(t.clientX - touchStart.x);
        const dy = Math.abs(t.clientY - touchStart.y);
        if (dx < TOUCH_SLOP_PX && dy < TOUCH_SLOP_PX) return;
        clearPressTimer();
        // Sideways reads dates; up or down is the page scrolling; a zoomed chart pans instead.
        mode = dx > dy && !isZoomed() ? "scrub" : "page";
        if (mode === "page") return;
      }
      if (e.cancelable) e.preventDefault();
      const index = indexAt(t.clientX);
      if (mode === "select") {
        head = index;
      } else {
        scrubIndex = index;
        if (anchor !== null && !complete) head = index; // first date pinned: slide to the second
      }
      publish();
    };

    const onTouchEnd = (e: TouchEvent) => {
      lastTouchAt = Date.now();
      clearPressTimer();
      if (e.touches.length > 0 && mode !== "two") return;
      const ended = mode;
      mode = null;
      if (ended === "pending") {
        tap(indexAt(touchStart.x));
      } else if (ended === "select" || ended === "two") {
        settle();
      } else if (ended === "scrub") {
        scrubIndex = null;
        if (anchor !== null && !complete) settle();
        else publish();
      }
    };

    const onContextMenu = (e: Event) => {
      if (Date.now() - lastTouchAt < 1500) e.preventDefault(); // no long-press menu on touch
    };

    // Keep the markers on their dates when the chart is zoomed or resized
    const reposition = () => {
      if (anchor !== null || scrubIndex !== null) publish();
    };
    repositionRef.current = reposition;
    const subscribedTo = timeScale();
    subscribedTo?.subscribeVisibleLogicalRangeChange(reposition);
    subscribedTo?.subscribeSizeChange(reposition);

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("contextmenu", onContextMenu);

    return () => {
      clearPressTimer();
      clearRef.current = () => {};
      repositionRef.current = () => {};
      try {
        subscribedTo?.unsubscribeVisibleLogicalRangeChange(reposition);
        subscribedTo?.unsubscribeSizeChange(reposition);
      } catch {
        /* chart already removed */
      }
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("contextmenu", onContextMenu);
    };
  }, [containerRef, chartRef]);

  // New data (another range or benchmark): the old dates no longer apply
  useEffect(() => {
    clearRef.current();
  }, [count]);

  // Same dates, new values (Return ↔ Value, a line hidden): move the markers once the chart has
  // laid out its new scale.
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => repositionRef.current());
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [dataKey]);

  const clear = useCallback(() => clearRef.current(), []);
  return { state, clear };
}

function MarkerLine({ marker, color, dashed }: { marker: Marker; color: string; dashed?: boolean }) {
  return (
    <>
      <div
        className="absolute top-0 h-full"
        style={{ left: marker.x, borderLeft: `1px ${dashed ? "dashed" : "solid"} ${color}` }}
      />
      {marker.dots.map((dot, i) => (
        <span
          key={i}
          className="absolute w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#151922]"
          style={{ left: marker.x - 5, top: dot.y - 5, backgroundColor: dot.color }}
        />
      ))}
    </>
  );
}

/** Band, date lines and markers. Render inside the chart's `relative` container. */
export function RangeSelectOverlay({
  state,
  positive,
  isDark = false,
}: {
  state: RangeSelectState;
  /** Green band for a gain between the two dates, red for a loss. */
  positive: boolean;
  isDark?: boolean;
}) {
  const { range, pin, scrub, paneHeight } = state;
  if (!range && !pin && !scrub) return null;
  const tone = positive ? "16, 185, 129" : "244, 63, 94";
  const neutral = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)";
  return (
    <div
      className="absolute left-0 top-0 z-10 pointer-events-none overflow-hidden"
      style={{ height: paneHeight, width: "100%" }}
    >
      {range && (
        <>
          <div
            className="absolute top-0 h-full"
            style={{
              left: range.from.x,
              width: Math.max(range.to.x - range.from.x, 1),
              background: `linear-gradient(to bottom, rgba(${tone}, 0.22), rgba(${tone}, 0.05))`,
            }}
          />
          <MarkerLine marker={range.from} color={`rgba(${tone}, 0.9)`} />
          <MarkerLine marker={range.to} color={`rgba(${tone}, 0.9)`} />
        </>
      )}
      {pin && <MarkerLine marker={pin} color={neutral} />}
      {scrub && scrub.index !== pin?.index && <MarkerLine marker={scrub} color={neutral} dashed />}
    </div>
  );
}

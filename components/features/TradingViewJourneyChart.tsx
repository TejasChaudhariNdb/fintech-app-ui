"use client";

import React, { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
} from "lightweight-charts";
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import {
  RangeDot,
  RangeSelectOverlay,
  useRangeSelect,
} from "@/components/features/chartRangeSelect";

export interface TradingViewJourneyPoint {
  date: string;
  value: number;
  invested: number;
}

export interface TradingViewJourneyChartHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface TradingViewJourneyChartProps {
  data: TradingViewJourneyPoint[];
  primaryColor?: string;
  investedColor?: string;
  primaryTitle?: string;
  investedTitle?: string;
  height?: number;
  isDark?: boolean;
  onHoverPoint?: (point: TradingViewJourneyPoint | null) => void;
  showControls?: boolean;
}

interface JourneyRow {
  time: string;
  value: number;
  invested: number;
}

const rupees = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString("en-IN")}`;
const signedRupees = (v: number) => `${v >= 0 ? "+" : "−"}${rupees(v)}`;
const signedPct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`;
const gainTone = (v: number) =>
  v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const TradingViewJourneyChart = forwardRef<
  TradingViewJourneyChartHandle,
  TradingViewJourneyChartProps
>(function TradingViewJourneyChart(
  {
    data,
    primaryColor = "#10b981",
    investedColor = "#6366f1",
    primaryTitle = "Current Value",
    investedTitle = "Invested Capital",
    height = 320,
    isDark = true,
    onHoverPoint,
    showControls = true,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const valueSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const investedSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [canReset, setCanReset] = useState(false);
  const [rows, setRows] = useState<JourneyRow[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [picked, setPicked] = useState<{ from: number; to: number } | null>(null);
  const [pinIndex, setPinIndex] = useState<number | null>(null);
  const scrubbingRef = useRef(false);

  const live = useRef({ rows, onHoverPoint, primaryColor, investedColor });
  useEffect(() => {
    live.current = { rows, onHoverPoint, primaryColor, investedColor };
  }, [rows, onHoverPoint, primaryColor, investedColor]);

  // Expose zoom/reset actions to parent components
  useImperativeHandle(ref, () => ({
    zoomIn: () => handleZoomIn(),
    zoomOut: () => handleZoomOut(),
    resetView: () => handleResetZoom(),
  }));

  const handleZoomIn = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const span = range.to - range.from;
      const delta = span * 0.2;
      if (span > 5) {
        timeScale.setVisibleLogicalRange({
          from: range.from + delta,
          to: range.to - delta,
        });
        setCanReset(true);
      }
    }
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const span = range.to - range.from;
      const delta = span * 0.25;
      timeScale.setVisibleLogicalRange({
        from: range.from - delta,
        to: range.to + delta,
      });
      setCanReset(true);
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setCanReset(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const gridColor = isDark
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.06)";
    const textColor = isDark ? "#888888" : "#666666";
    const borderColor = isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: textColor,
        fontSize: 11,
        attributionLogo: false, // Disables TV watermark logo
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? "#1E222D" : "#F0F3FA",
        },
        horzLine: {
          color: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? "#1E222D" : "#F0F3FA",
        },
      },
      rightPriceScale: {
        borderColor: borderColor,
        autoScale: true,
        scaleMargins: {
          top: 0.12,
          bottom: 0.08,
        },
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      localization: {
        priceFormatter: (val: number) => {
          if (Math.abs(val) >= 10000000) {
            return `₹${(val / 10000000).toFixed(2)}Cr`;
          }
          if (Math.abs(val) >= 100000) {
            return `₹${(val / 100000).toFixed(2)}L`;
          }
          if (Math.abs(val) >= 1000) {
            return `₹${(val / 1000).toFixed(1)}K`;
          }
          return `₹${Math.round(val).toLocaleString("en-IN")}`;
        },
      },
      // Dragging compares two dates (see chartRangeSelect), so it does not pan with the mouse.
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: false,
        horzTouchDrag: false, // switched on by chartRangeSelect while the chart is zoomed in
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: true,
        pinch: false, // two fingers compare two dates; zoom with the buttons
      },
    });

    // No on-chart titles or last-value tags: the legend above the chart names the lines.
    // 1. Current / Portfolio Value: a plain line, no fill
    const valueSeries = chart.addSeries(LineSeries, {
      color: live.current.primaryColor,
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`,
      },
      lastValueVisible: false,
      priceLineVisible: false,
      // BUG-045: smaller hover dot so it does not cover the line
      crosshairMarkerRadius: 3,
      crosshairMarkerBorderWidth: 1,
    });

    // 2. Invested Amount Line Series
    const investedSeries = chart.addSeries(LineSeries, {
      color: live.current.investedColor,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceFormat: {
        type: "custom",
        formatter: (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`,
      },
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerRadius: 3,
      crosshairMarkerBorderWidth: 1,
    });

    chartRef.current = chart;
    valueSeriesRef.current = valueSeries;
    investedSeriesRef.current = investedSeries;

    let rAFId: number | null = null;
    let lastIndex: number | null = null;

    // Crosshair → index of the hovered date. The readout is drawn above the chart, not over it.
    chart.subscribeCrosshairMove((param) => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {
        rAFId = null;
        const data = live.current.rows;
        const inside =
          param.point !== undefined &&
          param.logical !== undefined &&
          param.point.x >= 0 &&
          param.point.y >= 0 &&
          param.point.y <= height;
        const index =
          inside && data.length > 0
            ? Math.max(0, Math.min(Math.round(param.logical as number), data.length - 1))
            : null;
        if (scrubbingRef.current) return; // a sliding finger is reporting the date
        if (index === lastIndex) return;
        lastIndex = index;
        setHoverIndex(index);
        const row = index !== null ? data[index] : null;
        live.current.onHoverPoint?.(
          row ? { date: row.time, value: row.value, invested: row.invested } : null
        );
      });
    });

    // Range change listener to toggle reset button visibility
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      const n = live.current.rows.length;
      setCanReset(range !== null && n > 1 && range.to - range.from < n - 1.5);
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length || !chartRef.current) return;
      const { width } = entries[0].contentRect;
      chartRef.current.applyOptions({ width });
    });
    resizeObserver.observe(container);

    return () => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      valueSeriesRef.current = null;
      investedSeriesRef.current = null;
    };
    // Theme, colours and data are applied by the effects below without rebuilding the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // Dynamically update theme styling without destroying chart or losing data
  useEffect(() => {
    if (!chartRef.current) return;
    const gridColor = isDark
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.06)";
    const textColor = isDark ? "#888888" : "#666666";
    const borderColor = isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";

    chartRef.current.applyOptions({
      layout: {
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
      timeScale: {
        borderColor: borderColor,
      },
      crosshair: {
        vertLine: {
          color: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)",
          labelBackgroundColor: isDark ? "#1E222D" : "#F0F3FA",
        },
        horzLine: {
          color: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)",
          labelBackgroundColor: isDark ? "#1E222D" : "#F0F3FA",
        },
      },
    });
  }, [isDark]);

  // Update series colors if primaryColor or investedColor changes
  useEffect(() => {
    valueSeriesRef.current?.applyOptions({ color: primaryColor });
    investedSeriesRef.current?.applyOptions({ color: investedColor });
  }, [primaryColor, investedColor, height]);

  // Update data when props change
  useEffect(() => {
    if (!valueSeriesRef.current || !investedSeriesRef.current || !chartRef.current)
      return;

    if (!data || data.length === 0) {
      valueSeriesRef.current.setData([]);
      investedSeriesRef.current.setData([]);
      setRows([]);
      return;
    }

    // Dedupe by YYYY-MM-DD date and sort ascending
    const map = new Map<string, { value: number; invested: number }>();
    for (const pt of data) {
      if (!pt.date) continue;
      const timeStr = pt.date.includes("T") ? pt.date.split("T")[0] : pt.date;
      map.set(timeStr, {
        value: Number(pt.value) || 0,
        invested: Number(pt.invested) || 0,
      });
    }

    const sortedTimes = Array.from(map.keys()).sort();
    const cleanValues = sortedTimes.map((t) => ({
      time: t,
      value: map.get(t)!.value,
    }));
    const cleanInvested = sortedTimes.map((t) => ({
      time: t,
      value: map.get(t)!.invested,
    }));

    // Guard against erroneous zero-drop anomaly at the trailing edge
    while (
      cleanValues.length > 1 &&
      cleanValues[cleanValues.length - 1].value <= 0 &&
      cleanValues[cleanValues.length - 2].value > 0
    ) {
      cleanValues.pop();
      cleanInvested.pop();
    }

    valueSeriesRef.current.setData(cleanValues);
    investedSeriesRef.current.setData(cleanInvested);
    setRows(
      cleanValues.map((v, i) => ({ time: v.time, value: v.value, invested: cleanInvested[i].value }))
    );
    setHoverIndex(null);

    chartRef.current.timeScale().fitContent();
  }, [data, height]);

  const getDots = useCallback((index: number): RangeDot[] => {
    const row = live.current.rows[index];
    if (!row) return [];
    const dots: RangeDot[] = [];
    const iy = investedSeriesRef.current?.priceToCoordinate(row.invested);
    if (iy !== null && iy !== undefined) dots.push({ y: iy, color: live.current.investedColor });
    const vy = valueSeriesRef.current?.priceToCoordinate(row.value);
    if (vy !== null && vy !== undefined) dots.push({ y: vy, color: live.current.primaryColor });
    return dots;
  }, []);

  const handleScrub = useCallback((index: number | null) => {
    scrubbingRef.current = index !== null;
    chartRef.current?.clearCrosshairPosition();
    setHoverIndex(index);
    const row = index !== null ? live.current.rows[index] : null;
    live.current.onHoverPoint?.(
      row ? { date: row.time, value: row.value, invested: row.invested } : null
    );
  }, []);

  const { state: selection, clear: clearSelection } = useRangeSelect({
    containerRef,
    chartRef,
    count: rows.length,
    getDots,
    onChange: setPicked,
    onPin: setPinIndex,
    onScrub: handleScrub,
  });

  // A pinned first date reads like a hovered one, plus the prompt for the second date.
  const shownIndex = pinIndex ?? hoverIndex;
  const hovered = shownIndex !== null ? rows[shownIndex] ?? null : null;
  const clearButton = (
    <button
      type="button"
      onClick={clearSelection}
      aria-label="Clear selected dates"
      className="shrink-0 ml-auto w-7 h-7 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/20 text-neutral-600 dark:text-neutral-300 transition-colors"
    >
      <X size={14} />
    </button>
  );
  const range =
    picked && rows[picked.from] && rows[picked.to]
      ? { a: rows[picked.from], b: rows[picked.to] }
      : null;
  // Between two dates: how the value moved, how much of that was new money, and the rest (market).
  const valueChange = range ? range.b.value - range.a.value : 0;
  const investedChange = range ? range.b.invested - range.a.invested : 0;
  const marketChange = valueChange - investedChange;
  const marketBase = range ? range.a.value + Math.max(investedChange, 0) : 0;
  const hoveredGain = hovered ? hovered.value - hovered.invested : 0;

  return (
    <div className="relative w-full" style={{ touchAction: "pan-y" }}>
      {/* Zoom / Pan Bar */}
      {showControls && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleZoomOut}
              type="button"
              title="Zoom Out"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-all shadow-2xs"
            >
              <ZoomOut size={13} />
              <span>Zoom Out</span>
            </button>
            <button
              onClick={handleZoomIn}
              type="button"
              title="Zoom In"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-all shadow-2xs"
            >
              <ZoomIn size={13} />
              <span>Zoom In</span>
            </button>
            {canReset && (
              <button
                onClick={handleResetZoom}
                type="button"
                title="Reset View"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 transition-all shadow-2xs"
              >
                <RotateCcw size={13} />
                <span>Reset View</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-neutral-400 hidden sm:inline">
            Scroll to zoom
          </div>
        </div>
      )}

      {/* Fixed readout above the chart, left aligned: legend → hovered date → compared dates.
          It never floats over the lines. */}
      <div className="min-h-[60px] sm:min-h-[40px] flex items-center gap-2 px-1 text-xs tabular-nums">
        {range ? (
          <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
            <span className="font-bold text-neutral-900 dark:text-white whitespace-nowrap">
              {shortDate(range.a.time)} – {shortDate(range.b.time)}
            </span>
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
              <span className="whitespace-nowrap">
                <span className="text-neutral-500 dark:text-neutral-400">Value </span>
                <span className="font-bold text-neutral-900 dark:text-white">{signedRupees(valueChange)}</span>
              </span>
              <span className="whitespace-nowrap">
                <span className="text-neutral-500 dark:text-neutral-400">Invested </span>
                <span className="font-bold text-neutral-900 dark:text-white">{signedRupees(investedChange)}</span>
              </span>
              <span className="whitespace-nowrap">
                <span className="text-neutral-500 dark:text-neutral-400">Gain </span>
                <span className={`font-bold ${gainTone(marketChange)}`}>
                  {signedRupees(marketChange)}
                  {marketBase > 0 && ` (${signedPct((marketChange / marketBase) * 100)})`}
                </span>
              </span>
            </div>
          </div>
          {clearButton}
          </>
        ) : hovered ? (
          <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
            <span className="font-bold text-neutral-900 dark:text-white whitespace-nowrap">
              {shortDate(hovered.time)}
              {pinIndex !== null && (
                <span className="ml-2 font-medium text-primary-600 dark:text-primary-400">
                  Now pick a second date
                </span>
              )}
            </span>
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                <span className="text-neutral-500 dark:text-neutral-400">{primaryTitle}</span>
                <span className="font-bold text-neutral-900 dark:text-white">{rupees(hovered.value)}</span>
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: investedColor }} />
                <span className="text-neutral-500 dark:text-neutral-400">{investedTitle}</span>
                <span className="font-bold text-neutral-900 dark:text-white">{rupees(hovered.invested)}</span>
              </span>
              {hovered.invested > 0 && (
                <span className={`font-bold whitespace-nowrap ${gainTone(hoveredGain)}`}>
                  {signedRupees(hoveredGain)} ({signedPct((hoveredGain / hovered.invested) * 100)})
                </span>
              )}
            </div>
          </div>
          {pinIndex !== null && clearButton}
          </>
        ) : (
          <div className="flex items-center gap-4 font-semibold text-neutral-700 dark:text-neutral-200">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-[3px] rounded-full" style={{ backgroundColor: primaryColor }} />
              {primaryTitle}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-b-2 border-dashed" style={{ borderColor: investedColor }} />
              {investedTitle}
            </span>
          </div>
        )}
      </div>

      {/* Canvas container, with the two-date comparison band on top */}
      <div className="relative w-full" style={{ touchAction: "pan-y" }}>
        <RangeSelectOverlay state={selection} positive={marketChange >= 0} isDark={isDark} />
        <div
          ref={containerRef}
          className="w-full relative select-none cursor-crosshair"
          style={{ touchAction: "pan-y", WebkitTouchCallout: "none" }}
        />
      </div>

      <div className="text-[11px] text-neutral-400 mt-2 px-1">
        <span className="[@media(hover:hover)]:hidden">Slide to read a date • Tap two dates to compare</span>
        <span className="hidden [@media(hover:hover)]:inline">Hover to read a date • Click two dates or drag to compare</span>
      </div>
    </div>
  );
});

export default TradingViewJourneyChart;

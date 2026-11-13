"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  IPriceLine,
  ISeriesApi,
} from "lightweight-charts";
import { RotateCcw } from "lucide-react";
import {
  RangeDot,
  RangeSelectOverlay,
  RangeSelection,
  useRangeSelect,
} from "@/components/features/chartRangeSelect";

export interface BenchmarkChartPoint {
  time: string; // "YYYY-MM-DD"
  portfolio: number; // return % (e.g. 7.88) or value in rupees, as `unit` says
  benchmark: number | null; // null when the index has no history for the window
}

export interface BenchmarkChartActions {
  clearSelection: () => void;
}

export const PORTFOLIO_COLOR = "#10b981";

interface TradingViewBenchmarkChartProps {
  /** Sorted by time, one point per date. Hover and selection indices refer to this array. */
  points: BenchmarkChartPoint[];
  /** What the points hold: cumulative return % or rupee value. */
  unit?: "percent" | "rupees";
  benchmarkColor: string;
  showPortfolio?: boolean;
  showBenchmark?: boolean;
  isDark?: boolean;
  height?: number;
  onHoverIndex?: (index: number | null) => void;
  onSelectRange?: (selection: RangeSelection | null) => void;
  /** First of two dates picked, waiting for the second. */
  onPinIndex?: (index: number | null) => void;
  /** Filled with the chart's actions (clear the selection). */
  actionsRef?: React.RefObject<BenchmarkChartActions | null>;
  /** Colour of the selected band: green for a gain between the two dates, red for a loss. */
  selectionPositive?: boolean;
}

const pctFormat = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
const rupeeFormat = (val: number) => {
  const abs = Math.abs(val);
  if (abs >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${Math.round(val)}`;
};

function themeColors(isDark: boolean) {
  return {
    grid: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    text: isDark ? "#888888" : "#666666",
    border: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    crosshair: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
    label: isDark ? "#1E222D" : "#F0F3FA",
    zero: isDark ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.28)",
  };
}

export default function TradingViewBenchmarkChart({
  points,
  unit = "percent",
  benchmarkColor,
  showPortfolio = true,
  showBenchmark = true,
  isDark = true,
  height = 320,
  onHoverIndex,
  onSelectRange,
  onPinIndex,
  actionsRef,
  selectionPositive = true,
}: TradingViewBenchmarkChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const portfolioSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const benchmarkSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const zeroLineRef = useRef<IPriceLine | null>(null);
  const scrubbingRef = useRef(false);
  const [canReset, setCanReset] = useState(false);

  const live = useRef({ points, unit, onHoverIndex, showPortfolio, showBenchmark, benchmarkColor });
  useEffect(() => {
    live.current = { points, unit, onHoverIndex, showPortfolio, showBenchmark, benchmarkColor };
  }, [points, unit, onHoverIndex, showPortfolio, showBenchmark, benchmarkColor]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const c = themeColors(isDark);

    const valueFormat = (val: number) =>
      live.current.unit === "rupees" ? rupeeFormat(val) : pctFormat(val);

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: c.text,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: c.grid },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: c.crosshair, width: 1, style: LineStyle.Solid, labelBackgroundColor: c.label },
        horzLine: { visible: false, labelVisible: false },
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: c.border,
        timeVisible: false,
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      localization: { priceFormatter: valueFormat },
      // Dragging, sliding a finger and two fingers read and compare dates (see chartRangeSelect),
      // so they do not pan or pinch-zoom the chart.
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: true,
        pinch: false,
      },
    });

    // No on-chart titles, last-value tags or price lines: the legend above the chart names the
    // lines, and the tags used to sit on top of the latest part of the chart.
    const seriesOptions = {
      lineWidth: 2 as const,
      priceFormat: { type: "custom" as const, formatter: valueFormat, minMove: 0.01 },
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderWidth: 2,
    };
    const benchmarkSeries = chart.addSeries(LineSeries, {
      ...seriesOptions,
      color: live.current.benchmarkColor,
    });
    const portfolioSeries = chart.addSeries(LineSeries, {
      ...seriesOptions,
      color: PORTFOLIO_COLOR,
    });
    chartRef.current = chart;
    portfolioSeriesRef.current = portfolioSeries;
    benchmarkSeriesRef.current = benchmarkSeries;

    let rAFId: number | null = null;
    let lastIndex: number | null = null;
    chart.subscribeCrosshairMove((param) => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {
        rAFId = null;
        const n = live.current.points.length;
        const inside =
          param.point !== undefined &&
          param.logical !== undefined &&
          param.point.x >= 0 &&
          param.point.y >= 0 &&
          param.point.y <= height;
        const index = inside
          ? Math.max(0, Math.min(Math.round(param.logical as number), n - 1))
          : null;
        if (scrubbingRef.current) return; // a sliding finger is reporting the date
        if (index === lastIndex) return;
        lastIndex = index;
        live.current.onHoverIndex?.(n > 0 ? index : null);
      });
    });

    // "Reset zoom" only when the visible range is narrower than the data
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      const n = live.current.points.length;
      setCanReset(range !== null && n > 1 && range.to - range.from < n - 1.5);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length || !chartRef.current) return;
      chartRef.current.applyOptions({ width: entries[0].contentRect.width });
    });
    resizeObserver.observe(container);

    return () => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      portfolioSeriesRef.current = null;
      benchmarkSeriesRef.current = null;
      zeroLineRef.current = null;
    };
    // Theme, colours and data are applied by the effects below without rebuilding the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // Theme
  useEffect(() => {
    if (!chartRef.current) return;
    const c = themeColors(isDark);
    chartRef.current.applyOptions({
      layout: { textColor: c.text },
      grid: { horzLines: { color: c.grid } },
      timeScale: { borderColor: c.border },
      crosshair: { vertLine: { color: c.crosshair, labelBackgroundColor: c.label } },
    });
  }, [isDark, height]);

  // Line colour and visibility (legend toggles)
  useEffect(() => {
    benchmarkSeriesRef.current?.applyOptions({ color: benchmarkColor, visible: showBenchmark });
    portfolioSeriesRef.current?.applyOptions({ visible: showPortfolio });
  }, [benchmarkColor, showBenchmark, showPortfolio, height]);

  // Data
  useEffect(() => {
    if (!portfolioSeriesRef.current || !benchmarkSeriesRef.current || !chartRef.current) return;
    portfolioSeriesRef.current.setData(points.map((p) => ({ time: p.time, value: p.portfolio })));
    // A date without an index value becomes a gap, which keeps both lines on the same dates.
    benchmarkSeriesRef.current.setData(
      points.map((p) => (p.benchmark === null ? { time: p.time } : { time: p.time, value: p.benchmark }))
    );
    chartRef.current.timeScale().fitContent();
  }, [points, height]);

  // A dashed 0% line in return view; rupee values have no such baseline
  useEffect(() => {
    const series = portfolioSeriesRef.current;
    if (!series) return;
    if (unit === "percent" && !zeroLineRef.current) {
      zeroLineRef.current = series.createPriceLine({
        price: 0,
        color: themeColors(isDark).zero,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
      });
    } else if (unit === "percent") {
      zeroLineRef.current?.applyOptions({ color: themeColors(isDark).zero });
    } else if (zeroLineRef.current) {
      series.removePriceLine(zeroLineRef.current);
      zeroLineRef.current = null;
    }
  }, [unit, isDark, height]);

  const getDots = useCallback((index: number): RangeDot[] => {
    const { points: pts, showPortfolio: sp, showBenchmark: sb, benchmarkColor: bc } = live.current;
    const pt = pts[index];
    const dots: RangeDot[] = [];
    if (!pt) return dots;
    const by = pt.benchmark === null ? null : benchmarkSeriesRef.current?.priceToCoordinate(pt.benchmark);
    if (sb && by !== null && by !== undefined) dots.push({ y: by, color: bc });
    const py = portfolioSeriesRef.current?.priceToCoordinate(pt.portfolio);
    if (sp && py !== null && py !== undefined) dots.push({ y: py, color: PORTFOLIO_COLOR });
    return dots;
  }, []);

  // A new object whenever the lines move on the same dates, so the markers follow them
  const markerKey = useMemo(() => ({}), [points, unit, showPortfolio, showBenchmark]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrub = useCallback((index: number | null) => {
    scrubbingRef.current = index !== null;
    chartRef.current?.clearCrosshairPosition();
    live.current.onHoverIndex?.(index);
  }, []);

  const { state: selection, clear: clearSelection } = useRangeSelect({
    containerRef,
    chartRef,
    count: points.length,
    dataKey: markerKey,
    getDots,
    onChange: onSelectRange,
    onPin: onPinIndex,
    onScrub: handleScrub,
  });

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = { clearSelection };
    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef, clearSelection]);

  const handleResetZoom = () => {
    chartRef.current?.timeScale().fitContent();
    setCanReset(false);
  };

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ touchAction: "pan-y" }}>
        <RangeSelectOverlay state={selection} positive={selectionPositive} isDark={isDark} />
        <div
          ref={containerRef}
          className="w-full relative select-none cursor-crosshair"
          style={{ touchAction: "pan-y", WebkitTouchCallout: "none" }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400 mt-2 px-1 min-h-[24px]">
        <span>
          <span className="[@media(hover:hover)]:hidden">Slide to read a date • Tap two dates to compare</span>
          <span className="hidden [@media(hover:hover)]:inline">Hover to read a date • Click two dates or drag to compare • Scroll to zoom</span>
        </span>
        {canReset && (
          <button
            onClick={handleResetZoom}
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 font-semibold rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors shrink-0"
          >
            <RotateCcw size={11} />
            Reset zoom
          </button>
        )}
      </div>
    </div>
  );
}

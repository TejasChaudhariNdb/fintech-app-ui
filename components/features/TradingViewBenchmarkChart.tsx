"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";
import { RotateCcw } from "lucide-react";

export interface ChartDataPoint {
  time: string; // "YYYY-MM-DD"
  value: number; // percentage return, e.g. 15.2
}

interface TradingViewBenchmarkChartProps {
  portfolioData: ChartDataPoint[];
  benchmarkData: ChartDataPoint[];
  benchmarkName: string;
  benchmarkColor: string;
  isDark?: boolean;
  height?: number;
  onHoverPoint?: (
    point: {
      date: string;
      portfolioPct: number;
      benchmarkPct: number;
      alpha: number;
    } | null
  ) => void;
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  portfolioPct: number;
  benchmarkPct: number;
  alpha: number;
}

export default function TradingViewBenchmarkChart({
  portfolioData,
  benchmarkData,
  benchmarkName,
  benchmarkColor,
  isDark = true,
  height = 320,
  onHoverPoint,
}: TradingViewBenchmarkChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const portfolioSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const benchmarkSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [canReset, setCanReset] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

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
        attributionLogo: false,
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
          style: 3, // dashed
          labelBackgroundColor: isDark ? "#1E222D" : "#F0F3FA",
        },
        horzLine: {
          color: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)",
          width: 1,
          style: 3,
          labelBackgroundColor: isDark ? "#1E222D" : "#F0F3FA",
        },
      },
      rightPriceScale: {
        borderColor: borderColor,
        autoScale: true,
        scaleMargins: {
          top: 0.12,
          bottom: 0.1,
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
        priceFormatter: (val: number) =>
          `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // 1. Portfolio Area Series (Emerald Green)
    const portfolioSeries = chart.addSeries(AreaSeries, {
      lineColor: "#10b981",
      topColor: "rgba(16, 185, 129, 0.25)",
      bottomColor: "rgba(16, 185, 129, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`,
      },
      title: "Portfolio",
    });

    // 2. Selected Benchmark Line Series
    const benchmarkSeries = chart.addSeries(LineSeries, {
      color: benchmarkColor,
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`,
      },
      title: benchmarkName,
    });

    chartRef.current = chart;
    portfolioSeriesRef.current = portfolioSeries;
    benchmarkSeriesRef.current = benchmarkSeries;

    let rAFId: number | null = null;

    // Crosshair movement listener throttled to animation frames for 60/120 FPS fluid mobile scrubbing
    chart.subscribeCrosshairMove((param) => {
      if (rAFId !== null) return;
      rAFId = requestAnimationFrame(() => {
        rAFId = null;
        if (
          !param.time ||
          !param.point ||
          param.point.x < 0 ||
          param.point.x > container.clientWidth ||
          param.point.y < 0 ||
          param.point.y > height
        ) {
          onHoverPoint?.(null);
          setTooltip(null);
          return;
        }

        const pData = param.seriesData.get(portfolioSeries) as
          | { value: number; time: string }
          | undefined;
        const bData = param.seriesData.get(benchmarkSeries) as
          | { value: number; time: string }
          | undefined;

        const pVal = pData?.value ?? 0;
        const bVal = bData?.value ?? 0;

        const timeStr = typeof param.time === "string" ? param.time : "";
        const formattedDate = timeStr
          ? new Date(timeStr).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })
          : "";

        const pointInfo = {
          date: formattedDate,
          portfolioPct: pVal,
          benchmarkPct: bVal,
          alpha: Number((pVal - bVal).toFixed(2)),
        };

        onHoverPoint?.(pointInfo);
        setTooltip({
          x: param.point.x,
          y: param.point.y,
          ...pointInfo,
        });
      });
    });

    // Visible logical range change listener to show/hide Reset button
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      setCanReset((prev) => (prev ? prev : true));
    });

    // Handle responsive container resize
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
      portfolioSeriesRef.current = null;
      benchmarkSeriesRef.current = null;
    };
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

  // Update benchmark series styling when benchmark changes
  useEffect(() => {
    if (benchmarkSeriesRef.current) {
      benchmarkSeriesRef.current.applyOptions({
        color: benchmarkColor,
        title: benchmarkName,
      });
    }
  }, [benchmarkColor, benchmarkName]);

  // Update data when props change
  useEffect(() => {
    if (!portfolioSeriesRef.current || !benchmarkSeriesRef.current || !chartRef.current)
      return;

    // Filter duplicates and ensure strictly sorted by time
    const dedupeAndSort = (items: ChartDataPoint[]) => {
      const map = new Map<string, number>();
      items.forEach((item) => {
        if (item.time) map.set(item.time, item.value);
      });
      const sortedKeys = Array.from(map.keys()).sort();
      return sortedKeys.map((time) => ({
        time,
        value: map.get(time)!,
      }));
    };

    const cleanPortfolio = dedupeAndSort(portfolioData);
    const cleanBenchmark = dedupeAndSort(benchmarkData);

    portfolioSeriesRef.current.setData(cleanPortfolio);
    benchmarkSeriesRef.current.setData(cleanBenchmark);

    // Auto-fit content to the available width
    chartRef.current.timeScale().fitContent();
    setCanReset(false);
  }, [portfolioData, benchmarkData]);

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setCanReset(false);
    }
  };

  // Responsive floating tooltip positioning
  const getTooltipStyle = (x: number, y: number): React.CSSProperties => {
    const containerWidth = containerRef.current?.clientWidth || 360;
    const isMobile = containerWidth < 520;

    if (isMobile) {
      // On mobile screens, flip between left and right corners based on touch coordinate
      // This ensures the user's thumb NEVER covers the tooltip!
      const isRightSide = x > containerWidth / 2;
      return {
        top: 8,
        ...(isRightSide ? { left: 8 } : { right: 8 }),
      };
    }

    // On tablet / desktop: float smoothly next to the crosshair
    const tooltipWidth = 210;
    const isTooFarRight = x + tooltipWidth + 24 > containerWidth;
    const left = isTooFarRight ? Math.max(8, x - tooltipWidth - 12) : x + 16;
    const top = Math.max(8, Math.min(y - 35, height - 120));

    return { left, top };
  };

  return (
    <div className="relative w-full" style={{ touchAction: "pan-y" }}>
      {/* Floating reset button when user has zoomed or panned */}
      {canReset && (
        <button
          onClick={handleResetZoom}
          type="button"
          className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900/80 text-white dark:bg-white/10 hover:bg-neutral-900 dark:hover:bg-white/20 backdrop-blur-md shadow-md transition-all animate-fade-in"
        >
          <RotateCcw size={12} />
          Reset View
        </button>
      )}

      {/* Floating Interactive Tooltip Card matching user's exact design */}
      {tooltip && (
        <div
          style={getTooltipStyle(tooltip.x, tooltip.y)}
          className="absolute z-20 pointer-events-none transition-all duration-75 ease-out select-none"
        >
          <div className="bg-white/95 dark:bg-[#151922]/95 backdrop-blur-md border border-neutral-200/90 dark:border-white/10 rounded-2xl p-3 shadow-xl text-xs space-y-2 min-w-[195px] max-w-[240px]">
            <div className="font-bold text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-white/10 pb-1.5 flex justify-between items-center gap-2">
              <span className="font-bold text-neutral-900 dark:text-white text-xs">
                {tooltip.date}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  tooltip.alpha >= 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {tooltip.alpha >= 0 ? "+" : ""}
                {tooltip.alpha.toFixed(2)}% Alpha
              </span>
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  My Portfolio:
                </span>
                <span
                  className={`font-mono font-bold ${
                    tooltip.portfolioPct >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {tooltip.portfolioPct >= 0 ? "+" : ""}
                  {tooltip.portfolioPct.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-300">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: benchmarkColor }}
                  />
                  {benchmarkName}:
                </span>
                <span
                  className={`font-mono font-medium ${
                    tooltip.benchmarkPct >= 0
                      ? "text-neutral-900 dark:text-white"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {tooltip.benchmarkPct >= 0 ? "+" : ""}
                  {tooltip.benchmarkPct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Canvas Mount Point */}
      <div
        ref={containerRef}
        className="w-full relative select-none"
        style={{ touchAction: "pan-y" }}
      />

      {/* Touch & mouse hints */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 px-1">
        <span>Scroll / Pinch to zoom • Drag to pan</span>
      </div>
    </div>
  );
}

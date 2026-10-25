"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import {
  createChart,
  AreaSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
} from "lightweight-charts";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

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

interface JourneyTooltipData {
  x: number;
  y: number;
  date: string;
  value: number;
  invested: number;
}

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
  const valueSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const investedSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [canReset, setCanReset] = useState(false);
  const [tooltip, setTooltip] = useState<JourneyTooltipData | null>(null);

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
    const top = Math.max(8, Math.min(y - 35, height - 110));

    return { left, top };
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

    // 1. Current / Portfolio Value Area Series
    const valueSeries = chart.addSeries(AreaSeries, {
      lineColor: primaryColor,
      topColor: primaryColor.startsWith("#10b981")
        ? "rgba(16, 185, 129, 0.28)"
        : primaryColor.startsWith("#3b82f6")
        ? "rgba(59, 130, 246, 0.28)"
        : "rgba(16, 185, 129, 0.25)",
      bottomColor: "rgba(0, 0, 0, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`,
      },
      title: primaryTitle,
    });

    // 2. Invested Amount Line Series
    const investedSeries = chart.addSeries(LineSeries, {
      color: investedColor,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceFormat: {
        type: "custom",
        formatter: (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`,
      },
      title: investedTitle,
    });

    chartRef.current = chart;
    valueSeriesRef.current = valueSeries;
    investedSeriesRef.current = investedSeries;

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

        const vData = param.seriesData.get(valueSeries) as
          | { value: number; time: string }
          | undefined;
        const iData = param.seriesData.get(investedSeries) as
          | { value: number; time: string }
          | undefined;

        const vVal = vData?.value ?? 0;
        const iVal = iData?.value ?? 0;
        const timeStr = typeof param.time === "string" ? param.time : "";

        if (timeStr && vData) {
          const formattedDate = new Date(timeStr).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });
          onHoverPoint?.({
            date: timeStr,
            value: vVal,
            invested: iVal,
          });
          setTooltip({
            x: param.point.x,
            y: param.point.y,
            date: formattedDate,
            value: vVal,
            invested: iVal,
          });
        } else {
          onHoverPoint?.(null);
          setTooltip(null);
        }
      });
    });

    // Range change listener to toggle reset button visibility
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      setCanReset((prev) => (prev ? prev : true));
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
  }, [height, primaryTitle, investedTitle]);

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
    if (valueSeriesRef.current) {
      valueSeriesRef.current.applyOptions({
        lineColor: primaryColor,
        topColor: primaryColor.startsWith("#10b981")
          ? "rgba(16, 185, 129, 0.28)"
          : primaryColor.startsWith("#3b82f6") || primaryColor.startsWith("#2563EB")
          ? "rgba(37, 99, 235, 0.28)"
          : "rgba(16, 185, 129, 0.25)",
      });
    }
    if (investedSeriesRef.current) {
      investedSeriesRef.current.applyOptions({
        color: investedColor,
      });
    }
  }, [primaryColor, investedColor]);

  // Update data when props change
  useEffect(() => {
    if (!valueSeriesRef.current || !investedSeriesRef.current || !chartRef.current)
      return;

    if (!data || data.length === 0) {
      valueSeriesRef.current.setData([]);
      investedSeriesRef.current.setData([]);
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

    chartRef.current.timeScale().fitContent();
    setCanReset(false);
  }, [data]);

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
            Pinch / Scroll to zoom • Drag to pan
          </div>
        </div>
      )}

      {/* Floating Interactive Tooltip Card matching user's design */}
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
              {tooltip.invested > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    tooltip.value >= tooltip.invested
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {tooltip.value >= tooltip.invested ? "+" : ""}
                  {(
                    ((tooltip.value - tooltip.invested) / tooltip.invested) *
                    100
                  ).toFixed(2)}
                  %
                </span>
              )}
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  />
                  {primaryTitle}:
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  ₹{Math.round(tooltip.value).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-300">
                  <span
                    className="w-2 h-1 rounded-sm border-b-2 border-dashed shrink-0"
                    style={{ borderColor: investedColor }}
                  />
                  {investedTitle}:
                </span>
                <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">
                  ₹{Math.round(tooltip.invested).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="w-full relative select-none"
        style={{ touchAction: "pan-y" }}
      />

      {/* Legend / Status footer */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 px-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            {primaryTitle}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className="w-2.5 h-1 rounded-sm border-b-2 border-dashed"
              style={{ borderColor: investedColor }}
            />
            {investedTitle}
          </span>
        </div>
        <span className="text-neutral-400">Live Crosshair Tracker</span>
      </div>
    </div>
  );
});

export default TradingViewJourneyChart;

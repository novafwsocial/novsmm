"use client";

/**
 * MiniAreaChart — lightweight SVG area chart replacement for recharts.
 *
 * P-002 FIX: Replaces recharts (~400KB) with a pure SVG chart.
 * Uses ResizeObserver for pixel-perfect rendering (no viewBox stretching).
 *
 * Features:
 * - Responsive (ResizeObserver adapts to container width)
 * - Gradient fill (same look as recharts AreaChart)
 * - Grid lines (dashed, subtle)
 * - Hover tooltip with value
 * - No external dependencies
 */

import { useState, useRef, useEffect } from "react";

interface MiniAreaChartProps {
  data: { d: number; revenue: number; orders?: number }[];
  height?: number;
  showGrid?: boolean;
  color?: string;
  formatValue?: (v: number) => string;
}

export function MiniAreaChart({
  data,
  height = 120,
  showGrid = true,
  color = "#0052FF",
  formatValue = (v) => `$${v.toFixed(2)}`,
}: MiniAreaChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track actual container width for pixel-perfect SVG rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setContainerWidth(w);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-xs text-muted-foreground"
      >
        No data
      </div>
    );
  }

  // Use actual container width, fallback to 600
  const width = containerWidth || 600;
  const chartHeight = height;
  const padding = { top: 8, right: 4, bottom: 4, left: 4 };
  const chartW = width - padding.left - padding.right;
  const chartH = chartHeight - padding.top - padding.bottom;

  // Calculate min/max for Y axis
  const values = data.map((d) => d.revenue ?? 0);
  const maxVal = Math.max(...values, 0.01); // avoid 0 max
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  // Build points in pixel coordinates
  const points = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = padding.top + (1 - ((d.revenue ?? 0) - minVal) / range) * chartH;
    return { x, y, value: d.revenue ?? 0, orders: d.orders, index: i, day: d.d };
  });

  // Build smooth line path using simple line segments
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Area path: line + close to bottom
  const bottomY = chartHeight - padding.bottom;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;

  const gradientId = `area-grad-${color.replace("#", "")}`;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {containerWidth > 0 && (
        <svg
          width={width}
          height={chartHeight}
          className="overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            // Find nearest point
            let nearest = 0;
            let minDist = Infinity;
            points.forEach((p, i) => {
              const dist = Math.abs(p.x - x);
              if (dist < minDist) {
                minDist = dist;
                nearest = i;
              }
            });
            setHoverIdx(nearest);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {showGrid && (
            <g stroke="rgba(0,0,0,0.05)" strokeWidth={1} strokeDasharray="4 4">
              {[0.25, 0.5, 0.75].map((frac) => (
                <line
                  key={frac}
                  x1={padding.left}
                  y1={padding.top + frac * chartH}
                  x2={width - padding.right}
                  y2={padding.top + frac * chartH}
                />
              ))}
            </g>
          )}

          {/* Area fill */}
          <path d={areaPath} fill={`url(#${gradientId})`} />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Hover indicator */}
          {hoverIdx !== null && points[hoverIdx] && (
            <g>
              <line
                x1={points[hoverIdx].x}
                y1={padding.top}
                x2={points[hoverIdx].x}
                y2={bottomY}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <circle
                cx={points[hoverIdx].x}
                cy={points[hoverIdx].y}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>
      )}

      {/* Tooltip */}
      {hoverIdx !== null && points[hoverIdx] && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-background/95 px-2 py-1 text-xs shadow-md backdrop-blur-sm"
          style={{
            left: `${points[hoverIdx].x}px`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold text-foreground">
            {formatValue(points[hoverIdx].value)}
          </div>
          {points[hoverIdx].orders !== undefined && (
            <div className="text-muted-foreground">{points[hoverIdx].orders} orders</div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * MiniAreaChart — lightweight SVG area chart replacement for recharts.
 *
 * P-002 FIX: Replaces recharts (~400KB) with a pure SVG chart that renders
 * the same area-chart visualization in ~80 lines of code. Used by:
 * - dashboard-home.tsx (revenue chart)
 * - dashboard-analytics.tsx (analytics charts)
 * - dashboard-wallet.tsx (balance chart)
 * - admin-panel.tsx (overview chart)
 *
 * Features:
 * - Responsive (uses viewBox + preserveAspectRatio)
 * - Gradient fill (same look as recharts AreaChart)
 * - Optional grid lines (dashed, subtle)
 * - Hover tooltip with value + index
 * - No external dependencies
 */

import { useState, useRef } from "react";

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
  const svgRef = useRef<SVGSVGElement>(null);

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

  const values = data.map((d) => d.revenue);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const width = 100; // viewBox width units
  const chartHeight = height;
  const padding = { top: 8, right: 4, bottom: 0, left: 4 };

  // Build the area path
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * (width - padding.left - padding.right);
    const y = padding.top + (1 - (d.revenue - minVal) / range) * (chartHeight - padding.top - padding.bottom);
    return { x, y, value: d.revenue, orders: d.orders, index: i, day: d.d };
  });

  // Area path: start at bottom-left, go up to first point, across all points, down to bottom-right
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${chartHeight - padding.bottom} L ${points[0].x.toFixed(2)} ${chartHeight - padding.bottom} Z`;

  const gradientId = `area-gradient-${color.replace("#", "")}`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${chartHeight}`}
        preserveAspectRatio="none"
        className="overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = ((e.clientX - rect.left) / rect.width) * width;
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
          <g stroke="rgba(0,0,0,0.05)" strokeWidth={0.3} strokeDasharray="1 1">
            {[0.25, 0.5, 0.75].map((frac) => (
              <line
                key={frac}
                x1={padding.left}
                y1={padding.top + frac * (chartHeight - padding.top - padding.bottom)}
                x2={width - padding.right}
                y2={padding.top + frac * (chartHeight - padding.top - padding.bottom)}
              />
            ))}
          </g>
        )}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth={0.8} strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover indicator */}
        {hoverIdx !== null && points[hoverIdx] && (
          <g>
            <line
              x1={points[hoverIdx].x}
              y1={padding.top}
              x2={points[hoverIdx].x}
              y2={chartHeight - padding.bottom}
              stroke={color}
              strokeWidth={0.5}
              strokeDasharray="1 1"
            />
            <circle
              cx={points[hoverIdx].x}
              cy={points[hoverIdx].y}
              r={1.5}
              fill={color}
              stroke="white"
              strokeWidth={0.5}
            />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && points[hoverIdx] && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-background/95 px-2 py-1 text-xs shadow-md backdrop-blur-sm"
          style={{
            left: `${(points[hoverIdx].x / width) * 100}%`,
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

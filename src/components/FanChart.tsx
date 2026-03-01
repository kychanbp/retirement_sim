"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SimulationResult } from "../lib/types";
import { formatCurrency } from "../lib/formatting";

interface FanChartProps {
  result: SimulationResult;
  currentAge: number;
  retirementAge: number;
  title: string;
}

export function FanChart({
  result,
  currentAge,
  retirementAge,
  title,
}: FanChartProps) {
  const data = useMemo(() => {
    const series = result.percentileSeries;
    if (!series.p50.length) return [];

    const points = [];
    // Sample every 12 months (yearly)
    for (let m = 0; m < series.p50.length; m += 12) {
      const age = currentAge + m / 12;
      points.push({
        age,
        base: Math.max(series.p5[m], 0),
        band_5_10: Math.max(series.p10[m] - series.p5[m], 0),
        band_10_25: Math.max(series.p25[m] - series.p10[m], 0),
        band_25_50: Math.max(series.p50[m] - series.p25[m], 0),
        band_50_75: Math.max(series.p75[m] - series.p50[m], 0),
        band_75_90: Math.max(series.p90[m] - series.p75[m], 0),
        band_90_95: Math.max(series.p95[m] - series.p90[m], 0),
        p50: series.p50[m],
      });
    }
    return points;
  }, [result, currentAge]);

  if (data.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="age"
            label={{ value: "Age", position: "insideBottom", offset: -10 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v, true)}
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip
            formatter={(value) => {
              if (typeof value === "number") return formatCurrency(value);
              return String(value);
            }}
            labelFormatter={(age) => `Age ${age}`}
          />

          {/* Fan bands stacked from bottom */}
          <Area
            type="monotone"
            dataKey="base"
            stackId="fan"
            fill="transparent"
            stroke="none"
          />
          <Area
            type="monotone"
            dataKey="band_5_10"
            stackId="fan"
            fill="#3b82f6"
            fillOpacity={0.1}
            stroke="none"
            name="5th-10th"
          />
          <Area
            type="monotone"
            dataKey="band_10_25"
            stackId="fan"
            fill="#3b82f6"
            fillOpacity={0.15}
            stroke="none"
            name="10th-25th"
          />
          <Area
            type="monotone"
            dataKey="band_25_50"
            stackId="fan"
            fill="#3b82f6"
            fillOpacity={0.25}
            stroke="none"
            name="25th-50th"
          />
          <Area
            type="monotone"
            dataKey="band_50_75"
            stackId="fan"
            fill="#3b82f6"
            fillOpacity={0.25}
            stroke="none"
            name="50th-75th"
          />
          <Area
            type="monotone"
            dataKey="band_75_90"
            stackId="fan"
            fill="#3b82f6"
            fillOpacity={0.15}
            stroke="none"
            name="75th-90th"
          />
          <Area
            type="monotone"
            dataKey="band_90_95"
            stackId="fan"
            fill="#3b82f6"
            fillOpacity={0.1}
            stroke="none"
            name="90th-95th"
          />

          {/* Median line */}
          <Line
            type="monotone"
            dataKey="p50"
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={false}
            name="Median"
          />

          {/* Retirement marker */}
          <ReferenceLine
            x={retirementAge}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{
              value: "Retirement",
              fill: "#ef4444",
              fontSize: 12,
              position: "insideTopRight",
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6", opacity: 0.25 }} />
          25th–75th
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6", opacity: 0.15 }} />
          10th–90th
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6", opacity: 0.1 }} />
          5th–95th
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-blue-800" />
          Median
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 border-t-2 border-dashed border-red-500" />
          Retirement
        </span>
      </div>
      <p className="text-xs text-gray-500 text-center mt-1">
        {result.terminalWealth.length.toLocaleString()} simulations
      </p>
    </div>
  );
}

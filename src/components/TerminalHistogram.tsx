"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { computeHistogramBins } from "../lib/statistics";
import { formatCurrency } from "../lib/formatting";

interface TerminalHistogramProps {
  terminalWealth: number[];
  title: string;
}

export function TerminalHistogram({
  terminalWealth,
  title,
}: TerminalHistogramProps) {
  const bins = useMemo(
    () => computeHistogramBins(terminalWealth, 30),
    [terminalWealth]
  );

  if (bins.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={bins}
          margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="binCenter"
            tickFormatter={(v) => formatCurrency(v, true)}
            tick={{ fontSize: 11 }}
            label={{
              value: "Terminal Wealth",
              position: "insideBottom",
              offset: -10,
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{
              value: "Frequency",
              angle: -90,
              position: "insideLeft",
              offset: 10,
            }}
          />
          <Tooltip
            labelFormatter={(v) => formatCurrency(v as number)}
            formatter={(v) => [v as number, "Count"]}
          />
          <Bar dataKey="count">
            {bins.map((bin, i) => (
              <Cell
                key={i}
                fill={bin.binCenter <= 0 ? "#ef4444" : "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

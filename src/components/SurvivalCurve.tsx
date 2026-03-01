"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SurvivalCurveProps {
  survivalByAge: { age: number; fractionSolvent: number }[];
  retirementAge: number;
  title: string;
}

export function SurvivalCurve({
  survivalByAge,
  retirementAge,
  title,
}: SurvivalCurveProps) {
  if (survivalByAge.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={survivalByAge}
          margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="age"
            label={{ value: "Age", position: "insideBottom", offset: -10 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 12 }}
            label={{
              value: "% Solvent",
              angle: -90,
              position: "insideLeft",
              offset: 10,
            }}
          />
          <Tooltip
            formatter={(v) =>
              typeof v === "number"
                ? [`${(v * 100).toFixed(1)}%`, "Solvent"]
                : String(v)
            }
            labelFormatter={(age) => `Age ${age}`}
          />
          <Line
            type="stepAfter"
            dataKey="fractionSolvent"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <ReferenceLine
            x={retirementAge}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{
              value: "Retirement",
              fill: "#ef4444",
              fontSize: 11,
              position: "insideTopLeft",
            }}
          />
          <ReferenceLine
            y={0.9}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{
              value: "90%",
              fill: "#f59e0b",
              fontSize: 11,
              position: "right",
            }}
          />
          <ReferenceLine
            y={0.95}
            stroke="#10b981"
            strokeDasharray="3 3"
            label={{
              value: "95%",
              fill: "#10b981",
              fontSize: 11,
              position: "right",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

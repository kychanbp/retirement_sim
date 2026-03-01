"use client";

import type { SensitivityTable as SensitivityTableData } from "../lib/types";

interface SensitivityTableProps {
  data: SensitivityTableData;
}

function getCellColor(rate: number): string {
  if (rate < 0) return "bg-gray-100 text-gray-400"; // invalid
  if (rate >= 0.95) return "bg-green-200 text-green-900";
  if (rate >= 0.9) return "bg-green-100 text-green-800";
  if (rate >= 0.8) return "bg-lime-100 text-lime-800";
  if (rate >= 0.7) return "bg-yellow-100 text-yellow-800";
  if (rate >= 0.5) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export function SensitivityTable({ data }: SensitivityTableProps) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2">
        {data.title}
      </h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 border border-gray-200 bg-gray-50 text-left text-gray-600">
                {data.rowLabel} \ {data.colLabel}
              </th>
              {data.colDisplayLabels.map((label, i) => (
                <th
                  key={i}
                  className="p-2 border border-gray-200 bg-gray-50 text-center text-gray-600 font-medium"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cells.map((row, ri) => (
              <tr key={ri}>
                <td className="p-2 border border-gray-200 bg-gray-50 font-medium text-gray-700 whitespace-nowrap">
                  {data.rowDisplayLabels[ri]}
                </td>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`p-2 border border-gray-200 text-center font-mono font-medium ${getCellColor(cell.successRate)}`}
                  >
                    {cell.successRate < 0
                      ? "—"
                      : `${(cell.successRate * 100).toFixed(0)}%`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

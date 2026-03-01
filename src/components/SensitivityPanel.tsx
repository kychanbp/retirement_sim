"use client";

import type { SensitivityResults } from "../lib/types";
import { SensitivityTable } from "./SensitivityTable";

interface SensitivityPanelProps {
  sensitivityA: SensitivityResults;
  sensitivityC: SensitivityResults;
  option: "A" | "C";
}

export function SensitivityPanel({
  sensitivityA,
  sensitivityC,
  option,
}: SensitivityPanelProps) {
  const data = option === "A" ? sensitivityA : sensitivityC;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-800">
        Sensitivity Analysis — Option {option}
      </h3>

      <p className="text-xs text-gray-500">
        Each cell shows the probability of success.
        {option === "A"
          ? " Option A uses liquid assets only."
          : " Option C includes property equity (mortgage repayment + liquidation at retirement)."}
      </p>

      {/* Visual color legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
        {[
          { bg: "bg-green-200", label: "\u226595%" },
          { bg: "bg-green-100", label: "90\u201395%" },
          { bg: "bg-lime-100", label: "80\u201390%" },
          { bg: "bg-yellow-100", label: "70\u201380%" },
          { bg: "bg-orange-100", label: "50\u201370%" },
          { bg: "bg-red-100", label: "<50%" },
        ].map(({ bg, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded-sm ${bg}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SensitivityTable data={data.spendingVsReturn} />
        <SensitivityTable data={data.spendingVsRetirement} />
        <SensitivityTable data={data.spendingVsVolatility} />
        <SensitivityTable data={data.returnVsVolatility} />
      </div>
    </div>
  );
}

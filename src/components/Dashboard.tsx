"use client";

import { useState } from "react";
import type { FullResults } from "../lib/types";
import { SummaryCards } from "./SummaryCards";
import { FanChart } from "./FanChart";
import { TerminalHistogram } from "./TerminalHistogram";
import { SurvivalCurve } from "./SurvivalCurve";
import { SensitivityPanel } from "./SensitivityPanel";
import { usePdfDownload } from "../hooks/usePdfDownload";

interface DashboardProps {
  results: FullResults;
}

export function Dashboard({ results }: DashboardProps) {
  const [option, setOption] = useState<"A" | "C">("A");
  const chartResult =
    option === "A" ? results.optionA : results.optionC;
  const { downloadPdf, isGenerating } = usePdfDownload(results);

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Retirement Readiness Dashboard
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Computed in {(results.computeTimeMs / 1000).toFixed(1)}s |{" "}
            {results.config.nSimulations.toLocaleString()} simulations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Download PDF button */}
          <button
            onClick={downloadPdf}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </>
            )}
          </button>
          {/* Single global Option A/C toggle */}
          <OptionToggle option={option} onChange={setOption} />
        </div>
      </div>

      {/* Summary Cards — always shows both A and C */}
      <SummaryCards results={results} />

      <div className="border-t border-gray-200" />

      {/* Charts Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800">
          Wealth Projections — {option === "A" ? "Liquid Only" : "Including Property"}
        </h3>

        {/* Fan Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <FanChart
            result={chartResult}
            currentAge={results.config.currentAge}
            retirementAge={results.config.retirementAge}
            title={`Wealth Over Time — Option ${option}`}
          />
        </div>

        {/* Histogram + Survival side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <TerminalHistogram
              terminalWealth={chartResult.terminalWealth}
              title={`Terminal Wealth Distribution — Option ${option}`}
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <SurvivalCurve
              survivalByAge={chartResult.survivalByAge}
              retirementAge={results.config.retirementAge}
              title={`Survival Curve — Option ${option}`}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* Sensitivity Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <SensitivityPanel
          sensitivityA={results.sensitivityA}
          sensitivityC={results.sensitivityC}
          option={option}
        />
      </div>
    </div>
  );
}

function OptionToggle({
  option,
  onChange,
}: {
  option: "A" | "C";
  onChange: (v: "A" | "C") => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
      <button
        onClick={() => onChange("A")}
        className={`px-4 py-1.5 text-sm font-medium transition-colors ${
          option === "A"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        Option A
      </button>
      <button
        onClick={() => onChange("C")}
        className={`px-4 py-1.5 text-sm font-medium transition-colors ${
          option === "C"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        Option C
      </button>
    </div>
  );
}

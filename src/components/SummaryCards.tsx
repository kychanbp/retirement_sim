"use client";

import type { FullResults } from "../lib/types";
import { formatCurrency, formatPercent, formatMonthly } from "../lib/formatting";
import { computeMortgageSummary } from "../lib/simulation";

interface SummaryCardsProps {
  results: FullResults;
}

export function SummaryCards({ results }: SummaryCardsProps) {
  const { optionA, optionC, safeSpendingA, safeSpendingC, sequenceRiskA, sequenceRiskC, config } = results;
  const mortgage = computeMortgageSummary(config);

  return (
    <div className="space-y-6">
      {/* Household Profile */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Household Profile
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Current age</span>
            <p className="font-medium">{config.currentAge}</p>
          </div>
          <div>
            <span className="text-gray-500">Retirement age</span>
            <p className="font-medium">{config.retirementAge}</p>
          </div>
          <div>
            <span className="text-gray-500">Planning to age</span>
            <p className="font-medium">{config.deathAge}</p>
          </div>
          <div>
            <span className="text-gray-500">Monthly spending</span>
            <p className="font-medium">{formatMonthly(config.monthlySpending)}</p>
          </div>
          <div>
            <span className="text-gray-500">Monthly savings</span>
            <p className="font-medium">{formatMonthly(config.monthlySavings)}</p>
          </div>
        </div>
      </div>

      {/* Core Results Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResultColumn
          title="Option A — Liquid Assets Only"
          startingWealth={config.liquidAssets}
          propertyEquity={0}
          result={optionA}
          safeSpending={safeSpendingA}
          sequenceRisk={sequenceRiskA}
        />
        <ResultColumn
          title="Option C — Including Property Equity"
          startingWealth={config.liquidAssets}
          propertyEquity={mortgage.currentEquity}
          result={optionC}
          safeSpending={safeSpendingC}
          sequenceRisk={sequenceRiskC}
        />
      </div>
    </div>
  );
}

function ResultColumn({
  title,
  startingWealth,
  propertyEquity,
  result,
  safeSpending,
  sequenceRisk,
}: {
  title: string;
  startingWealth: number;
  propertyEquity: number;
  result: FullResults["optionA"];
  safeSpending: FullResults["safeSpendingA"];
  sequenceRisk: FullResults["sequenceRiskA"];
}) {
  const successColor =
    result.successRate >= 0.9
      ? "text-green-700 bg-green-50"
      : result.successRate >= 0.7
        ? "text-yellow-700 bg-yellow-50"
        : "text-red-700 bg-red-50";

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>

      {/* Success Rate — Big Number */}
      <div className={`rounded-lg p-4 text-center ${successColor}`}>
        <p className="text-3xl font-bold">{formatPercent(result.successRate, 1)}</p>
        <p className="text-xs mt-1">Probability of Success</p>
      </div>

      {/* Key Metrics */}
      <div className="space-y-2 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Key Metrics
        </p>
        <MetricRow label="Starting liquid assets" value={formatCurrency(startingWealth)} />
        {propertyEquity > 0 && (
          <MetricRow label="Starting property equity" value={formatCurrency(propertyEquity)} />
        )}
        <MetricRow label="Median wealth at retirement" value={formatCurrency(result.medianWealthAtRetirement)} />
        <MetricRow label="Median wealth at death" value={formatCurrency(result.medianTerminalWealth)} />
        <MetricRow label="5th percentile at death" value={formatCurrency(result.p5TerminalWealth)} />
        <MetricRow label="95th percentile at death" value={formatCurrency(result.p95TerminalWealth)} />
        {result.medianRuinAge !== null && (
          <MetricRow label="Median ruin age" value={result.medianRuinAge.toFixed(1)} highlight />
        )}
      </div>

      {/* Safe Spending */}
      <div className="border-t pt-3 space-y-2 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Safe Spending
        </p>
        <MetricRow label="90% confidence" value={formatMonthly(safeSpending.confidence90)} />
        <MetricRow label="95% confidence" value={formatMonthly(safeSpending.confidence95)} />
      </div>

      {/* Sequence Risk */}
      <div className="border-t pt-3 space-y-2 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Sequence-of-Returns Risk
        </p>
        <MetricRow label="Normal" value={formatPercent(sequenceRisk.normalSuccessRate)} />
        <MetricRow label="Bad first 5 years" value={formatPercent(sequenceRisk.stressedSuccessRate)} />
        <MetricRow
          label="Drop"
          value={`${(sequenceRisk.drop * 100).toFixed(1)} pp`}
          highlight={sequenceRisk.drop > 0.1}
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${highlight ? "text-red-600 font-semibold" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

"use client";

import React, { forwardRef, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  LineChart,
} from "recharts";
import type { FullResults, SimulationResult, SensitivityTable } from "../lib/types";
import { formatCurrency, formatPercent, formatMonthly } from "../lib/formatting";
import { computeHistogramBins } from "../lib/statistics";
import { computeMortgageSummary } from "../lib/simulation";
import { MethodologyContent } from "./MethodologyContent";

interface PdfReportLayoutProps {
  results: FullResults;
}

// ─── Color helpers (replicated from SensitivityTable) ─────────

function getCellColor(rate: number): string {
  if (rate < 0) return "bg-gray-100 text-gray-400";
  if (rate >= 0.95) return "bg-green-200 text-green-900";
  if (rate >= 0.9) return "bg-green-100 text-green-800";
  if (rate >= 0.8) return "bg-lime-100 text-lime-800";
  if (rate >= 0.7) return "bg-yellow-100 text-yellow-800";
  if (rate >= 0.5) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

function successColor(rate: number) {
  if (rate >= 0.9) return "text-green-700 bg-green-50";
  if (rate >= 0.7) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
}

// ─── Fan chart data transform (replicated from FanChart.tsx) ──

function buildFanData(result: SimulationResult, currentAge: number) {
  const series = result.percentileSeries;
  if (!series.p50.length) return [];
  const points = [];
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
}

// ─── Reusable sub-sections ────────────────────────────────────

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

function PdfResultColumn({
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
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <div className={`rounded-lg p-4 text-center ${successColor(result.successRate)}`}>
        <p className="text-3xl font-bold">{formatPercent(result.successRate, 1)}</p>
        <p className="text-xs mt-1">Probability of Success</p>
      </div>
      <div className="space-y-2 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key Metrics</p>
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
      <div className="border-t pt-3 space-y-2 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Safe Spending</p>
        <MetricRow label="90% confidence" value={formatMonthly(safeSpending.confidence90)} />
        <MetricRow label="95% confidence" value={formatMonthly(safeSpending.confidence95)} />
      </div>
      <div className="border-t pt-3 space-y-2 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sequence-of-Returns Risk</p>
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

function PdfFanChart({
  result,
  currentAge,
  retirementAge,
  title,
}: {
  result: SimulationResult;
  currentAge: number;
  retirementAge: number;
  title: string;
}) {
  const data = useMemo(() => buildFanData(result, currentAge), [result, currentAge]);
  if (data.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <ComposedChart width={734} height={350} data={data} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="age" label={{ value: "Age", position: "insideBottom", offset: -10 }} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 12 }} width={80} />
        <Area type="monotone" dataKey="base" stackId="fan" fill="transparent" stroke="none" />
        <Area type="monotone" dataKey="band_5_10" stackId="fan" fill="#3b82f6" fillOpacity={0.1} stroke="none" />
        <Area type="monotone" dataKey="band_10_25" stackId="fan" fill="#3b82f6" fillOpacity={0.15} stroke="none" />
        <Area type="monotone" dataKey="band_25_50" stackId="fan" fill="#3b82f6" fillOpacity={0.25} stroke="none" />
        <Area type="monotone" dataKey="band_50_75" stackId="fan" fill="#3b82f6" fillOpacity={0.25} stroke="none" />
        <Area type="monotone" dataKey="band_75_90" stackId="fan" fill="#3b82f6" fillOpacity={0.15} stroke="none" />
        <Area type="monotone" dataKey="band_90_95" stackId="fan" fill="#3b82f6" fillOpacity={0.1} stroke="none" />
        <Line type="monotone" dataKey="p50" stroke="#1d4ed8" strokeWidth={2} dot={false} name="Median" />
        <ReferenceLine
          x={retirementAge}
          stroke="#ef4444"
          strokeDasharray="5 5"
          label={{ value: "Retirement", fill: "#ef4444", fontSize: 12, position: "insideTopRight" }}
        />
      </ComposedChart>
    </div>
  );
}

function PdfHistogram({ terminalWealth, title }: { terminalWealth: number[]; title: string }) {
  const bins = useMemo(() => computeHistogramBins(terminalWealth, 30), [terminalWealth]);
  if (bins.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <BarChart width={350} height={280} data={bins} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="binCenter" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10 }} label={{ value: "Terminal Wealth", position: "insideBottom", offset: -10 }} />
        <YAxis tick={{ fontSize: 11 }} label={{ value: "Frequency", angle: -90, position: "insideLeft", offset: 10 }} />
        <Bar dataKey="count">
          {bins.map((bin, i) => (
            <Cell key={i} fill={bin.binCenter <= 0 ? "#ef4444" : "#3b82f6"} />
          ))}
        </Bar>
      </BarChart>
    </div>
  );
}

function PdfSurvivalCurve({
  survivalByAge,
  retirementAge,
  title,
}: {
  survivalByAge: { age: number; fractionSolvent: number }[];
  retirementAge: number;
  title: string;
}) {
  if (survivalByAge.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <LineChart width={350} height={280} data={survivalByAge} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="age" label={{ value: "Age", position: "insideBottom", offset: -10 }} tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 12 }} label={{ value: "% Solvent", angle: -90, position: "insideLeft", offset: 10 }} />
        <Line type="stepAfter" dataKey="fractionSolvent" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <ReferenceLine x={retirementAge} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Retirement", fill: "#ef4444", fontSize: 11, position: "insideTopLeft" }} />
        <ReferenceLine y={0.9} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "90%", fill: "#f59e0b", fontSize: 11, position: "right" }} />
        <ReferenceLine y={0.95} stroke="#10b981" strokeDasharray="3 3" label={{ value: "95%", fill: "#10b981", fontSize: 11, position: "right" }} />
      </LineChart>
    </div>
  );
}

function PdfSensitivityTable({ data }: { data: SensitivityTable }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 mb-1">{data.title}</h4>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1 border border-gray-200 bg-gray-50 text-left text-gray-600" style={{ fontSize: "10px" }}>
              {data.rowLabel} \ {data.colLabel}
            </th>
            {data.colDisplayLabels.map((label, i) => (
              <th key={i} className="p-1 border border-gray-200 bg-gray-50 text-center text-gray-600 font-medium" style={{ fontSize: "10px" }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.cells.map((row, ri) => (
            <tr key={ri}>
              <td className="p-1 border border-gray-200 bg-gray-50 font-medium text-gray-700 whitespace-nowrap" style={{ fontSize: "10px" }}>
                {data.rowDisplayLabels[ri]}
              </td>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`p-1 border border-gray-200 text-center font-mono font-medium ${getCellColor(cell.successRate)}`}
                  style={{ fontSize: "10px" }}
                >
                  {cell.successRate < 0 ? "\u2014" : `${(cell.successRate * 100).toFixed(0)}%`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PdfSensitivitySection({ option, sensitivity }: { option: "A" | "C"; sensitivity: FullResults["sensitivityA"] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">
        Sensitivity Analysis — Option {option}
      </h3>
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
      <div className="grid grid-cols-2 gap-4">
        <PdfSensitivityTable data={sensitivity.spendingVsReturn} />
        <PdfSensitivityTable data={sensitivity.spendingVsRetirement} />
        <PdfSensitivityTable data={sensitivity.spendingVsVolatility} />
        <PdfSensitivityTable data={sensitivity.returnVsVolatility} />
      </div>
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────

export const PdfReportLayout = forwardRef<HTMLDivElement, PdfReportLayoutProps>(
  function PdfReportLayout({ results }, ref) {
    const { config, optionA, optionC, safeSpendingA, safeSpendingC, sequenceRiskA, sequenceRiskC, sensitivityA, sensitivityC } = results;
    const mortgage = computeMortgageSummary(config);

    return (
      <div
        ref={ref}
        style={{
          background: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Title page */}
        <div data-pdf-section="title" className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Retirement Readiness Report
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Generated {new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Household Profile
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
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
            <div className="grid grid-cols-5 gap-3 text-sm mt-3">
              <div>
                <span className="text-gray-500">Liquid assets</span>
                <p className="font-medium">{formatCurrency(config.liquidAssets)}</p>
              </div>
              {mortgage.currentEquity > 0 && (
                <div>
                  <span className="text-gray-500">Property equity</span>
                  <p className="font-medium">{formatCurrency(mortgage.currentEquity)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Option A summary */}
        <div data-pdf-section="summary-a" className="px-8 py-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Option A — Liquid Assets Only</h2>
          <div className="grid grid-cols-2 gap-4">
            <PdfResultColumn
              title="Option A — Liquid Assets Only"
              startingWealth={config.liquidAssets}
              propertyEquity={0}
              result={optionA}
              safeSpending={safeSpendingA}
              sequenceRisk={sequenceRiskA}
            />
            <PdfResultColumn
              title="Option C — Including Property Equity"
              startingWealth={config.liquidAssets}
              propertyEquity={mortgage.currentEquity}
              result={optionC}
              safeSpending={safeSpendingC}
              sequenceRisk={sequenceRiskC}
            />
          </div>
        </div>

        {/* Option A fan chart */}
        <div data-pdf-section="fanchart-a" className="px-8 py-4">
          <PdfFanChart
            result={optionA}
            currentAge={config.currentAge}
            retirementAge={config.retirementAge}
            title="Wealth Over Time — Option A"
          />
        </div>

        {/* Option A histogram + survival */}
        <div data-pdf-section="histsurv-a" className="px-8 py-4">
          <div className="flex gap-4">
            <PdfHistogram
              terminalWealth={optionA.terminalWealth}
              title="Terminal Wealth Distribution — Option A"
            />
            <PdfSurvivalCurve
              survivalByAge={optionA.survivalByAge}
              retirementAge={config.retirementAge}
              title="Survival Curve — Option A"
            />
          </div>
        </div>

        {/* Option A sensitivity */}
        <div data-pdf-section="sensitivity-a" className="px-8 py-4">
          <PdfSensitivitySection option="A" sensitivity={sensitivityA} />
        </div>

        {/* Option C fan chart */}
        <div data-pdf-section="fanchart-c" className="px-8 py-4">
          <PdfFanChart
            result={optionC}
            currentAge={config.currentAge}
            retirementAge={config.retirementAge}
            title="Wealth Over Time — Option C"
          />
        </div>

        {/* Option C histogram + survival */}
        <div data-pdf-section="histsurv-c" className="px-8 py-4">
          <div className="flex gap-4">
            <PdfHistogram
              terminalWealth={optionC.terminalWealth}
              title="Terminal Wealth Distribution — Option C"
            />
            <PdfSurvivalCurve
              survivalByAge={optionC.survivalByAge}
              retirementAge={config.retirementAge}
              title="Survival Curve — Option C"
            />
          </div>
        </div>

        {/* Option C sensitivity */}
        <div data-pdf-section="sensitivity-c" className="px-8 py-4">
          <PdfSensitivitySection option="C" sensitivity={sensitivityC} />
        </div>

        {/* Methodology */}
        <div data-pdf-section="methodology" className="px-8 py-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Methodology</h2>
          <div className="max-w-3xl">
            <MethodologyContent />
          </div>
        </div>
      </div>
    );
  }
);

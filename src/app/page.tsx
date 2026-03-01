"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { InputForm } from "../components/InputForm";
import { Dashboard } from "../components/Dashboard";
import { ProgressBar } from "../components/ProgressBar";
import { useSimulationContext } from "../components/SimulationProvider";
import type { FullResults, HouseholdConfig, SavedReport } from "../lib/types";
import { STORAGE_KEY_REPORTS } from "../lib/constants";

/** Backfill missing fields on configs from older saved reports. */
function migrateConfig(c: Record<string, unknown>): HouseholdConfig {
  if (c.adjustSavingsForAge === undefined) c.adjustSavingsForAge = true;
  if (c.accumEquity === undefined) c.accumEquity = 0.80;
  if (c.withdrawEquity === undefined) c.withdrawEquity = 0.60;
  // Migrate old propertyEquity to propertyValue
  if (c.propertyValue === undefined) {
    c.propertyValue = (c.propertyEquity as number) || 0;
  }
  delete c.propertyEquity;
  if (c.originalLoanAmount === undefined) c.originalLoanAmount = 0;
  if (c.monthlyMortgagePayment === undefined) c.monthlyMortgagePayment = 0;
  if (c.mortgageRate === undefined) c.mortgageRate = 0.015;
  if (c.mortgageCommencementDate === undefined) c.mortgageCommencementDate = "";
  // Migrate old remainingMortgageTerm to maturity date
  if (c.mortgageMaturityDate === undefined) {
    const oldTerm = c.remainingMortgageTerm;
    if (typeof oldTerm === "number" && oldTerm > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + oldTerm);
      c.mortgageMaturityDate = d.toISOString().slice(0, 10);
    } else {
      c.mortgageMaturityDate = "";
    }
  }
  delete c.remainingMortgageTerm;
  if (c.replacementHomeCost === undefined) c.replacementHomeCost = 0;
  if (c.propertyTransactionCost === undefined) c.propertyTransactionCost = 0.02;
  return c as unknown as HouseholdConfig;
}

function loadReports(): SavedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (raw) {
      const reports: SavedReport[] = JSON.parse(raw);
      for (const r of reports) {
        r.config = migrateConfig(r.config as unknown as Record<string, unknown>);
        r.results.config = r.config;
      }
      return reports;
    }
  } catch {}
  return [];
}

function saveReportToStorage(report: SavedReport) {
  try {
    const existing = loadReports();
    existing.unshift(report);
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(existing));
  } catch {}
}

function deleteReportFromStorage(id: string) {
  try {
    const existing = loadReports().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(existing));
  } catch {}
}

export default function Home() {
  const { results, progress, isRunning, error, run, cancel } = useSimulationContext();
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
  const [saveLabel, setSaveLabel] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setSavedReports(loadReports());
  }, []);

  // Which results to display: currently viewed saved report or live results
  const displayResults: FullResults | null = viewingReport
    ? viewingReport.results
    : results;

  const initialConfig: HouseholdConfig | null = viewingReport
    ? viewingReport.config
    : null;

  const handleSave = useCallback(() => {
    const data = displayResults;
    if (!data) return;
    const name =
      saveLabel.trim() ||
      `Report — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const report: SavedReport = {
      id: crypto.randomUUID(),
      name,
      savedAt: new Date().toISOString(),
      config: data.config,
      results: data,
    };
    saveReportToStorage(report);
    setSavedReports(loadReports());
    setSaveLabel("");
  }, [displayResults, saveLabel]);

  const handleDelete = useCallback((id: string) => {
    deleteReportFromStorage(id);
    setSavedReports(loadReports());
    setViewingReport((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleLoadReport = useCallback((report: SavedReport) => {
    setViewingReport(report);
    setShowSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBackToLive = useCallback(() => {
    setViewingReport(null);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Household Retirement Simulator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monte Carlo simulation — all values in today&apos;s dollars
            {" · "}
            <Link
              href="/methodology"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Methodology
            </Link>
          </p>
        </div>

        {/* Saved Reports Toggle */}
        {savedReports.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {showSaved ? "Hide" : "Show"} saved reports (
              {savedReports.length})
            </button>
            {showSaved && (
              <div className="mt-3 bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                {savedReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {r.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(r.savedAt).toLocaleString()} | Success:{" "}
                        {(r.results.optionA.successRate * 100).toFixed(1)}% (A)
                        / {(r.results.optionC.successRate * 100).toFixed(1)}%
                        (C)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadReport(r)}
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Viewing Saved Report Banner */}
        {viewingReport && (
          <div className="mb-6 p-3 rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              Viewing saved report:{" "}
              <strong>{viewingReport.name}</strong>
            </p>
            <button
              onClick={handleBackToLive}
              className="text-xs px-3 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
            >
              Back to simulator
            </button>
          </div>
        )}

        {/* Input Form (hidden when viewing a saved report) */}
        {!viewingReport && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <InputForm
              onSubmit={run}
              disabled={isRunning}
              initialConfig={initialConfig}
            />
          </div>
        )}

        {/* Progress */}
        {isRunning && (
          <div className="mb-8">
            <ProgressBar progress={progress} onCancel={cancel} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            Simulation error: {error}
          </div>
        )}

        {/* Results Dashboard */}
        {displayResults && (
          <>
            {/* Save Report Bar */}
            <div className="mb-4 flex items-center gap-3">
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="Report name (optional)"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-gray-300"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                Save Report
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <Dashboard results={displayResults} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

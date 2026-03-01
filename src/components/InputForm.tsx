"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { HouseholdConfig } from "../lib/types";
import { EMPTY_CONFIG, STORAGE_KEY_INPUTS, computePortfolioParams } from "../lib/constants";
import { getRemainingMortgageMonths, computeMortgageSummary } from "../lib/simulation";
import { formatCurrency } from "../lib/formatting";

interface InputFormProps {
  onSubmit: (config: HouseholdConfig) => void;
  disabled: boolean;
  initialConfig?: HouseholdConfig | null;
}

/** Backfill missing fields for configs saved before they existed. */
function backfillConfig(parsed: Record<string, unknown>): HouseholdConfig {
  if (parsed.adjustSavingsForAge === undefined) parsed.adjustSavingsForAge = true;
  if (parsed.accumEquity === undefined) parsed.accumEquity = 0.80;
  if (parsed.withdrawEquity === undefined) parsed.withdrawEquity = 0.60;
  // Migrate old propertyEquity to propertyValue
  if (parsed.propertyValue === undefined) {
    parsed.propertyValue = (parsed.propertyEquity as number) || 0;
  }
  delete parsed.propertyEquity;
  if (parsed.originalLoanAmount === undefined) parsed.originalLoanAmount = 0;
  if (parsed.monthlyMortgagePayment === undefined) parsed.monthlyMortgagePayment = 0;
  if (parsed.mortgageRate === undefined) parsed.mortgageRate = 0.015;
  if (parsed.mortgageCommencementDate === undefined) parsed.mortgageCommencementDate = "";
  // Migrate old remainingMortgageTerm (months) to maturity date
  if (parsed.mortgageMaturityDate === undefined) {
    const oldTerm = parsed.remainingMortgageTerm;
    if (typeof oldTerm === "number" && oldTerm > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + oldTerm);
      parsed.mortgageMaturityDate = d.toISOString().slice(0, 10);
    } else {
      parsed.mortgageMaturityDate = "";
    }
  }
  delete parsed.remainingMortgageTerm;
  if (parsed.replacementHomeCost === undefined) parsed.replacementHomeCost = 0;
  if (parsed.propertyTransactionCost === undefined) parsed.propertyTransactionCost = 0.02;
  // Recompute return/vol from equity allocation to ensure consistency
  const accumParams = computePortfolioParams(parsed.accumEquity as number);
  parsed.accumReturn = accumParams.expectedReturn;
  parsed.accumVol = accumParams.volatility;
  const withdrawParams = computePortfolioParams(parsed.withdrawEquity as number);
  parsed.withdrawReturn = withdrawParams.expectedReturn;
  parsed.withdrawVol = withdrawParams.volatility;
  return parsed as unknown as HouseholdConfig;
}

function loadSavedInputs(): HouseholdConfig | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_INPUTS);
    if (raw) {
      return backfillConfig(JSON.parse(raw));
    }
  } catch {}
  return null;
}

function saveInputs(config: HouseholdConfig) {
  try {
    sessionStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(config));
  } catch {}
}

function validate(config: HouseholdConfig): string | null {
  if (config.liquidAssets <= 0 && config.propertyValue <= 0)
    return "Enter at least one asset value.";
  if (config.monthlySpending <= 0)
    return "Enter monthly spending.";
  if (config.currentAge <= 0 || config.currentAge > 100)
    return "Enter a valid current age.";
  if (config.retirementAge <= config.currentAge)
    return "Retirement age must be after current age.";
  if (config.deathAge <= config.retirementAge)
    return "Planning age must be after retirement age.";
  if (config.accumEquity < 0 || config.accumEquity > 1)
    return "Accumulation equity allocation must be between 0% and 100%.";
  if (config.withdrawEquity < 0 || config.withdrawEquity > 1)
    return "Withdrawal equity allocation must be between 0% and 100%.";
  if (config.mortgageRate < 0 || config.mortgageRate > 1)
    return "Mortgage rate must be between 0% and 100%.";
  if (config.monthlyMortgagePayment > 0 && config.originalLoanAmount <= 0)
    return "Enter the original loan amount.";
  if (config.monthlyMortgagePayment > 0 && !config.mortgageMaturityDate)
    return "Enter a mortgage maturity date (or set monthly payment to 0).";
  if (config.monthlyMortgagePayment > 0 && !config.mortgageCommencementDate)
    return "Enter a loan commencement date (or set monthly payment to 0).";
  if (config.mortgageMaturityDate && config.monthlyMortgagePayment === 0)
    return "Enter a monthly mortgage payment (or clear the dates).";
  if (config.mortgageMaturityDate && getRemainingMortgageMonths(config.mortgageMaturityDate) === 0)
    return "Mortgage maturity date must be in the future.";
  if (config.mortgageCommencementDate && config.mortgageMaturityDate &&
      config.mortgageCommencementDate >= config.mortgageMaturityDate)
    return "Commencement date must be before maturity date.";
  if (config.propertyTransactionCost < 0 || config.propertyTransactionCost > 1)
    return "Property transaction cost must be between 0% and 100%.";
  if (config.nSimulations < 100)
    return "Run at least 100 simulations.";
  return null;
}

export function InputForm({ onSubmit, disabled, initialConfig }: InputFormProps) {
  const [config, setConfig] = useState<HouseholdConfig>(EMPTY_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from initialConfig (saved report) or sessionStorage on mount
  useEffect(() => {
    if (initialConfig) {
      setConfig(backfillConfig(initialConfig as unknown as Record<string, unknown>));
    } else {
      const saved = loadSavedInputs();
      if (saved) setConfig(saved);
    }
    setLoaded(true);
  }, [initialConfig]);

  const set = useCallback((field: keyof HouseholdConfig, value: number | boolean | string) => {
    setConfig((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-derive return & vol when equity allocation changes
      if (field === "accumEquity") {
        const params = computePortfolioParams(value as number);
        next.accumReturn = params.expectedReturn;
        next.accumVol = params.volatility;
      }
      if (field === "withdrawEquity") {
        const params = computePortfolioParams(value as number);
        next.withdrawReturn = params.expectedReturn;
        next.withdrawVol = params.volatility;
      }
      saveInputs(next);
      return next;
    });
    setValidationError(null);
  }, []);

  const mortgageSummary = useMemo(() => computeMortgageSummary(config), [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(config);
    if (err) {
      setValidationError(err);
      return;
    }
    saveInputs(config);
    onSubmit(config);
  };

  // Don't render until we've checked sessionStorage (avoids hydration flash)
  if (!loaded) return null;

  const hasTimingValues =
    config.currentAge > 0 && config.retirementAge > 0 && config.deathAge > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Liquid Assets */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">
          Liquid Assets
        </legend>
        <NumberField
          label="Joint savings & investments"
          value={config.liquidAssets}
          onChange={(v) => set("liquidAssets", v)}
          prefix="$"
          placeholder="e.g. 500000"
        />
      </fieldset>

      {/* Property / Mortgage (for Option C) */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">
          Property &amp; Mortgage (for Option C)
        </legend>
        <p className="text-xs text-gray-500 mb-3">
          Property is treated as an illiquid asset (0% real return, 0%
          volatility). Equity grows via mortgage principal repayment. At
          retirement, the property is sold (with transaction costs) and a
          replacement home is purchased — only the net proceeds are invested.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Property market value"
            value={config.propertyValue}
            onChange={(v) => set("propertyValue", v)}
            prefix="$"
            hint="Estimated current market value"
            placeholder="e.g. 1200000"
          />
          <NumberField
            label="Original loan amount"
            value={config.originalLoanAmount}
            onChange={(v) => set("originalLoanAmount", v)}
            prefix="$"
            hint="Total loan principal at commencement"
            placeholder="e.g. 1500000"
          />
          <NumberField
            label="Monthly mortgage payment"
            value={config.monthlyMortgagePayment}
            onChange={(v) => set("monthlyMortgagePayment", v)}
            prefix="$"
            hint="Fixed monthly installment"
            placeholder="e.g. 2500"
          />
          <NumberField
            label="Mortgage interest rate"
            value={config.mortgageRate * 100}
            onChange={(v) => set("mortgageRate", v / 100)}
            suffix="%"
            hint="Annual nominal rate"
            placeholder="e.g. 3"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan commencement date
            </label>
            <input
              type="date"
              value={config.mortgageCommencementDate}
              onChange={(e) => set("mortgageCommencementDate", e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Date of first mortgage payment
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan maturity date
            </label>
            <input
              type="date"
              value={config.mortgageMaturityDate}
              onChange={(e) => set("mortgageMaturityDate", e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Date of final mortgage payment
            </p>
          </div>
          <NumberField
            label="Replacement home cost"
            value={config.replacementHomeCost}
            onChange={(v) => set("replacementHomeCost", v)}
            prefix="$"
            hint="Cost of the smaller home after downsizing (e.g. HDB flat)"
            placeholder="e.g. 500000"
          />
          <NumberField
            label="Transaction cost at sale"
            value={config.propertyTransactionCost * 100}
            onChange={(v) => set("propertyTransactionCost", v / 100)}
            suffix="%"
            hint="Agent fees, stamp duty, etc."
            placeholder="e.g. 2"
          />
        </div>
        {/* Auto-computed mortgage summary */}
        {(config.propertyValue > 0 || config.originalLoanAmount > 0) && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-2">
              Computed Summary
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {mortgageSummary.outstandingBalance > 0 && (
                <div>
                  <span className="text-gray-500">Outstanding balance</span>
                  <p className="font-mono font-medium text-gray-700">
                    {formatCurrency(mortgageSummary.outstandingBalance)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Current equity</span>
                <p className="font-mono font-medium text-green-700">
                  {formatCurrency(mortgageSummary.currentEquity)}
                </p>
              </div>
              {mortgageSummary.remainingMonths > 0 && (
                <div>
                  <span className="text-gray-500">Remaining tenure</span>
                  <p className="font-mono font-medium text-gray-700">
                    {mortgageSummary.remainingMonths} months
                    ({(mortgageSummary.remainingMonths / 12).toFixed(1)} yrs)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </fieldset>

      {/* Monthly Cash Flows */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">
          Monthly Cash Flows (Shared Account)
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Monthly savings"
            value={config.monthlySavings}
            onChange={(v) => set("monthlySavings", v)}
            prefix="$"
            hint="Net amount after all expenses including mortgage payments"
            placeholder="e.g. 5000"
          />
          <NumberField
            label="Monthly spending"
            value={config.monthlySpending}
            onChange={(v) => set("monthlySpending", v)}
            prefix="$"
            hint="Shared household living expenses to maintain in retirement"
            placeholder="e.g. 6000"
          />
        </div>
        <label className="flex items-start gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.adjustSavingsForAge}
            onChange={(e) => set("adjustSavingsForAge", e.target.checked)}
            className="mt-0.5 rounded border-gray-300"
          />
          <span className="text-xs text-gray-600">
            <strong>Adjust savings for income lifecycle</strong> — scale monthly
            savings over time using Singapore MOM median income-by-age data
            (income peaks at 40–49, then declines). Your entered savings is the
            starting amount at your current age.
          </span>
        </label>
      </fieldset>

      {/* Timing */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">
          Timing
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField
            label="Current age"
            value={config.currentAge}
            onChange={(v) => set("currentAge", v)}
            hint="Younger spouse"
            placeholder="e.g. 35"
          />
          <NumberField
            label="Retirement age"
            value={config.retirementAge}
            onChange={(v) => set("retirementAge", v)}
            placeholder="e.g. 55"
          />
          <NumberField
            label="Plan to age"
            value={config.deathAge}
            onChange={(v) => set("deathAge", v)}
            placeholder="e.g. 90"
          />
        </div>
        {hasTimingValues && (
          <div className="mt-2 text-xs text-gray-500">
            Years to retirement:{" "}
            <strong>{config.retirementAge - config.currentAge}</strong> | Years
            in retirement:{" "}
            <strong>{config.deathAge - config.retirementAge}</strong>
          </div>
        )}
      </fieldset>

      {/* Glide Path — always visible */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">
          Portfolio Glide Path
        </legend>
        <p className="text-xs text-gray-500 mb-3">
          Set the equity allocation for each phase. Expected return and
          volatility are derived automatically from the asset class assumptions:
          equity 5.0% real return / 16.1% vol, bonds 1.5% / 5.7%.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-600">
              Accumulation Phase (pre-retirement)
            </p>
            <NumberField
              label="Equity allocation"
              value={config.accumEquity * 100}
              onChange={(v) => set("accumEquity", v / 100)}
              suffix="%"
              hint="Remainder in bonds"
            />
            <DerivedField
              label="Expected real return"
              value={`${(config.accumReturn * 100).toFixed(1)}%`}
            />
            <DerivedField
              label="Volatility"
              value={`${(config.accumVol * 100).toFixed(1)}%`}
            />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-600">
              Withdrawal Phase (post-retirement)
            </p>
            <NumberField
              label="Equity allocation"
              value={config.withdrawEquity * 100}
              onChange={(v) => set("withdrawEquity", v / 100)}
              suffix="%"
              hint="Remainder in bonds"
            />
            <DerivedField
              label="Expected real return"
              value={`${(config.withdrawReturn * 100).toFixed(1)}%`}
            />
            <DerivedField
              label="Volatility"
              value={`${(config.withdrawVol * 100).toFixed(1)}%`}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Defaults: 80/20 equity/bond during accumulation (4.3% return, 12.9%
          vol), 60/40 during withdrawal (3.6% return, 9.9% vol). See{" "}
          <a href="/methodology" className="text-blue-500 underline">
            methodology
          </a>{" "}
          for derivation.
        </p>
      </fieldset>

      {/* Advanced — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showAdvanced ? "Hide" : "Show"} advanced settings
        </button>
        {showAdvanced && (
          <fieldset className="border border-gray-200 rounded-lg p-4 mt-2">
            <legend className="text-sm font-semibold text-gray-700 px-2">
              Simulation Settings
            </legend>
            <NumberField
              label="Number of simulations"
              value={config.nSimulations}
              onChange={(v) => set("nSimulations", v)}
            />
          </fieldset>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {validationError}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={disabled}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? "Running Simulation..." : "Run Simulation"}
      </button>
    </form>
  );
}

// ─── Derived read-only display ────────────────────────────────────

function DerivedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="block w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600 font-mono">
        {value}
      </div>
    </div>
  );
}

// ─── Reusable number input ──────────────────────────────────────

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  placeholder,
}: NumberFieldProps) {
  // Track the raw string so the field can be temporarily empty while typing
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Sync from parent when not focused (e.g. loading saved config)
  const displayed = focused ? raw : String(value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center">
        {prefix && (
          <span className="text-sm text-gray-500 mr-1">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={displayed}
          placeholder={placeholder}
          onFocus={() => {
            setFocused(true);
            setRaw(String(value));
          }}
          onChange={(e) => {
            const text = e.target.value;
            // Allow empty, digits, and one decimal point
            if (text !== "" && !/^\d*\.?\d*$/.test(text)) return;
            setRaw(text);
            const parsed = parseFloat(text);
            if (!isNaN(parsed)) {
              onChange(parsed);
            }
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = parseFloat(raw);
            if (isNaN(parsed) || raw === "") {
              onChange(0);
              setRaw("0");
            } else {
              setRaw(String(parsed));
            }
          }}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-gray-300"
        />
        {suffix && (
          <span className="text-sm text-gray-500 ml-1">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

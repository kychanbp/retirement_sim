// ─── Input Configuration ───────────────────────────────────────

export interface HouseholdConfig {
  // Assets
  liquidAssets: number;
  propertyValue: number; // current market value of property

  // Monthly cash flows (real dollars)
  monthlySavings: number;
  monthlySpending: number;

  // Timing
  currentAge: number;
  retirementAge: number;
  deathAge: number;

  // Market — Accumulation phase
  accumEquity: number; // equity fraction (e.g. 0.80)
  accumReturn: number; // annual real return
  accumVol: number; // annual volatility

  // Market — Withdrawal phase
  withdrawEquity: number; // equity fraction (e.g. 0.60)
  withdrawReturn: number; // annual real return
  withdrawVol: number; // annual volatility

  // Property / Mortgage
  originalLoanAmount: number; // known loan principal at commencement
  monthlyMortgagePayment: number; // fixed monthly installment (EMI)
  mortgageRate: number; // annual nominal interest rate (e.g. 0.03 = 3%)
  mortgageCommencementDate: string; // ISO date string (YYYY-MM-DD) of first payment
  mortgageMaturityDate: string; // ISO date string (YYYY-MM-DD) of final payment
  replacementHomeCost: number; // cost of replacement home after downsizing
  propertyTransactionCost: number; // fraction, e.g. 0.02 = 2%

  // Income lifecycle
  adjustSavingsForAge: boolean; // scale savings by MOM income-by-age profile

  // Simulation
  nSimulations: number;
}

// ─── Simulation Results ────────────────────────────────────────

export interface PercentileSeries {
  p5: number[];
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
  p95: number[];
}

export interface SimulationResult {
  successRate: number;
  medianTerminalWealth: number;
  p5TerminalWealth: number;
  p95TerminalWealth: number;
  medianWealthAtRetirement: number;
  medianRuinAge: number | null;
  percentileSeries: PercentileSeries;
  terminalWealth: number[];
  survivalByAge: { age: number; fractionSolvent: number }[];
  totalMonths: number;
  retirementMonth: number;
}

// ─── Sensitivity Analysis ──────────────────────────────────────

export interface SensitivityCell {
  successRate: number;
}

export interface SensitivityTable {
  title: string;
  rowLabel: string;
  colLabel: string;
  rowValues: number[];
  colValues: number[];
  rowDisplayLabels: string[];
  colDisplayLabels: string[];
  cells: SensitivityCell[][];
}

export interface SensitivityResults {
  spendingVsReturn: SensitivityTable;
  spendingVsRetirement: SensitivityTable;
  spendingVsVolatility: SensitivityTable;
  returnVsVolatility: SensitivityTable;
}

// ─── Safe Spending ─────────────────────────────────────────────

export interface SafeSpendingResult {
  confidence90: number;
  confidence95: number;
}

// ─── Sequence Risk ─────────────────────────────────────────────

export interface SequenceRiskResult {
  normalSuccessRate: number;
  stressedSuccessRate: number;
  drop: number;
}

// ─── Full Output ───────────────────────────────────────────────

export interface FullResults {
  optionA: SimulationResult;
  optionC: SimulationResult;
  sensitivityA: SensitivityResults;
  sensitivityC: SensitivityResults;
  safeSpendingA: SafeSpendingResult;
  safeSpendingC: SafeSpendingResult;
  sequenceRiskA: SequenceRiskResult;
  sequenceRiskC: SequenceRiskResult;
  config: HouseholdConfig;
  computeTimeMs: number;
}

// ─── Worker Messages ───────────────────────────────────────────

export interface WorkerProgress {
  type: "PROGRESS";
  phase: string;
  percent: number;
  detail: string;
}

export type WorkerRequest = { type: "RUN_FULL"; config: HouseholdConfig };

export type WorkerResponse =
  | WorkerProgress
  | { type: "RESULT"; data: FullResults }
  | { type: "ERROR"; message: string };

// ─── Saved Reports ─────────────────────────────────────────────

export interface SavedReport {
  id: string;
  name: string;
  savedAt: string; // ISO date string
  config: HouseholdConfig;
  results: FullResults;
}

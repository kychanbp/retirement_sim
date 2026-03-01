import type { HouseholdConfig, SensitivityTable, SensitivityResults } from "./types";
import { runSimulationQuick } from "./simulation";
import {
  SENSITIVITY_SIMS,
  SPENDING_MULTIPLIERS,
  SPENDING_LABELS,
  RETURN_PAIRS,
  RETURN_LABELS,
  RETIREMENT_OFFSETS,
  VOLATILITY_PAIRS,
  VOLATILITY_LABELS,
} from "./constants";

type ProgressCallback = (percent: number, detail: string) => void;

/**
 * Build all four sensitivity tables for one option (A or C).
 */
export function buildSensitivityTables(
  config: HouseholdConfig,
  includeProperty: boolean,
  onProgress?: ProgressCallback
): SensitivityResults {
  const label = includeProperty ? "Option C" : "Option A";
  let totalCells = 0;
  let completedCells = 0;

  // Count total cells across all 4 tables
  const t1Cells = SPENDING_MULTIPLIERS.length * RETURN_PAIRS.length;
  const t2Cells = SPENDING_MULTIPLIERS.length * RETIREMENT_OFFSETS.length;
  const t3Cells = SPENDING_MULTIPLIERS.length * VOLATILITY_PAIRS.length;
  const t4Cells = RETURN_PAIRS.length * VOLATILITY_PAIRS.length;
  totalCells = t1Cells + t2Cells + t3Cells + t4Cells;

  function progress(detail: string) {
    completedCells++;
    onProgress?.(
      Math.round((completedCells / totalCells) * 100),
      `${label}: ${detail}`
    );
  }

  // Table 1: Spending × Return
  const spendingVsReturn = buildTable(
    "Spending × Real Return",
    "Spending",
    "Real Return",
    SPENDING_MULTIPLIERS,
    SPENDING_LABELS,
    RETURN_PAIRS.map((_, i) => i),
    RETURN_LABELS,
    (spendMult, retIdx) => {
      const [ar, wr] = RETURN_PAIRS[retIdx];
      const rate = runSimulationQuick(
        {
          ...config,
          monthlySpending: config.monthlySpending * spendMult,
          accumReturn: ar,
          withdrawReturn: wr,
        },
        includeProperty,
        SENSITIVITY_SIMS
      );
      progress("Spending × Return");
      return rate;
    }
  );

  // Table 2: Spending × Retirement Age
  const retirementLabels = RETIREMENT_OFFSETS.map((o) =>
    o === 0 ? "Base" : o > 0 ? `+${o}yr` : `${o}yr`
  );
  const spendingVsRetirement = buildTable(
    "Spending × Retirement Age",
    "Spending",
    "Retirement Age",
    SPENDING_MULTIPLIERS,
    SPENDING_LABELS,
    RETIREMENT_OFFSETS,
    retirementLabels,
    (spendMult, offset) => {
      const newRetAge = config.retirementAge + offset;
      if (newRetAge <= config.currentAge || newRetAge >= config.deathAge) {
        return -1; // invalid
      }
      const rate = runSimulationQuick(
        {
          ...config,
          monthlySpending: config.monthlySpending * spendMult,
          retirementAge: newRetAge,
        },
        includeProperty,
        SENSITIVITY_SIMS
      );
      progress("Spending × Retirement");
      return rate;
    }
  );

  // Table 3: Spending × Volatility
  const spendingVsVolatility = buildTable(
    "Spending × Volatility",
    "Spending",
    "Volatility",
    SPENDING_MULTIPLIERS,
    SPENDING_LABELS,
    VOLATILITY_PAIRS.map((_, i) => i),
    VOLATILITY_LABELS,
    (spendMult, volIdx) => {
      const [av, wv] = VOLATILITY_PAIRS[volIdx];
      const rate = runSimulationQuick(
        {
          ...config,
          monthlySpending: config.monthlySpending * spendMult,
          accumVol: av,
          withdrawVol: wv,
        },
        includeProperty,
        SENSITIVITY_SIMS
      );
      progress("Spending × Volatility");
      return rate;
    }
  );

  // Table 4: Return × Volatility
  const returnVsVolatility = buildTable(
    "Real Return × Volatility",
    "Real Return",
    "Volatility",
    RETURN_PAIRS.map((_, i) => i),
    RETURN_LABELS,
    VOLATILITY_PAIRS.map((_, i) => i),
    VOLATILITY_LABELS,
    (retIdx, volIdx) => {
      const [ar, wr] = RETURN_PAIRS[retIdx];
      const [av, wv] = VOLATILITY_PAIRS[volIdx];
      const rate = runSimulationQuick(
        {
          ...config,
          accumReturn: ar,
          withdrawReturn: wr,
          accumVol: av,
          withdrawVol: wv,
        },
        includeProperty,
        SENSITIVITY_SIMS
      );
      progress("Return × Volatility");
      return rate;
    }
  );

  return {
    spendingVsReturn,
    spendingVsRetirement,
    spendingVsVolatility,
    returnVsVolatility,
  };
}

function buildTable<R, C>(
  title: string,
  rowLabel: string,
  colLabel: string,
  rowValues: R[],
  rowDisplayLabels: string[],
  colValues: C[],
  colDisplayLabels: string[],
  computeCell: (row: R, col: C) => number
): SensitivityTable {
  const cells = rowValues.map((rv) =>
    colValues.map((cv) => ({
      successRate: computeCell(rv, cv),
    }))
  );

  return {
    title,
    rowLabel,
    colLabel,
    rowValues: rowValues.map(Number),
    colValues: colValues.map(Number),
    rowDisplayLabels,
    colDisplayLabels,
    cells,
  };
}

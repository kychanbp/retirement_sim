import type { HouseholdConfig } from "./types";

export const EMPTY_CONFIG: HouseholdConfig = {
  // Assets — user must fill in
  liquidAssets: 0,
  propertyValue: 0,

  // Monthly cash flows — user must fill in
  monthlySavings: 0,
  monthlySpending: 0,

  // Timing — user must fill in
  currentAge: 0,
  retirementAge: 0,
  deathAge: 0,

  // Accumulation — sensible defaults (80/20 equity/bond)
  accumEquity: 0.80,
  accumReturn: 0.043,
  accumVol: 0.129,

  // Withdrawal — sensible defaults (60/40 equity/bond)
  withdrawEquity: 0.60,
  withdrawReturn: 0.036,
  withdrawVol: 0.099,

  // Property / Mortgage
  originalLoanAmount: 0,
  monthlyMortgagePayment: 0,
  mortgageRate: 0.03,
  mortgageCommencementDate: "", // empty = no mortgage
  mortgageMaturityDate: "",
  replacementHomeCost: 0,
  propertyTransactionCost: 0.02,

  // Income lifecycle
  adjustSavingsForAge: true,

  // Simulation
  nSimulations: 10_000,
};

// ─── MOM Singapore Income-by-Age Profile ────────────────────────
// Source: MOM Table 75, Full-Time Employed Residents
// Median gross monthly income excluding employer CPF contributions
// Averaged over 2021–2025 to smooth year-to-year fluctuations.
//
// Format: [midpoint_age, average_median_income]
export const MOM_INCOME_PROFILE: [number, number][] = [
  [22, 3497], // 15–29 band (avg 2021–2025)
  [35, 5392], // 30–39 band
  [45, 6108], // 40–49 band (peak)
  [55, 4577], // 50–59 band
  [65, 2670], // 60 & over band
];

/**
 * Piecewise linear interpolation of the MOM income profile.
 * Returns the estimated median income at a given age.
 */
export function interpolateIncome(age: number): number {
  const profile = MOM_INCOME_PROFILE;
  if (age <= profile[0][0]) return profile[0][1];
  if (age >= profile[profile.length - 1][0])
    return profile[profile.length - 1][1];

  for (let i = 0; i < profile.length - 1; i++) {
    const [a1, v1] = profile[i];
    const [a2, v2] = profile[i + 1];
    if (age >= a1 && age <= a2) {
      const t = (age - a1) / (a2 - a1);
      return v1 + t * (v2 - v1);
    }
  }
  return profile[profile.length - 1][1];
}

/**
 * Returns the income multiplier at `age` relative to `startAge`.
 * multiplier = income_at_age / income_at_startAge
 *
 * At startAge the multiplier is 1.0. If the user is 35 and income
 * peaks at 45, the multiplier at 45 is ~1.13, then declines.
 */
export function getIncomeMultiplier(age: number, startAge: number): number {
  const base = interpolateIncome(startAge);
  if (base <= 0) return 1;
  return interpolateIncome(age) / base;
}

export const STORAGE_KEY_INPUTS = "retirement-sim:inputs";
export const STORAGE_KEY_REPORTS = "retirement-sim:reports";

export const SENSITIVITY_SIMS = 2_000;

// Spending multipliers for sensitivity tables
export const SPENDING_MULTIPLIERS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];
export const SPENDING_LABELS = ["-30%", "-20%", "-10%", "Base", "+10%", "+20%", "+30%"];

// Return pairs (accumulation / withdrawal) for sensitivity
export const RETURN_PAIRS: [number, number][] = [
  [0.03, 0.025],
  [0.035, 0.03],
  [0.043, 0.036], // base
  [0.05, 0.04],
  [0.06, 0.05],
];
export const RETURN_LABELS = [
  "3.0/2.5%",
  "3.5/3.0%",
  "4.3/3.6%",
  "5.0/4.0%",
  "6.0/5.0%",
];

// Retirement age offsets for sensitivity
export const RETIREMENT_OFFSETS = [-5, -3, -1, 0, 1, 3, 5];

// Volatility pairs (accumulation / withdrawal) for sensitivity
export const VOLATILITY_PAIRS: [number, number][] = [
  [0.08, 0.06],
  [0.1, 0.08],
  [0.129, 0.099], // base
  [0.16, 0.12],
  [0.2, 0.15],
];
export const VOLATILITY_LABELS = [
  "8/6%",
  "10/8%",
  "12.9/9.9%",
  "16/12%",
  "20/15%",
];

// ─── Underlying Asset Class Assumptions ──────────────────────────
// Used to derive portfolio return and volatility from equity allocation.
// Values calibrated so 80/20 → 4.3%/12.9% and 60/40 → 3.6%/9.9%.
export const EQUITY_REAL_RETURN = 0.05; // 5.0% real
export const BOND_REAL_RETURN = 0.015; // 1.5% real
export const EQUITY_VOL = 0.16063; // 16.1%
export const BOND_VOL = 0.05660; // 5.7%
export const EQUITY_BOND_CORRELATION = 0; // assumed zero

/**
 * Compute portfolio expected return and volatility from equity fraction.
 * Return = w × r_equity + (1−w) × r_bond
 * Vol = sqrt(w² × σ_e² + (1−w)² × σ_b² + 2w(1−w)ρσ_eσ_b)
 */
export function computePortfolioParams(equityFraction: number): {
  expectedReturn: number;
  volatility: number;
} {
  const w = equityFraction;
  const expectedReturn = w * EQUITY_REAL_RETURN + (1 - w) * BOND_REAL_RETURN;
  const variance =
    w * w * EQUITY_VOL * EQUITY_VOL +
    (1 - w) * (1 - w) * BOND_VOL * BOND_VOL +
    2 * w * (1 - w) * EQUITY_BOND_CORRELATION * EQUITY_VOL * BOND_VOL;
  const volatility = Math.sqrt(variance);
  return { expectedReturn, volatility };
}

// Sequence-of-returns crisis parameters
export const CRISIS_RETURN = -0.02;
export const CRISIS_VOL = 0.25;
export const CRISIS_MONTHS = 60; // 5 years

import type { HouseholdConfig, SimulationResult } from "./types";
import {
  createRng,
  createNormalRng,
  percentile,
  computePercentileSeries,
} from "./statistics";
import {
  CRISIS_RETURN,
  CRISIS_VOL,
  CRISIS_MONTHS,
  getIncomeMultiplier,
} from "./constants";

interface SimOptions {
  /** Include property equity in starting wealth */
  includeProperty: boolean;
  /** Number of simulations (overrides config.nSimulations) */
  nSims?: number;
  /** Force bad sequence of returns in first 5 years of retirement */
  forceSequenceRisk?: boolean;
  /** Store full paths for percentile charts (expensive — skip for sensitivity) */
  storePaths?: boolean;
  /** RNG seed */
  seed?: number;
  /** Reference date for mortgage valuation (defaults to now) */
  valuationDate?: Date;
}

/**
 * Run Monte Carlo simulation and return full results.
 */
export function runSimulation(
  config: HouseholdConfig,
  options: SimOptions
): SimulationResult {
  const {
    includeProperty,
    nSims = config.nSimulations,
    forceSequenceRisk = false,
    storePaths = true,
    seed = 42,
    valuationDate = new Date(),
  } = options;

  const monthsToRetirement =
    (config.retirementAge - config.currentAge) * 12;
  const totalMonths = (config.deathAge - config.currentAge) * 12;

  // Monthly log-normal parameters for accumulation phase
  const accumMuMonthly =
    (config.accumReturn - 0.5 * config.accumVol * config.accumVol) / 12;
  const accumSigmaMonthly = config.accumVol / Math.sqrt(12);

  // Monthly log-normal parameters for withdrawal phase
  const withdrawMuMonthly =
    (config.withdrawReturn - 0.5 * config.withdrawVol * config.withdrawVol) /
    12;
  const withdrawSigmaMonthly = config.withdrawVol / Math.sqrt(12);

  // Crisis parameters (for sequence risk)
  const crisisMuMonthly =
    (CRISIS_RETURN - 0.5 * CRISIS_VOL * CRISIS_VOL) / 12;
  const crisisSigmaMonthly = CRISIS_VOL / Math.sqrt(12);

  // Starting wealth — liquid assets only (property tracked separately)
  const startingLiquid = config.liquidAssets;
  const mortgage = computeMortgageSummary(config, valuationDate);
  const startingProperty = includeProperty ? mortgage.currentEquity : 0;
  const txCost = config.propertyTransactionCost;

  // Pre-compute deterministic mortgage amortization schedule.
  // Each entry is the principal portion repaid that month (equity gained).
  // Property equity = 0% real return, 0% volatility — purely illiquid.
  const monthlyMortgageRate = config.mortgageRate / 12;
  // Use the mortgage summary's outstanding balance (derived from known original loan)
  let mortgageBalance = includeProperty ? mortgage.outstandingBalance : 0;

  // Build principal-repayment schedule (deterministic, shared across all sims)
  const principalSchedule = new Float64Array(totalMonths + 1);
  if (includeProperty && mortgageBalance > 0) {
    let bal = mortgageBalance;
    for (let m = 1; m <= totalMonths && bal > 0; m++) {
      if (m > monthsToRetirement) break; // mortgage only accrues equity pre-retirement
      const interest = bal * monthlyMortgageRate;
      let principal = config.monthlyMortgagePayment - interest;
      if (principal > bal) principal = bal; // final payment
      principalSchedule[m] = principal;
      bal -= principal;
    }
  }

  // Storage
  const allPaths: Float64Array[] = storePaths
    ? Array.from({ length: nSims }, () => new Float64Array(totalMonths + 1))
    : [];
  const terminalWealth = new Float64Array(nSims);
  const ruinMonths: (number | null)[] = new Array(nSims).fill(null);
  let successCount = 0;

  // Wealth at retirement for each sim
  const wealthAtRetirement = new Float64Array(nSims);

  // Survival tracking: count solvent sims at each month
  const solventCount = storePaths
    ? new Uint32Array(totalMonths + 1)
    : new Uint32Array(0);

  const rng = createRng(seed);
  const normalRng = createNormalRng(rng);

  for (let sim = 0; sim < nSims; sim++) {
    let w = startingLiquid; // liquid wealth (invested, subject to market returns)
    let propEquity = startingProperty; // illiquid property equity (0% real return, 0% vol)

    if (storePaths) {
      allPaths[sim][0] = w + propEquity;
      solventCount[0]++;
    }

    let ruined = false;

    for (let m = 1; m <= totalMonths; m++) {
      if (ruined) {
        if (storePaths) allPaths[sim][m] = 0;
        continue;
      }

      const isRetired = m > monthsToRetirement;

      // At retirement: downsize — sell property, buy replacement, invest the net
      if (m === monthsToRetirement + 1 && propEquity > 0) {
        const saleProceeds = propEquity * (1 - txCost);
        const netProceeds = Math.max(0, saleProceeds - config.replacementHomeCost);
        w += netProceeds;
        propEquity = 0;
      }

      // Determine monthly parameters
      let mu: number, sigma: number;
      if (
        forceSequenceRisk &&
        isRetired &&
        m - monthsToRetirement <= CRISIS_MONTHS
      ) {
        mu = crisisMuMonthly;
        sigma = crisisSigmaMonthly;
      } else if (isRetired) {
        mu = withdrawMuMonthly;
        sigma = withdrawSigmaMonthly;
      } else {
        mu = accumMuMonthly;
        sigma = accumSigmaMonthly;
      }

      // Apply cash flow first, then returns
      if (isRetired) {
        w -= config.monthlySpending;
      } else {
        let savings = config.monthlySavings;
        if (config.adjustSavingsForAge) {
          const ageAtMonth = config.currentAge + m / 12;
          savings *= getIncomeMultiplier(ageAtMonth, config.currentAge);
        }
        w += savings;

        // Property equity grows by mortgage principal repayment (deterministic)
        propEquity += principalSchedule[m];
      }

      // Log-normal return (only on liquid wealth)
      const z = normalRng();
      const logReturn = mu + sigma * z;
      w *= Math.exp(logReturn);

      const totalWealth = w + propEquity;

      if (totalWealth <= 0) {
        w = 0;
        propEquity = 0;
        ruined = true;
        ruinMonths[sim] = m;
      }

      if (storePaths) {
        allPaths[sim][m] = w + propEquity;
        if (totalWealth > 0) solventCount[m]++;
      }

      // Capture wealth at retirement
      if (m === monthsToRetirement) {
        wealthAtRetirement[sim] = w + propEquity;
      }
    }

    terminalWealth[sim] = w + propEquity;
    if (!ruined) successCount++;
  }

  // Compute outputs
  const successRate = successCount / nSims;

  const sortedTerminal = Float64Array.from(terminalWealth).sort();
  const medianTerminalWealth = percentile(
    sortedTerminal as unknown as number[],
    50
  );
  const p5TerminalWealth = percentile(
    sortedTerminal as unknown as number[],
    5
  );
  const p95TerminalWealth = percentile(
    sortedTerminal as unknown as number[],
    95
  );

  const sortedRetirement = Float64Array.from(wealthAtRetirement).sort();
  const medianWealthAtRetirement = percentile(
    sortedRetirement as unknown as number[],
    50
  );

  // Median ruin age
  const ruinAges = ruinMonths
    .filter((m): m is number => m !== null)
    .map((m) => config.currentAge + m / 12)
    .sort((a, b) => a - b);
  const medianRuinAge =
    ruinAges.length > nSims / 2
      ? percentile(ruinAges, 50)
      : null;

  // Percentile series (only if paths stored)
  let percentileSeries = {
    p5: [] as number[],
    p10: [] as number[],
    p25: [] as number[],
    p50: [] as number[],
    p75: [] as number[],
    p90: [] as number[],
    p95: [] as number[],
  };

  if (storePaths && allPaths.length > 0) {
    const raw = computePercentileSeries(
      allPaths,
      totalMonths,
      [5, 10, 25, 50, 75, 90, 95]
    );
    percentileSeries = {
      p5: raw.p5,
      p10: raw.p10,
      p25: raw.p25,
      p50: raw.p50,
      p75: raw.p75,
      p90: raw.p90,
      p95: raw.p95,
    };
  }

  // Survival curve (yearly)
  const survivalByAge: { age: number; fractionSolvent: number }[] = [];
  if (storePaths) {
    for (
      let age = config.currentAge;
      age <= config.deathAge;
      age++
    ) {
      const monthIdx = (age - config.currentAge) * 12;
      survivalByAge.push({
        age,
        fractionSolvent: solventCount[monthIdx] / nSims,
      });
    }
  }

  return {
    successRate,
    medianTerminalWealth,
    p5TerminalWealth,
    p95TerminalWealth,
    medianWealthAtRetirement,
    medianRuinAge,
    percentileSeries,
    terminalWealth: Array.from(terminalWealth),
    survivalByAge,
    totalMonths,
    retirementMonth: monthsToRetirement,
    valuationDate: valuationDate.toISOString(),
  };
}

/**
 * Quick simulation that returns only success rate.
 * Much faster — no path storage or percentile computation.
 */
export function runSimulationQuick(
  config: HouseholdConfig,
  includeProperty: boolean,
  nSims: number,
  seed: number = 42
): number {
  const result = runSimulation(config, {
    includeProperty,
    nSims,
    storePaths: false,
    seed,
  });
  return result.successRate;
}

/**
 * Binary search for the monthly spending that achieves `targetRate` success.
 */
export function findSafeSpending(
  config: HouseholdConfig,
  includeProperty: boolean,
  targetRate: number,
  nSims: number = 10_000
): number {
  const eqSummary = computeMortgageSummary(config);
  const totalWealth =
    config.liquidAssets + (includeProperty ? eqSummary.currentEquity : 0);
  const drawdownMonths = (config.deathAge - config.retirementAge) * 12;
  let lo = 0;
  let hi = Math.max(
    config.monthlySpending * 3,
    drawdownMonths > 0 ? (totalWealth / drawdownMonths) * 3 : config.monthlySpending * 3
  );

  // Expand hi if success rate at the upper bound still meets the target.
  // At most 5 doublings (32× initial hi) to keep simulation cost bounded.
  for (let exp = 0; exp < 5; exp++) {
    const rate = runSimulationQuick(
      { ...config, monthlySpending: hi },
      includeProperty,
      nSims
    );
    if (rate < targetRate) break;
    hi = Math.min(hi * 2, 1_000_000);
    if (hi >= 1_000_000) break;
  }

  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const rate = runSimulationQuick(
      { ...config, monthlySpending: mid },
      includeProperty,
      nSims
    );
    if (rate >= targetRate) {
      lo = mid;
    } else {
      hi = mid;
    }
    // Stop when precision is within $25/month
    if (hi - lo < 25) break;
  }

  return Math.round(lo / 10) * 10; // round to nearest $10
}

/**
 * Compute remaining mortgage months from a maturity date string (YYYY-MM-DD).
 * Returns 0 if the date is empty, invalid, or in the past.
 * @param valuationDate — reference date (defaults to now); pass a stable date
 *   so saved reports don't drift when re-displayed on a different day.
 */
export function getRemainingMortgageMonths(
  maturityDate: string,
  valuationDate: Date = new Date()
): number {
  if (!maturityDate) return 0;
  const maturity = new Date(maturityDate + "T00:00:00");
  if (isNaN(maturity.getTime())) return 0;

  const months =
    (maturity.getFullYear() - valuationDate.getFullYear()) * 12 +
    (maturity.getMonth() - valuationDate.getMonth());
  return Math.max(0, months);
}

/**
 * Compute months between two date strings (YYYY-MM-DD).
 * Returns 0 if either is empty/invalid.
 */
function monthsBetween(fromDate: string, toDate: string): number {
  if (!fromDate || !toDate) return 0;
  const a = new Date(fromDate + "T00:00:00");
  const b = new Date(toDate + "T00:00:00");
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(0, m);
}

export interface MortgageSummary {
  originalLoan: number;
  outstandingBalance: number;
  currentEquity: number;
  totalTenureMonths: number;
  remainingMonths: number;
  elapsedMonths: number;
}

/**
 * Derive mortgage summary from config inputs.
 * Uses the known original loan amount and forward amortization to compute
 * the outstanding balance, avoiding reverse-computation rounding errors.
 * Property equity = market value − outstanding balance.
 */
export function computeMortgageSummary(
  config: HouseholdConfig,
  valuationDate: Date = new Date()
): MortgageSummary {
  const r = config.mortgageRate / 12;
  const totalTenureMonths = monthsBetween(config.mortgageCommencementDate, config.mortgageMaturityDate);
  const remainingMonths = getRemainingMortgageMonths(config.mortgageMaturityDate, valuationDate);
  const elapsedMonths = totalTenureMonths - remainingMonths;

  const originalLoan = config.originalLoanAmount;

  // Outstanding balance via the retrospective formula:
  // B_t = P(1+r)^t − M × [(1+r)^t − 1] / r
  let outstandingBalance = 0;
  if (originalLoan > 0 && elapsedMonths > 0) {
    if (r > 0) {
      const factor = Math.pow(1 + r, elapsedMonths);
      outstandingBalance = originalLoan * factor -
        config.monthlyMortgagePayment * (factor - 1) / r;
    } else {
      // 0% interest
      outstandingBalance = originalLoan - config.monthlyMortgagePayment * elapsedMonths;
    }
    outstandingBalance = Math.max(0, outstandingBalance);
  } else if (originalLoan > 0 && elapsedMonths === 0) {
    outstandingBalance = originalLoan;
  }

  const currentEquity = Math.max(0, config.propertyValue - outstandingBalance);

  return {
    originalLoan,
    outstandingBalance,
    currentEquity,
    totalTenureMonths,
    remainingMonths,
    elapsedMonths,
  };
}

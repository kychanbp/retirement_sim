import Link from "next/link";

export const metadata = {
  title: "Methodology — Household Retirement Simulator",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          &larr; Back to simulator
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-2">
          Methodology
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          How the simulation works, what it assumes, and how to interpret the
          results.
        </p>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="1. Overview">
          <p>
            This tool runs a <strong>Monte Carlo simulation</strong> to answer a
            single question:
          </p>
          <Quote>
            If our household maintains its current spending level
            (inflation-adjusted) and withdraws from the shared portfolio
            starting at retirement, what is the probability that the money
            lasts until our planning horizon?
          </Quote>
          <p>
            It simulates thousands of possible futures by randomly sampling
            investment returns each month. Some futures are lucky (bull markets
            early on), others are unlucky (crashes right after retirement). The
            fraction of futures where wealth never hits zero is the{" "}
            <strong>probability of success</strong>.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="2. What Is (and Isn't) in the Simulation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <H4>Included</H4>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Shared liquid assets (savings, investments)</li>
                <li>Monthly savings into the shared pool</li>
                <li>Monthly spending from the shared pool</li>
                <li>Property equity and mortgage amortization (Option C)</li>
                <li>Downsizing at retirement (Option C)</li>
                <li>Income lifecycle scaling (optional)</li>
              </ul>
            </div>
            <div>
              <H4>Excluded</H4>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>CPF, SRS (individual retirement accounts)</li>
                <li>Rental income</li>
                <li>Insurance payouts or annuities</li>
                <li>Taxes on investment returns</li>
                <li>Post-retirement housing costs (rent)</li>
              </ul>
            </div>
          </div>
          <p className="mt-3">
            The simulation focuses on the shared household investment portfolio.
            Monthly savings should be entered <strong>net of all expenses</strong>{" "}
            including mortgage payments — the mortgage inputs are used solely to
            model equity accumulation, not as a cash outflow.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="3. Option A vs Option C">
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-3">
              <H4>Option A — Liquid Assets Only (Conservative)</H4>
              <p className="text-sm">
                Only liquid assets are considered. All property-related inputs
                (equity, mortgage, downsizing) are ignored. A single wealth pool
                grows by savings and market returns during accumulation, then
                shrinks by spending during withdrawal.
              </p>
              <p className="text-sm mt-1 text-gray-500">
                This answers:{" "}
                <em>
                  &ldquo;Using only money we can freely invest and draw down,
                  are we on track?&rdquo;
                </em>
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <H4>Option C — Including Property Equity (Comprehensive)</H4>
              <p className="text-sm">
                Tracks <strong>two separate pools</strong> during accumulation:
              </p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                <li>
                  <strong>Liquid pool</strong> — savings and investments,
                  subject to market returns (same as Option A).
                </li>
                <li>
                  <strong>Illiquid pool</strong> — property equity, growing
                  deterministically via mortgage principal repayment (0% real
                  return, 0% volatility).
                </li>
              </ul>
              <p className="text-sm mt-2">
                At retirement, the property is sold, a replacement home is
                purchased, and only the <strong>net proceeds</strong> (after
                transaction costs and replacement cost) are merged into the
                liquid portfolio for the withdrawal phase.
              </p>
              <p className="text-sm mt-1 text-gray-500">
                This answers:{" "}
                <em>
                  &ldquo;If we downsize at retirement and invest the proceeds,
                  are we on track?&rdquo;
                </em>
              </p>
            </div>
          </div>
          <p className="mt-3">
            The gap between Option A and C shows how much retirement confidence
            depends on illiquid property wealth. A large gap signals{" "}
            <strong>liquidity risk</strong> — the plan relies on successfully
            monetising property at the right time.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="4. Property Equity Model (Option C)">
          <p>
            Property is treated as a{" "}
            <strong>separate illiquid asset class</strong> with distinct
            characteristics:
          </p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>
              <strong>Real return: 0%</strong> — property value is assumed to
              keep pace with inflation but not outperform it. This is a
              conservative simplification for owner-occupied housing.
            </li>
            <li>
              <strong>Volatility: 0%</strong> — property value is deterministic
              (no random fluctuations). In reality property values fluctuate,
              but over long horizons the 0% real return approximation holds
              reasonably.
            </li>
            <li>
              <strong>Equity growth via mortgage amortization</strong> — each
              month during accumulation, the principal portion of the mortgage
              payment is added to property equity. Once the mortgage is fully
              paid off, equity stops growing.
            </li>
          </ul>

          <H4>Mortgage Amortization</H4>
          <p>
            The user enters the original loan principal (P), monthly payment
            (M), annual interest rate, and the commencement and maturity dates.
            The outstanding balance is computed via the retrospective formula:
          </p>
          <pre className="bg-gray-100 rounded p-3 text-xs mt-2 overflow-x-auto">
{`Outstanding balance (retrospective):
  B_t = P(1+r)^t − M × [(1+r)^t − 1] / r
  where t = elapsed months since commencement, r = annual rate / 12

Property equity = market value − outstanding balance

Each month during accumulation (simulation):
  interest(t)  = balance(t) × r
  principal(t) = M − interest(t)
  balance(t+1) = balance(t) − principal(t)
  equity(t+1)  = equity(t) + principal(t)`}
          </pre>
          <p className="mt-2">
            Early payments are mostly interest; the principal portion grows over
            the life of the loan. If the mortgage term is shorter than the years
            to retirement, the mortgage is fully paid off mid-accumulation and
            equity simply sits as illiquid wealth until retirement.
          </p>

          <H4>Downsizing at Retirement</H4>
          <p>
            At the first month of retirement, the property is sold and a
            replacement home is purchased (e.g., downsizing from a private
            condo to an HDB flat). Only the net proceeds flow into the
            investment portfolio:
          </p>
          <pre className="bg-gray-100 rounded p-3 text-xs mt-2 overflow-x-auto">
{`sale_proceeds = property_equity × (1 − transaction_cost)
net_proceeds  = max(0, sale_proceeds − replacement_home_cost)
liquid_wealth += net_proceeds`}
          </pre>
          <p className="mt-2">
            The <strong>transaction cost</strong> (default 2%) covers agent
            commissions, stamp duty, legal fees, and other selling costs in
            Singapore. The <strong>replacement home cost</strong> is what the
            household expects to pay for their next home. If the replacement
            cost exceeds sale proceeds, net proceeds are floored at zero — no
            debt is created.
          </p>
          <p className="mt-2 text-gray-500">
            After downsizing, the net proceeds join the liquid pool and are
            invested in the withdrawal-phase portfolio, subject to market
            returns and spending withdrawals like any other liquid wealth.
          </p>

          <H4>No Property (Fully Paid Off or None)</H4>
          <p>
            If the user enters property equity but no mortgage (payment = 0,
            term = 0), the existing equity is held as illiquid and downsized at
            retirement as normal — there is simply no additional equity growth.
            If property equity itself is zero, Option C behaves identically to
            Option A.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="5. Income Lifecycle Adjustment">
          <p>
            By default, the simulation scales monthly savings over the
            accumulation phase using Singapore&apos;s{" "}
            <strong>median income-by-age profile</strong> from the Ministry of
            Manpower (MOM) Table 75 — Full-Time Employed Residents, Median
            Gross Monthly Income Excluding Employer CPF Contributions.
          </p>
          <p>
            The profile is derived by averaging the 2021–2025 data across five
            age bands:
          </p>
          <table className="w-full text-sm mt-3 mb-3 border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2 pr-4">Age Band</th>
                <th className="text-left py-2 pr-4">Midpoint</th>
                <th className="text-left py-2">Avg Median Income</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4">15–29</td>
                <td className="py-2 pr-4">22</td>
                <td className="py-2">$3,497</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4">30–39</td>
                <td className="py-2 pr-4">35</td>
                <td className="py-2">$5,392</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4">40–49</td>
                <td className="py-2 pr-4">45</td>
                <td className="py-2">$6,108 (peak)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4">50–59</td>
                <td className="py-2 pr-4">55</td>
                <td className="py-2">$4,577</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">60 &amp; over</td>
                <td className="py-2 pr-4">65</td>
                <td className="py-2">$2,670</td>
              </tr>
            </tbody>
          </table>
          <p>
            Income at each age is interpolated linearly between band midpoints.
            A multiplier is computed relative to the user&apos;s current age:
          </p>
          <Formula>
            {"multiplier(age) = income(age) / income(current_age)"}
          </Formula>
          <Formula>
            {"savings(age) = entered_savings × multiplier(age)"}
          </Formula>
          <p>
            At your current age the multiplier is 1.0. If you are 35, savings
            rise ~13% by age 45 (peak income), then decline as income falls in
            the 50s and 60s. This can be disabled via the checkbox on the input
            form, reverting to flat (constant) monthly savings.
          </p>
          <p className="mt-2 text-gray-500">
            <strong>Caveats:</strong> This is cross-sectional data (different
            people at one point in time), not longitudinal. Savings are assumed
            to scale proportionally with income. Individual trajectories may
            differ by occupation, education, and sector.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="6. Return Model">
          <p>
            Investment returns are modeled as{" "}
            <strong>log-normal random variables</strong>, the standard approach
            in financial modeling. This prevents wealth from going negative from
            a single month&apos;s return and captures the skewed nature of
            compounded returns.
          </p>
          <pre className="bg-gray-100 rounded p-3 text-xs mt-2 overflow-x-auto">
{`Monthly log-return:  log_r ~ N(μ_monthly, σ_monthly²)

  μ_monthly = (μ_annual − 0.5 × σ_annual²) / 12
  σ_monthly = σ_annual / √12`}
          </pre>
          <p className="mt-2">
            The &minus;0.5&sigma;&sup2; adjustment (Ito&apos;s lemma) converts
            from the arithmetic mean to the geometric mean, which is what
            determines long-run compound growth. Returns are applied to{" "}
            <strong>liquid wealth only</strong> — property equity is not subject
            to market fluctuations.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="7. Wealth Evolution">
          <p>
            Each month, <strong>liquid</strong> wealth is updated in two steps:
            apply cash flow, then apply the random return.
          </p>
          <div className="space-y-2 mt-3">
            <div className="border-l-4 border-blue-400 pl-3">
              <H4>Accumulation Phase (current age to retirement)</H4>
              <Formula>
                {"W_liquid(t+1) = (W_liquid(t) + savings(age)) × exp(log_r)"}
              </Formula>
              <p className="text-xs text-gray-500 mt-1">
                Where savings(age) = entered_savings &times;
                income_multiplier(age) when lifecycle adjustment is enabled, or
                simply entered_savings when disabled.
              </p>
            </div>
            <div className="border-l-4 border-orange-400 pl-3">
              <H4>Withdrawal Phase (retirement to planning horizon)</H4>
              <Formula>
                {"W_liquid(t+1) = (W_liquid(t) − monthly_spending) × exp(log_r)"}
              </Formula>
            </div>
          </div>

          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <strong>Option C — two-pool tracking:</strong> During accumulation,
            property equity evolves in parallel via a separate deterministic
            rule (mortgage principal repayment — see section 4). Charts and
            outputs show <strong>total wealth</strong> (liquid + property) at
            each time step. At retirement, property is downsized and net
            proceeds are merged into the liquid pool before the withdrawal
            phase begins.
          </div>

          <H4>Ruin Condition</H4>
          <p>
            If total wealth (liquid + property) falls to zero or below at any
            month, the simulation path has <strong>failed</strong>. All values
            are in <strong>real (today&apos;s) dollars</strong> — monthly
            spending stays constant because inflation is already embedded in the
            real return.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="8. Two-Stage Glide Path">
          <p>
            The liquid portfolio shifts from a growth-oriented allocation during
            accumulation to a more conservative one during withdrawal. The
            switch occurs instantly at retirement.
          </p>
          <table className="w-full text-sm mt-3 border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2 pr-4">Phase</th>
                <th className="text-left py-2 pr-4">Default Allocation</th>
                <th className="text-left py-2 pr-4">Real Return (&#956;)</th>
                <th className="text-left py-2">Volatility (&#963;)</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4">Accumulation</td>
                <td className="py-2 pr-4">80% equity / 20% bond</td>
                <td className="py-2 pr-4">4.3%</td>
                <td className="py-2">12.9%</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Withdrawal</td>
                <td className="py-2 pr-4">60% equity / 40% bond</td>
                <td className="py-2 pr-4">3.6%</td>
                <td className="py-2">9.9%</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3">
            The user sets the equity allocation for each phase. The expected
            return and volatility are automatically derived from the
            underlying asset class assumptions (see below). This ensures the
            portfolio parameters stay consistent with the chosen allocation.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="9. Portfolio Parameter Sources">
          <p>
            Portfolio return and volatility are automatically computed from the
            equity allocation using these underlying asset class assumptions:
          </p>
          <table className="w-full text-sm mt-3 border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2 pr-4">Asset Class</th>
                <th className="text-left py-2 pr-4">Expected Real Return</th>
                <th className="text-left py-2">Std Deviation</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4">Global Equities</td>
                <td className="py-2 pr-4">5.0%</td>
                <td className="py-2">16.1%</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Global Bonds</td>
                <td className="py-2 pr-4">1.5%</td>
                <td className="py-2">5.7%</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3">Blended using:</p>
          <Formula>
            {"μ_portfolio = w × μ_equity + (1−w) × μ_bond"}
          </Formula>
          <Formula>
            {"σ_portfolio = √(w²σ_e² + (1−w)²σ_b²)"}
          </Formula>
          <p>
            Equity-bond correlation is assumed to be zero. When the user
            changes the equity allocation slider, the return and volatility
            fields update automatically. For example, 80/20 yields 4.3%
            return / 12.9% vol; 60/40 yields 3.6% / 9.9%.
          </p>
          <p className="mt-2 text-gray-500">
            Sources: DMS Global Returns Yearbook 1900–2024, Vanguard VCMM,
            Research Affiliates, AQR, and JP Morgan Long-Term Capital Market
            Assumptions.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="10. Success Criterion">
          <p>
            A simulation path <strong>succeeds</strong> if total wealth remains
            above zero for every month from retirement to the planning horizon.
          </p>
          <Formula>
            {"P(success) = count(successful paths) / total simulations"}
          </Formula>
          <p>
            By default, 10,000 simulations are run, giving a standard error of
            roughly &plusmn;0.5 percentage points on the success probability.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="11. Sensitivity Analysis">
          <p>
            Four two-dimensional sensitivity tables vary pairs of parameters
            while holding all others at their base values. Both Option A and
            Option C tables are computed independently.
          </p>
          <ol className="list-decimal list-inside text-sm space-y-2 mt-2">
            <li>
              <strong>Spending &times; Real Return</strong> — 7 spending levels
              (&minus;30% to +30%) &times; 5 return pairs. How much do market
              returns matter?
            </li>
            <li>
              <strong>Spending &times; Retirement Age</strong> — 7 spending
              levels &times; 7 retirement age offsets (&minus;5 to +5 years).
              Each extra year of work has a double impact: one more year of
              saving, one fewer year of withdrawing.
            </li>
            <li>
              <strong>Spending &times; Volatility</strong> — 7 spending levels
              &times; 5 volatility pairs. How much does market turbulence hurt?
            </li>
            <li>
              <strong>Return &times; Volatility</strong> — 5 return pairs
              &times; 5 volatility pairs. What risk-return combination is
              needed?
            </li>
          </ol>
          <p className="mt-3">
            Each cell runs 2,000 simulations for speed. Cell colours indicate
            confidence: dark green (&ge;95%), light green (90–95%),
            yellow-green (80–90%), yellow (70–80%), orange (50–70%), red
            (&lt;50%).
          </p>
          <p className="mt-2 text-gray-500">
            When retirement age changes in the sensitivity table, the mortgage
            amortization schedule adapts accordingly — an earlier retirement
            means fewer months of principal repayment before downsizing.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="12. Safe Spending Search">
          <p>
            A binary search finds the maximum monthly spending that achieves a
            target success rate (90% and 95%). This is the household&apos;s
            personalised equivalent of the &ldquo;4% rule.&rdquo;
          </p>
          <p>
            The search runs up to 20 iterations, converging to within $25/month
            precision, then rounds to the nearest $10. The search range upper
            bound is the larger of 3&times; the entered spending or 3&times; a
            simple drawdown estimate (total wealth &divide; withdrawal months),
            ensuring it finds the correct value even when property equity is
            large.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="13. Sequence-of-Returns Risk">
          <p>
            This stress test forces the first 5 years (60 months) of retirement
            to use crisis parameters:
          </p>
          <pre className="bg-gray-100 rounded p-3 text-xs mt-2 overflow-x-auto">
{`Crisis parameters (first 60 months of retirement):
  μ = −2%  (negative real returns)
  σ = 25%  (high volatility)

After month 60: normal withdrawal-phase parameters resume.`}
          </pre>
          <p className="mt-2">
            The drop in success probability measures how vulnerable the plan is
            to bad timing. This is the most dangerous scenario for retirees —
            withdrawals during a market drawdown lock in losses permanently.
          </p>
          <p className="mt-2 text-gray-500">
            In Option C, property equity has already been downsized and merged
            into liquid wealth before the crisis begins, so the crisis returns
            affect the full combined pool.
          </p>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="14. Visualisations">
          <div className="space-y-3">
            <div>
              <H4>Fan Chart (Wealth Over Time)</H4>
              <p className="text-sm">
                Shows the 5th, 10th, 25th, 50th (median), 75th, 90th, and 95th
                percentile of <strong>total wealth</strong> (liquid + property
                in Option C) across all simulations at each age. Darker bands
                are more likely. A vertical line marks retirement age. In
                Option C, a small dip at retirement reflects the transaction
                cost and replacement home purchase.
              </p>
            </div>
            <div>
              <H4>Terminal Wealth Histogram</H4>
              <p className="text-sm">
                Distribution of final wealth at the planning horizon. Red bars
                indicate paths where wealth reached zero (ruin). The histogram
                is capped at the 95th percentile to avoid distortion from
                extreme outliers.
              </p>
            </div>
            <div>
              <H4>Survival Curve</H4>
              <p className="text-sm">
                Percentage of simulation paths still solvent at each age. A flat
                line at 100% during accumulation is expected (savings keep
                wealth positive). The decline after retirement shows when ruin
                typically occurs. Reference lines at 90% and 95% help gauge
                confidence thresholds.
              </p>
            </div>
          </div>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="15. Interpreting the Results">
          <div className="space-y-3 text-sm">
            <div>
              <H4>1. Most Sensitive Variable</H4>
              <p>
                Which parameter swings probability the most across the
                sensitivity tables? Typical ranking: retirement age &gt;
                spending &gt; return &gt; volatility.
              </p>
            </div>
            <div>
              <H4>2. Safety Margin</H4>
              <p>
                How far can you move from the base case before success drops
                below 80%? Large gap = robust plan. Small gap = fragile.
              </p>
            </div>
            <div>
              <H4>3. Option A vs C Gap</H4>
              <p>
                A large gap means the plan leans heavily on property wealth.
                Consider: what if property prices fall, or downsizing takes
                longer than planned?
              </p>
            </div>
            <div>
              <H4>4. Sequence Risk Drop</H4>
              <p>
                A drop greater than 10 percentage points under the sequence
                stress test suggests the plan is vulnerable to bad timing at
                retirement. Consider a larger cash buffer or more conservative
                early-retirement allocation.
              </p>
            </div>
          </div>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="16. Limitations and Assumptions">
          <ul className="list-disc list-inside text-sm space-y-2">
            <li>
              <strong>Log-normal returns</strong> — Real markets have fatter
              tails (more extreme crashes and booms) than the log-normal model
              predicts. This simulation may underestimate tail risk.
            </li>
            <li>
              <strong>Fixed spending</strong> — Retirees typically adjust
              spending in response to market conditions. This fixed-spending
              model is conservative (most people would cut back before hitting
              zero).
            </li>
            <li>
              <strong>No taxes</strong> — Investment returns and withdrawals may
              be subject to taxes depending on account type and jurisdiction.
            </li>
            <li>
              <strong>No inflation uncertainty</strong> — Real returns embed an
              assumed inflation rate. Actual inflation may differ, affecting
              purchasing power.
            </li>
            <li>
              <strong>Instant allocation shift</strong> — The model switches
              portfolio allocation at retirement. In practice, a gradual glide
              path over several years is more common.
            </li>
            <li>
              <strong>No correlation regime changes</strong> — The equity-bond
              correlation is assumed constant. In crises, correlations often
              spike.
            </li>
            <li>
              <strong>Single life model</strong> — Uses one age for timing.
              For couples with different ages, use the younger spouse&apos;s age.
            </li>
            <li>
              <strong>Property: 0% real return</strong> — Property values may
              outpace or underperform inflation. The 0% real return is a
              conservative simplification for owner-occupied housing in
              Singapore.
            </li>
            <li>
              <strong>Property: deterministic equity growth</strong> — The
              model ignores property price volatility. The actual sale price at
              retirement could differ from the projected equity.
            </li>
            <li>
              <strong>Transaction cost on equity, not gross value</strong> — The
              2% transaction cost is applied to net equity rather than the
              gross property value. This slightly overestimates proceeds for
              those still carrying a mortgage at retirement, but the difference
              is small for most scenarios.
            </li>
            <li>
              <strong>No post-downsizing housing costs</strong> — After
              selling and buying the replacement home, the model does not track
              ongoing housing expenses (e.g., maintenance, property tax). These
              should be factored into the monthly spending input.
            </li>
            <li>
              <strong>Mortgage truncated at retirement</strong> — If the
              mortgage term extends past retirement, only the principal repaid
              up to retirement is counted. Remaining mortgage payments are not
              modelled. This assumes the mortgage is settled from the sale
              proceeds.
            </li>
          </ul>
        </Section>

        {/* ─────────────────────────────────────────────────────────── */}
        <Section title="17. Technical Details">
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>
              Random numbers: Mulberry32 seeded PRNG with Box-Muller transform
              for normal variates (seed = 42)
            </li>
            <li>
              Default: 10,000 simulations for core analysis; 2,000 per cell for
              sensitivity tables; 5,000 per iteration for safe spending search
            </li>
            <li>
              All computation runs client-side in a Web Worker — no data leaves
              your browser
            </li>
            <li>
              Monthly time steps for precise cash-flow timing
            </li>
            <li>
              Safe spending: binary search, up to 20 iterations, $25
              convergence tolerance, rounded to nearest $10
            </li>
            <li>
              Mortgage amortization: pre-computed once per simulation call
              (deterministic schedule shared across all Monte Carlo paths)
            </li>
            <li>
              Inputs are persisted in sessionStorage; saved reports use
              localStorage with automatic field migration for schema changes
            </li>
          </ul>
        </Section>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            &larr; Back to simulator
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─── Reusable sub-components ──────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-gray-800 mb-3">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold text-gray-700 mb-1">{children}</h4>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 rounded px-3 py-2 font-mono text-xs my-2 overflow-x-auto">
      {children}
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-4 border-blue-400 pl-3 italic text-gray-600 my-3">
      {children}
    </blockquote>
  );
}

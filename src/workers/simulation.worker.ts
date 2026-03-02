import { runSimulation, findSafeSpending } from "../lib/simulation";
import { buildSensitivityTables } from "../lib/sensitivity";
import type {
  HouseholdConfig,
  FullResults,
  WorkerRequest,
  WorkerResponse,
  SequenceRiskResult,
} from "../lib/types";

declare const self: DedicatedWorkerGlobalScope;

function post(msg: WorkerResponse) {
  self.postMessage(msg);
}

function progress(phase: string, percent: number, detail: string) {
  post({ type: "PROGRESS", phase, percent, detail });
}

function runFullPipeline(config: HouseholdConfig) {
  const startTime = performance.now();
  const valuationDate = new Date(); // capture once so all phases use the same date

  // Phase 1: Core simulations
  progress("core", 0, "Running Option A simulation...");
  const optionA = runSimulation(config, {
    includeProperty: false,
    storePaths: true,
    valuationDate,
  });

  progress("core", 50, "Running Option C simulation...");
  const optionC = runSimulation(config, {
    includeProperty: true,
    storePaths: true,
    valuationDate,
  });
  progress("core", 100, "Core simulations complete");

  // Phase 2: Sensitivity tables
  progress("sensitivity", 0, "Computing sensitivity tables...");
  const sensitivityA = buildSensitivityTables(config, false, (p, d) => {
    progress("sensitivity", Math.round(p * 0.5), d);
  });
  const sensitivityC = buildSensitivityTables(config, true, (p, d) => {
    progress("sensitivity", 50 + Math.round(p * 0.5), d);
  });
  progress("sensitivity", 100, "Sensitivity analysis complete");

  // Phase 3: Safe spending search
  progress("safespending", 0, "Finding safe spending levels...");
  const safeSpendingA = {
    confidence90: findSafeSpending(config, false, 0.9, 5_000),
    confidence95: findSafeSpending(config, false, 0.95, 5_000),
  };
  progress("safespending", 50, "Option A safe spending found");

  const safeSpendingC = {
    confidence90: findSafeSpending(config, true, 0.9, 5_000),
    confidence95: findSafeSpending(config, true, 0.95, 5_000),
  };
  progress("safespending", 100, "Safe spending analysis complete");

  // Phase 4: Sequence-of-returns risk
  progress("sequence", 0, "Testing sequence-of-returns risk...");
  const stressedA = runSimulation(config, {
    includeProperty: false,
    storePaths: false,
    forceSequenceRisk: true,
    valuationDate,
  });
  const sequenceRiskA: SequenceRiskResult = {
    normalSuccessRate: optionA.successRate,
    stressedSuccessRate: stressedA.successRate,
    drop: optionA.successRate - stressedA.successRate,
  };

  const stressedC = runSimulation(config, {
    includeProperty: true,
    storePaths: false,
    forceSequenceRisk: true,
    valuationDate,
  });
  const sequenceRiskC: SequenceRiskResult = {
    normalSuccessRate: optionC.successRate,
    stressedSuccessRate: stressedC.successRate,
    drop: optionC.successRate - stressedC.successRate,
  };
  progress("sequence", 100, "Sequence risk analysis complete");

  const computeTimeMs = Math.round(performance.now() - startTime);

  const fullResults: FullResults = {
    optionA,
    optionC,
    sensitivityA,
    sensitivityC,
    safeSpendingA,
    safeSpendingC,
    sequenceRiskA,
    sequenceRiskC,
    config,
    computeTimeMs,
  };

  post({ type: "RESULT", data: fullResults });
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === "RUN_FULL") {
    try {
      runFullPipeline(msg.config);
    } catch (err) {
      post({
        type: "ERROR",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
};

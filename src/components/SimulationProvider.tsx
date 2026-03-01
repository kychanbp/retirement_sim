"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import type {
  HouseholdConfig,
  FullResults,
  WorkerProgress,
  WorkerResponse,
} from "../lib/types";

interface SimulationContextValue {
  results: FullResults | null;
  progress: WorkerProgress | null;
  isRunning: boolean;
  error: string | null;
  run: (config: HouseholdConfig) => void;
  cancel: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function useSimulationContext(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulationContext must be used within SimulationProvider");
  return ctx;
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [results, setResults] = useState<FullResults | null>(null);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const run = useCallback((config: HouseholdConfig) => {
    workerRef.current?.terminate();
    setIsRunning(true);
    setResults(null);
    setProgress(null);
    setError(null);

    const worker = new Worker(
      new URL("../workers/simulation.worker.ts", import.meta.url)
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      switch (msg.type) {
        case "PROGRESS":
          setProgress(msg);
          break;
        case "RESULT":
          setResults(msg.data);
          setIsRunning(false);
          setProgress(null);
          worker.terminate();
          break;
        case "ERROR":
          setError(msg.message);
          setIsRunning(false);
          setProgress(null);
          worker.terminate();
          break;
      }
    };

    worker.onerror = (err) => {
      setError(err.message || "Worker crashed");
      setIsRunning(false);
      setProgress(null);
    };

    worker.postMessage({ type: "RUN_FULL", config });
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setIsRunning(false);
    setProgress(null);
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <SimulationContext.Provider
      value={{ results, progress, isRunning, error, run, cancel }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

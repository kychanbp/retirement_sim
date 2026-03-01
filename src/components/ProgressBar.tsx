"use client";

import type { WorkerProgress } from "../lib/types";

interface ProgressBarProps {
  progress: WorkerProgress | null;
  onCancel: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  core: "Core Simulations",
  sensitivity: "Sensitivity Analysis",
  safespending: "Safe Spending Search",
  sequence: "Sequence Risk Test",
};

export function ProgressBar({ progress, onCancel }: ProgressBarProps) {
  const phase = progress ? PHASE_LABELS[progress.phase] || progress.phase : "Initializing...";
  const percent = progress?.percent ?? 0;

  return (
    <div className="w-full rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-900">{phase}</span>
        <button
          onClick={onCancel}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Cancel
        </button>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {progress?.detail && (
        <p className="text-xs text-blue-700 mt-1">{progress.detail}</p>
      )}
    </div>
  );
}

"use client";

import { SimulationProvider } from "./SimulationProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <SimulationProvider>{children}</SimulationProvider>;
}

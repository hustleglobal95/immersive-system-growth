"use client";

import { createContext, useContext, type ReactNode } from "react";
import { experience as productionExperience } from "@/src/lib/experience";
import type { ExperienceConfig } from "@/src/types/experience";

const ExperienceConfigContext = createContext<ExperienceConfig>(productionExperience);

export function ExperienceConfigProvider({
  value,
  children,
}: {
  value: ExperienceConfig;
  children: ReactNode;
}) {
  return <ExperienceConfigContext.Provider value={value}>{children}</ExperienceConfigContext.Provider>;
}

export function useExperienceConfig() {
  return useContext(ExperienceConfigContext);
}

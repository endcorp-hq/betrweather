// src/contexts/PrivyProfileSetupProvider.tsx
import React, { createContext, useContext } from "react";
import { usePrivyProfileSetup } from "../hooks/usePrivyProfileSetup";

interface PrivyProfileSetupContextType {
  isSetupComplete: boolean;
  isLoading: boolean;
  setupError: string | null;
}

const PrivyProfileSetupContext = createContext<PrivyProfileSetupContextType | null>(null);

export function PrivyProfileSetupProvider({ children }: { children: React.ReactNode }) {
  // This hook runs the profile setup logic - only called once at top level
  const profileSetup = usePrivyProfileSetup();

  return (
    <PrivyProfileSetupContext.Provider value={profileSetup}>
      {children}
    </PrivyProfileSetupContext.Provider>
  );
}

export function usePrivyProfileSetupContext() {
  const context = useContext(PrivyProfileSetupContext);
  if (!context) {
    throw new Error("usePrivyProfileSetupContext must be used within PrivyProfileSetupProvider");
  }
  return context;
}


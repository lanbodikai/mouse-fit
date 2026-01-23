"use client";

import { createContext, useContext, ReactNode } from "react";
import { useVideoTransitionRouter } from "@/hooks/useVideoTransitionRouter";
import { TransitionOverlay } from "@/components/landing/TransitionOverlay";

interface TransitionContextType {
  navigateWithTransition: (route: string, customTransitionSrc?: string) => void;
  isTransitioning: boolean;
}

const TransitionContext = createContext<TransitionContextType | null>(null);

export function useTransition() {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error("useTransition must be used within a TransitionProvider");
  }
  return context;
}

interface TransitionProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the app and handles video transitions.
 * Place this in your layout to enable transitions between all child routes.
 */
export function TransitionProvider({ children }: TransitionProviderProps) {
  const {
    navigateWithTransition,
    transitionState,
    completeTransition,
    isTransitioning,
  } = useVideoTransitionRouter();

  return (
    <TransitionContext.Provider value={{ navigateWithTransition, isTransitioning }}>
      {children}
      <TransitionOverlay
        src={transitionState.transitionSrc}
        isVisible={transitionState.isTransitioning}
        onTransitionComplete={completeTransition}
      />
    </TransitionContext.Provider>
  );
}

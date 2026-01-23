"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ROUTE_TRANSITIONS } from "@/config/media";

interface TransitionState {
  isTransitioning: boolean;
  transitionSrc: string;
  targetRoute: string;
}

/**
 * Hook for managing video transitions between routes.
 * 
 * Usage:
 * const { navigateWithTransition, transitionState, completeTransition } = useVideoTransitionRouter();
 * 
 * onClick={() => navigateWithTransition("/about")}
 */
export function useVideoTransitionRouter() {
  const router = useRouter();
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isTransitioning: false,
    transitionSrc: "",
    targetRoute: "",
  });
  const isNavigating = useRef(false);

  const navigateWithTransition = useCallback(
    (route: string, customTransitionSrc?: string) => {
      // Prevent multiple simultaneous navigations
      if (isNavigating.current) return;
      isNavigating.current = true;

      const transitionSrc = customTransitionSrc ?? ROUTE_TRANSITIONS[route] ?? "";

      setTransitionState({
        isTransitioning: true,
        transitionSrc,
        targetRoute: route,
      });
    },
    []
  );

  const completeTransition = useCallback(() => {
    const { targetRoute } = transitionState;
    
    // Navigate to the new route
    if (targetRoute) {
      router.push(targetRoute);
    }

    // Small delay before hiding overlay to ensure new page is rendered
    setTimeout(() => {
      setTransitionState({
        isTransitioning: false,
        transitionSrc: "",
        targetRoute: "",
      });
      isNavigating.current = false;
    }, 100);
  }, [router, transitionState]);

  return {
    navigateWithTransition,
    transitionState,
    completeTransition,
    isTransitioning: transitionState.isTransitioning,
  };
}

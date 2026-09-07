"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type TouchEvent,
  type WheelEvent,
} from "react";

type LayerGestureOptions = {
  onRemove: () => void;
  onRestore: () => void;
};

export function useLayerGestures({ onRemove, onRestore }: LayerGestureOptions) {
  const accumulatedWheel = useRef(0);
  const wheelLocked = useRef(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
    },
    [],
  );

  const performGesture = (direction: "up" | "down") => {
    if (direction === "up") onRemove();
    else onRestore();
  };

  return {
    onWheel: (event: WheelEvent<HTMLElement>) => {
      event.preventDefault();
      if (wheelLocked.current) return;

      accumulatedWheel.current += event.deltaY;
      if (Math.abs(accumulatedWheel.current) < 34) return;

      performGesture(accumulatedWheel.current < 0 ? "up" : "down");
      accumulatedWheel.current = 0;
      wheelLocked.current = true;
      wheelTimer.current = setTimeout(() => {
        wheelLocked.current = false;
      }, 320);
    },
    onTouchStart: (event: TouchEvent<HTMLElement>) => {
      touchStartY.current = event.touches[0]?.clientY ?? null;
      touchCurrentY.current = touchStartY.current;
    },
    onTouchMove: (event: TouchEvent<HTMLElement>) => {
      touchCurrentY.current = event.touches[0]?.clientY ?? touchCurrentY.current;
    },
    onTouchEnd: () => {
      if (touchStartY.current == null || touchCurrentY.current == null) return;
      const distance = touchCurrentY.current - touchStartY.current;
      if (Math.abs(distance) >= 36) performGesture(distance < 0 ? "up" : "down");
      touchStartY.current = null;
      touchCurrentY.current = null;
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      if (event.repeat) return;
      performGesture(event.key === "ArrowUp" ? "up" : "down");
    },
  };
}

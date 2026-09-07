"use client";

import { useEffect, useRef } from "react";

const pendingDisposals = new WeakMap<object, number>();

export function useDeferredDispose<T extends object>(
  resource: T,
  dispose: (resource: T) => void,
) {
  const disposeRef = useRef(dispose);

  useEffect(() => {
    disposeRef.current = dispose;
  }, [dispose]);

  useEffect(() => {
    const pendingDisposal = pendingDisposals.get(resource);
    if (pendingDisposal !== undefined) {
      window.clearTimeout(pendingDisposal);
      pendingDisposals.delete(resource);
    }

    return () => {
      const timeoutId = window.setTimeout(() => {
        pendingDisposals.delete(resource);
        disposeRef.current(resource);
      }, 0);
      pendingDisposals.set(resource, timeoutId);
    };
  }, [resource]);
}

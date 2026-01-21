"use client";

import { useEffect } from "react";
import { buildBestMouseFromStorage, reportStore } from "@/lib/reportStore";

export default function ReportStoreSync() {
  useEffect(() => {
    reportStore.setBestMouse(buildBestMouseFromStorage());
  }, []);

  return null;
}

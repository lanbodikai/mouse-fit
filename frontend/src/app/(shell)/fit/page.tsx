"use client";

import { ShellNav } from "@/components/shell/ShellNav";
import FitWizard from "@/components/shell/fit/FitWizard";

export default function FitPage() {
  return (
    <>
      <ShellNav currentPage="fit" />
      <div className="h-full">
        <FitWizard />
      </div>
    </>
  );
}

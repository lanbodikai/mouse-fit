"use client";

import ServiceWorkspace from "@/components/dashboard/ServiceWorkspace";
import { mouseFitWorkspaceConfig } from "@/data/service-workspaces";

export default function MouseFitPage() {
  return <ServiceWorkspace config={mouseFitWorkspaceConfig} />;
}

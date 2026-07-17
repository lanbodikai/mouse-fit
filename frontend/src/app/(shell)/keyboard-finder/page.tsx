"use client";

import ServiceWorkspace from "@/components/dashboard/ServiceWorkspace";
import { keyboardFinderWorkspaceConfig } from "@/data/service-workspaces";

export default function KeyboardFinderPage() {
  return <ServiceWorkspace config={keyboardFinderWorkspaceConfig} />;
}

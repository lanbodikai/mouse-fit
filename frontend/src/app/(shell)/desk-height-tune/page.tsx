"use client";

import ServiceWorkspace from "@/components/dashboard/ServiceWorkspace";
import { deskHeightTuneWorkspaceConfig } from "@/data/service-workspaces";

export default function DeskHeightTunePage() {
  return <ServiceWorkspace config={deskHeightTuneWorkspaceConfig} />;
}

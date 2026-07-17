"use client";

import ServiceWorkspace from "@/components/dashboard/ServiceWorkspace";
import { mousepadMatchWorkspaceConfig } from "@/data/service-workspaces";

export default function MousepadMatchPage() {
  return <ServiceWorkspace config={mousepadMatchWorkspaceConfig} />;
}

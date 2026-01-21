import type { ReactNode } from "react";
import NotchedPanel from "./NotchedPanel";

type CenterPanelProps = {
  children: ReactNode;
  className?: string;
};

export default function CenterPanel({ children, className }: CenterPanelProps) {
  return (
    <NotchedPanel className={className} contentClassName="h-full p-8">
      {children}
    </NotchedPanel>
  );
}

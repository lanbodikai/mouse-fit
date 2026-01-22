import Sidebar from "@/components/shell/Sidebar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage-viewport animate-page-zoom">
      <div className="stage-shell">
        <div className="flex h-full w-full gap-4 p-4 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}

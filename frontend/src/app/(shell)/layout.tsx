import Sidebar from "@/components/shell/Sidebar";
import RightStack from "@/components/shell/RightStack";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell-root">
      <div className="device-frame">
        <div className="device-grid">
          <Sidebar />
          <main className="device-center">{children}</main>
          <aside className="device-right">
            <RightStack />
          </aside>
        </div>
      </div>
    </div>
  );
}

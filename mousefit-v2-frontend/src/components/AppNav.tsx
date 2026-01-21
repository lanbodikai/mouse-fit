import Link from "next/link";
import {
  Bot,
  Database,
  FileText,
  Hand,
  Home,
  MousePointer2,
  Ruler,
  Settings,
  User,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/measure", label: "Measure", icon: Ruler },
  { href: "/grip", label: "Grip", icon: Hand },
  { href: "/database", label: "Database", icon: Database },
  { href: "/report", label: "Report", icon: FileText },
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/user", label: "User", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppNav() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <MousePointer2 className="h-5 w-5" />
          MouseFit v2
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1 rounded-full border border-transparent px-2 py-1 transition hover:border-slate-700 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

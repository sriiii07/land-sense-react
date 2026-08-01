/** Left navigation for the authority console. Collapses to icons on smaller screens. */
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  LineChart,
  Users,
  Home,
  BarChart3,
  Settings,
  MountainSnow,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Predictions", to: "/predictions", icon: LineChart },
  { label: "Citizen Monitoring", to: "/citizens", icon: Users },
  { label: "Shelter Management", to: "/shelters", icon: Home },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:w-60">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <MountainSnow aria-hidden className="size-5 shrink-0 text-sidebar-foreground" />
        <span className="hidden text-sm font-semibold text-sidebar-foreground lg:block">
          BHOOSAKTHI
        </span>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-0.5 p-2">
        {navItems.map(({ label, to, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              title={label}
              className={cn(
                "flex items-center gap-3 rounded px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60 lg:block">
        Kerala State Disaster
        <br />
        Management Authority
      </div>
    </aside>
  );
}

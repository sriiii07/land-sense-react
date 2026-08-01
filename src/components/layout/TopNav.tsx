/** Minimal top bar: context on the left, system state and officer on the right. */
import { useNavigate } from "@tanstack/react-router";
import { CircleDot, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function TopNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4 lg:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          District Disaster Control Room — Kerala
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {user ? `${user.full_name} · ${user.role}` : "Unauthenticated"}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-xs text-risk-low md:inline-flex">
          <CircleDot aria-hidden className="size-3.5" />
          System operational
        </span>
        <div className="hidden text-right sm:block">
          <p className="text-xs font-medium text-foreground">
            {user ? user.full_name : "Unknown Officer"}
          </p>
          <p className="text-xs text-muted-foreground">
            {user ? `ID ${user.id}` : "Not signed in"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 rounded border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <LogOut aria-hidden className="size-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}

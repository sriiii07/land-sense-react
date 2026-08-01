/** Shell shared by every authenticated console page: sidebar + top nav + content. */
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-secondary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="flex-1 space-y-5 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

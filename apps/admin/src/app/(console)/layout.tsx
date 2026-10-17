"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LayoutDashboard, LogOut, Package, ReceiptText, ShieldCheck, type LucideIcon } from "lucide-react";
import { Button } from "@taskmanager/ui/components/button";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { cn } from "@taskmanager/ui/lib/utils";
import { useSessionLogout } from "@taskmanager/auth/use-session";
import { useRequireSession } from "@taskmanager/auth/use-require-session";

const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL ?? "http://localhost:3100";

// Add a section here and it appears in the sidebar (and the mobile tab row).
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ReceiptText },
  { href: "/products", label: "Products", icon: Package },
];

// One guard for every page of the console. A signed-in user who is not an admin is sent to the
// sign-in page with a notice (sending them to "/" would only bounce them back here).
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useSessionLogout();
  const { isReady } = useRequireSession(`/login?redirect=${encodeURIComponent(pathname)}`, {
    requireAdmin: true,
    forbiddenRedirectTo: "/login?forbidden=1",
  });

  if (!isReady) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <p className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" /> TaskManager Admin
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" nativeButton={false} render={<a href={SHOP_URL} aria-label="Back to shop"><ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back to shop</span></a>} />
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-6 px-4 py-8 sm:px-6 md:grid-cols-[200px_1fr] md:gap-10 lg:px-8">
        <aside className="md:sticky md:top-8 md:self-start">
          <nav aria-label="Admin" className="flex gap-1 md:flex-col">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

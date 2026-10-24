"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ShieldCheck,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@taskmanager/ui/components/button";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { cn } from "@taskmanager/ui/lib/utils";
import { useSessionLogout } from "@taskmanager/auth/use-session";
import { useRequireSession } from "@taskmanager/auth/use-require-session";
import { ThemeToggle } from "@/components/theme-toggle";

const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL ?? "http://localhost:3100";
const COLLAPSED_KEY = "nova-admin-sidebar-collapsed";

// Add a section here and it appears in the sidebar (and the mobile tab row).
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ReceiptText },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tags },
];

// The collapsed state lives in localStorage (which can be blocked); the server render is always expanded.
const collapsedListeners = new Set<() => void>();
function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  return () => void collapsedListeners.delete(listener);
}
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

const footerLink =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

// One guard for every page of the console. A signed-in user who is not an admin is sent to the
// sign-in page with a notice (sending them to "/" would only bounce them back here).
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useSessionLogout();
  const { isReady } = useRequireSession(`/login?redirect=${encodeURIComponent(pathname)}`, {
    requireAdmin: true,
    forbiddenRedirectTo: "/login?forbidden=1",
  });
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  function toggleCollapsed() {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
    } catch {}
    collapsedListeners.forEach((listener) => listener());
  }

  if (!isReady) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside
        className={cn(
          "min-w-0 border-b bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:shrink-0 md:border-r md:border-b-0",
          collapsed ? "md:w-[4.5rem]" : "md:w-60",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4 md:h-16">
          <p className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <span className={cn(collapsed && "md:hidden")}>Nova Admin</span>
          </p>
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="size-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col px-4 pb-3 md:h-[calc(100%-4rem)] md:px-3 md:pb-16">
          <nav
            aria-label="Admin"
            className="flex gap-1 overflow-x-auto [scrollbar-width:none] md:flex-col md:overflow-visible [&::-webkit-scrollbar]:hidden"
          >
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "md:justify-center md:px-0",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className={cn(collapsed && "md:sr-only")}>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden flex-col gap-1 border-t pt-3 md:flex">
            <a
              href={SHOP_URL}
              title={collapsed ? "Back to shop" : undefined}
              className={cn(footerLink, collapsed && "justify-center px-0")}
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span className={cn(collapsed && "sr-only")}>Back to shop</span>
            </a>
            <button
              type="button"
              onClick={() => logout()}
              title={collapsed ? "Sign out" : undefined}
              className={cn(footerLink, collapsed && "justify-center px-0")}
            >
              <LogOut className="size-4 shrink-0" />
              <span className={cn(collapsed && "sr-only")}>Sign out</span>
            </button>
            <div className={cn("mt-1 flex items-center gap-1", collapsed ? "flex-col" : "justify-between")}>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                onClick={toggleCollapsed}
              >
                {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

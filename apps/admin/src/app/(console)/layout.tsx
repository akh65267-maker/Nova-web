"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ReceiptText,
  ShieldCheck,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { m } from "motion/react";
import { Button } from "@taskmanager/ui/components/button";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { cn } from "@taskmanager/ui/lib/utils";
import { useSessionLogout } from "@taskmanager/auth/use-session";
import { useRequireSession } from "@taskmanager/auth/use-require-session";
import { CommandPalette, type PaletteCommand } from "@/components/command-palette";
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

// Labels fade while the sidebar's width animates; the icons stay put at the left edge.
const labelClass = "whitespace-nowrap transition-opacity duration-200";

const footerLink =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

// One guard for every page of the console. A signed-in user who is not an admin is sent to the
// sign-in page with a notice (sending them to "/" would only bounce them back here).
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
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

  const commands: PaletteCommand[] = [
    ...NAV.map(({ href, label, icon }) => ({
      id: href,
      label: `Go to ${label}`,
      group: "Pages",
      icon,
      run: () => router.push(href),
    })),
    { id: "shop", label: "Back to shop", group: "Actions", icon: ArrowLeft, run: () => window.location.assign(SHOP_URL) },
    { id: "logout", label: "Sign out", group: "Actions", icon: LogOut, run: () => logout() },
  ];

  if (!isReady) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* The width is a CSS variable so only md+ uses it; on a phone the sidebar is a row on top. */}
      <m.aside
        initial={false}
        animate={{ "--sidebar-w": collapsed ? "4rem" : "15rem" }}
        className="min-w-0 border-b bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-(--sidebar-w) md:shrink-0 md:overflow-hidden md:border-r md:border-b-0"
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4 md:h-16">
          <p className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <span className={cn(labelClass, collapsed && "md:opacity-0")}>Nova Admin</span>
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
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            title={collapsed ? "Search (Ctrl+K)" : undefined}
            className={cn(footerLink, "mb-2 hidden border md:flex")}
          >
            <Search className="size-4 shrink-0" />
            <span className={cn(labelClass, "flex-1 text-left", collapsed && "md:opacity-0")}>Search</span>
            <kbd className={cn(labelClass, "rounded border px-1.5 text-[10px] font-normal", collapsed && "md:opacity-0")}>Ctrl K</kbd>
          </button>
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
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className={cn(labelClass, collapsed && "md:opacity-0")}>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden flex-col gap-1 border-t pt-3 md:flex">
            <a
              href={SHOP_URL}
              title={collapsed ? "Back to shop" : undefined}
              className={footerLink}
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span className={cn(labelClass, collapsed && "opacity-0")}>Back to shop</span>
            </a>
            <button
              type="button"
              onClick={() => logout()}
              title={collapsed ? "Sign out" : undefined}
              className={footerLink}
            >
              <LogOut className="size-4 shrink-0" />
              <span className={cn(labelClass, collapsed && "opacity-0")}>Sign out</span>
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
      </m.aside>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

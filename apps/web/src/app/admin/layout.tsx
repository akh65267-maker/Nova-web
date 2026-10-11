"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Package, ShieldCheck, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/features/auth/use-require-auth";
import { cn } from "@/lib/utils";

// Add a section here and it appears in the sidebar (and the mobile tab row).
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/products", label: "Products", icon: Package },
];

// One guard for every admin page: they no longer each call useRequireAuth.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isReady } = useRequireAuth(`/login?redirect=${encodeURIComponent(pathname)}`, {
    requireAdmin: true,
  });

  if (!isReady) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[200px_1fr] md:gap-10 lg:px-8">
      <aside className="flex flex-col gap-4 md:sticky md:top-20 md:self-start">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" /> Admin
        </p>
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
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to shop
        </Link>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

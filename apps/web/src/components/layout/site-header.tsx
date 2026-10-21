"use client";

import Link from "next/link";
import { ShoppingCart, User, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@taskmanager/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@taskmanager/ui/components/dropdown-menu";
import { useCartCount, useCartStore } from "@/store/cart-store";
import { useSessionStore } from "@taskmanager/auth/session-store";
import { useSessionCurrentUser } from "@taskmanager/auth/use-session";
import { SearchBox } from "@/features/catalog/search-box";
import { useLogout } from "@/features/auth/use-logout";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="hidden h-5 w-5 dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function AccountMenu() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated());
  const { data: user } = useSessionCurrentUser();
  const logout = useLogout();

  if (!isAuthenticated) {
    return (
      <Button
        variant="ghost"
        size="icon"
        nativeButton={false}
        render={
          <Link href="/login">
            <User className="h-5 w-5" />
            <span className="sr-only">Sign in</span>
          </Link>
        }
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
            <span className="sr-only">Account</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{user?.displayName ?? "My account"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/account">Profile</Link>} />
          <DropdownMenuItem render={<Link href="/orders">Orders</Link>} />
          <DropdownMenuItem onClick={() => logout()} variant="destructive">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const cartCount = useCartCount();
  const setCartOpen = useCartStore((state) => state.setOpen);
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Nova Commerce
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/products" className="text-muted-foreground hover:text-foreground">
            All Products
          </Link>
          <Link
            href={{ pathname: "/products", query: { sort: "newest" } }}
            className="text-muted-foreground hover:text-foreground"
          >
            New Arrivals
          </Link>
        </nav>

        <div className="ml-auto flex flex-1 items-center justify-end gap-2">
          <SearchBox />

          <ThemeToggle />

          <AccountMenu />

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="animate-in zoom-in-150 duration-300 motion-reduce:animate-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {cartCount}
              </span>
            )}
            <span className="sr-only">Cart</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

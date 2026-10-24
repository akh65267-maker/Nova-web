"use client";

import { useEffect, useState } from "react";
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
import { LazyMegaMenu, LazyMobileMenu } from "./lazy-menus";

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

// The header is see-through at the top of the page and gains its edge once content scrolls under it.
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled;
}

export function SiteHeader() {
  const scrolled = useScrolled();
  const cartCount = useCartCount();
  const setCartOpen = useCartStore((state) => state.setOpen);
  return (
    <header
      data-scrolled={scrolled}
      className="sticky top-0 z-50 border-b border-transparent bg-background/70 backdrop-blur-xl backdrop-saturate-150 transition-[border-color,background-color] duration-300 data-[scrolled=true]:border-border data-[scrolled=true]:bg-background/85"
    >
      <div aria-hidden className="scroll-progress pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left bg-primary" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <LazyMobileMenu />

        <Link href="/" className="text-lg font-semibold tracking-tight">
          Nova Commerce
        </Link>

        <LazyMegaMenu />

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

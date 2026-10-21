"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, Sparkles, Tag } from "lucide-react";
import { Button } from "@taskmanager/ui/components/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@taskmanager/ui/components/navigation-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@taskmanager/ui/components/sheet";
import { useBrands } from "@taskmanager/api/use-brands";
import { useCategories } from "@taskmanager/api/use-categories";

const FEATURED = [
  { href: "/products?sort=newest", label: "New arrivals", hint: "Just landed", icon: Sparkles },
  { href: "/products?onSale=true&sort=best-offer", label: "Best offers", hint: "The deepest discounts", icon: Tag },
] as const;

const BRANDS_SHOWN = 8;

function useMenuData() {
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  return { categories, brands: brands.slice(0, BRANDS_SHOWN) };
}

// The desktop navigation: Shop opens one wide panel (categories, brands, featured), the rest are plain links.
export function MegaMenu() {
  const { categories, brands } = useMenuData();

  return (
    <NavigationMenu className="hidden md:flex" aria-label="Main">
      <NavigationMenuList className="gap-1">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Shop</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[min(52rem,92vw)] grid-cols-[1.2fr_1fr_1fr] gap-8 p-6">
              <section aria-labelledby="menu-categories">
                <h3 id="menu-categories" className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Shop by category
                </h3>
                <ul className="grid gap-0.5">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <NavigationMenuLink render={<Link href={{ pathname: "/products", query: { category: category.name } }} />} className="justify-between text-base">
                        {category.name}
                        <span className="text-xs tabular-nums text-muted-foreground">{category.productCount}</span>
                      </NavigationMenuLink>
                    </li>
                  ))}
                  <li>
                    <NavigationMenuLink render={<Link href="/products" />} className="text-muted-foreground">
                      All products <ArrowRight />
                    </NavigationMenuLink>
                  </li>
                </ul>
              </section>

              <section aria-labelledby="menu-brands">
                <h3 id="menu-brands" className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Brands
                </h3>
                <ul className="grid gap-0.5">
                  {brands.map((brand) => (
                    <li key={brand.name}>
                      <NavigationMenuLink render={<Link href={{ pathname: "/products", query: { brand: brand.name } }} />}>{brand.name}</NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="menu-featured" className="flex flex-col gap-2">
                <h3 id="menu-featured" className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Featured
                </h3>
                {FEATURED.map(({ href, label, hint, icon: Icon }) => (
                  <NavigationMenuLink key={href} render={<Link href={href} />} className="items-start gap-3 rounded-xl bg-muted/50 p-3">
                    <Icon className="mt-0.5 shrink-0" />
                    <span className="flex flex-col">
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </NavigationMenuLink>
                ))}
              </section>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink render={<Link href="/products?sort=newest" />} className={navigationMenuTriggerStyle()}>
            New Arrivals
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink render={<Link href="/products?onSale=true&sort=best-offer" />} className={navigationMenuTriggerStyle()}>
            Offers
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

// Below md there is no room for the panel: the same links open as a side sheet.
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { categories } = useMenuData();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        }
      />
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Nova Commerce</SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
          <ul className="grid gap-1 text-lg font-medium">
            <li>
              <Link href="/products" onClick={close} className="block rounded-lg px-2 py-2 hover:bg-muted">
                All products
              </Link>
            </li>
            {FEATURED.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} onClick={close} className="block rounded-lg px-2 py-2 hover:bg-muted">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div>
            <h3 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Categories</h3>
            <ul className="grid gap-1">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={{ pathname: "/products", query: { category: category.name } }} onClick={close} className="block rounded-lg px-2 py-2 hover:bg-muted">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

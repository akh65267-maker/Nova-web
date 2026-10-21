"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@taskmanager/ui/components/button";

// The menus pull the navigation menu and sheet primitives into the page. Loading them with the first
// paint cost about a hundred milliseconds of main-thread time on a throttled phone, so the header ships
// plain links and swaps the real menus in on the first hover, focus or tap, or once the page has settled.
// Nothing here may import from ./mega-menu except through dynamic(), or the saving is lost.
const SETTLE_MS = 3000;

const linkClass = "inline-flex h-9 items-center rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-muted";

function DesktopLinks() {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      <Link href="/products" className={linkClass}>
        Shop <ChevronDown className="relative top-px ml-1 size-3" aria-hidden />
      </Link>
      <Link href="/products?sort=newest" className={linkClass}>
        New Arrivals
      </Link>
      <Link href="/products?onSale=true&sort=best-offer" className={linkClass}>
        Offers
      </Link>
    </nav>
  );
}

function MenuButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="md:hidden" onClick={onClick}>
      <Menu className="h-5 w-5" />
      <span className="sr-only">Menu</span>
    </Button>
  );
}

const MegaMenu = dynamic(() => import("./mega-menu").then((m) => m.MegaMenu), { ssr: false, loading: DesktopLinks });
const MobileMenu = dynamic(() => import("./mega-menu").then((m) => m.MobileMenu), { ssr: false, loading: () => <MenuButton /> });

// True once the page has loaded and settled for a moment.
function useSettled() {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      timer = window.setTimeout(() => setSettled(true), SETTLE_MS);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(timer);
    };
  }, []);

  return settled;
}

export function LazyMegaMenu() {
  const settled = useSettled();
  const [wanted, setWanted] = useState(false);

  // Hovering or focusing Shop is a request to see it, so the menu opens once it has loaded.
  if (settled || wanted) return <MegaMenu defaultOpen={wanted} />;
  return (
    <div className="hidden md:block" onPointerEnter={() => setWanted(true)} onFocus={() => setWanted(true)}>
      <DesktopLinks />
    </div>
  );
}

export function LazyMobileMenu() {
  const settled = useSettled();
  const [tapped, setTapped] = useState(false);

  // A tap before the menu has loaded must still open it, so the real menu starts open.
  if (settled || tapped) return <MobileMenu defaultOpen={tapped} />;
  return <MenuButton onClick={() => setTapped(true)} />;
}

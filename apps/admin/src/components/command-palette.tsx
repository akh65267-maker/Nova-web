"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Package, Search, Sun, type LucideIcon } from "lucide-react";
import { m } from "motion/react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@taskmanager/ui/components/dialog";
import { cn } from "@taskmanager/ui/lib/utils";
import { useProducts } from "@taskmanager/api/use-products";

export type PaletteCommand = {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  run: () => void;
};

// Ctrl+K (Cmd+K on a Mac) opens a search over the console's pages, a few actions and the products.
// The commands come from the layout, which owns the navigation and the sign-out.
export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: PaletteCommand[];
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const term = useDeferredValue(query.trim());
  const products = useProducts({ pageSize: 5, search: term, includeArchived: true }, { enabled: open && term.length >= 2 });

  // Every way of opening or closing goes through here, so the next opening starts empty.
  const setOpen = useCallback(
    (next: boolean) => {
      setQuery("");
      setActive(0);
      onOpenChange(next);
    },
    [onOpenChange],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const items = useMemo<PaletteCommand[]>(() => {
    const dark = resolvedTheme === "dark";
    const all: PaletteCommand[] = [
      ...commands,
      {
        id: "theme",
        label: dark ? "Switch to light mode" : "Switch to dark mode",
        group: "Actions",
        icon: dark ? Sun : Moon,
        run: () => setTheme(dark ? "light" : "dark"),
      },
    ];
    const needle = term.toLowerCase();
    const matching = needle ? all.filter((c) => c.label.toLowerCase().includes(needle)) : all;
    const found: PaletteCommand[] = (term.length >= 2 ? (products.data?.items ?? []) : []).map((p) => ({
      id: `product-${p.id}`,
      label: p.name,
      group: "Products",
      icon: Package,
      run: () => router.push(`/products?q=${encodeURIComponent(p.name)}`),
    }));
    return [...matching, ...found];
  }, [commands, products.data, resolvedTheme, router, setTheme, term]);

  function choose(item: PaletteCommand | undefined) {
    if (!item) return;
    setOpen(false);
    item.run();
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(items[active]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search pages, actions and products.</DialogDescription>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
            aria-label="Search the console"
            placeholder="Search pages, actions and products"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
          />
        </div>
        <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {term.length >= 2 && products.isFetching ? "Searching..." : "Nothing found"}
            </li>
          )}
          {items.map((item, index) => (
            <m.li
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: Math.min(index, 6) * 0.02 }}
              id={`palette-${item.id}`}
              role="option"
              aria-selected={index === active}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(item)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                index === active ? "bg-accent text-accent-foreground" : "text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.group}</span>
            </m.li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

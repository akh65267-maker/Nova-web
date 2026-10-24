"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@taskmanager/ui/components/input";
import { useProducts } from "@taskmanager/api/use-products";
import { ProductPicture } from "./product-picture";
import { formatPrice } from "@taskmanager/ui/lib/utils";

const SUGGESTIONS = 5;
const DEBOUNCE_MS = 250;

// The header's search: Enter goes to the full results, and while typing the best matches
// drop down with their pictures. Arrow keys move through them, Escape closes the list.
export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const root = useRef<HTMLFormElement>(null);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const searching = debounced.length >= 2;
  const { data, isFetching } = useProducts({ search: debounced, pageSize: SUGGESTIONS });
  const items = searching ? (data?.items ?? []) : [];
  const showList = open && searching;

  function go(path: string) {
    setOpen(false);
    setActive(-1);
    router.push(path);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (active >= 0 && items[active]) return go(`/products/${items[active].id}`);
    const trimmed = term.trim();
    go(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") return setOpen(false);
    if (!showList || items.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      // Position 0 is "no suggestion" (Enter searches the typed text); 1..n are the suggestions.
      setActive((current) => ((current + 1 + step + items.length + 1) % (items.length + 1)) - 1);
    }
  }

  return (
    <form ref={root} onSubmit={handleSubmit} role="search" className="relative hidden max-w-sm flex-1 sm:block">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="Search products"
        autoComplete="off"
        placeholder="Search products..."
        className="pl-8"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
        >
          {items.map((product, index) => (
            <li
              key={product.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onPointerEnter={() => setActive(index)}
              // pointerdown would close the list before the click lands, so navigate on click.
              onClick={() => go(`/products/${product.id}`)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${index === active ? "bg-accent" : ""}`}
            >
              <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                <ProductPicture product={product} alt="" sizes="40px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="truncate text-xs text-muted-foreground">{product.category}</p>
              </div>
              <span className="text-sm tabular-nums">{formatPrice(product.price)}</span>
            </li>
          ))}
          {items.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
              {isFetching ? "Searching..." : "No products found"}
            </li>
          )}
          {items.length > 0 && (
            <li role="presentation">
              <button
                type="submit"
                className="w-full border-t px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent"
              >
                See all results for &ldquo;{debounced}&rdquo;
              </button>
            </li>
          )}
        </ul>
      )}
    </form>
  );
}

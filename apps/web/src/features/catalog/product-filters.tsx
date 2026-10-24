"use client";

import { useState } from "react";
import { Checkbox } from "@taskmanager/ui/components/checkbox";
import { Slider } from "@taskmanager/ui/components/slider";
import { Button } from "@taskmanager/ui/components/button";
import { useBrands } from "@taskmanager/api/use-brands";
import { useCategories } from "@taskmanager/api/use-categories";
import { MAX_PRICE } from "./list-params";

// Brands listed before "Show all": the catalog has dozens, which would push everything else away.
const BRANDS_SHOWN = 8;

export type FilterState = {
  category: string | null;
  brand: string | null;
  minPrice: number;
  maxPrice: number;
  onSale: boolean;
  search: string;
};

export function ProductFilters({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
}) {
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const [allBrands, setAllBrands] = useState(false);
  // The chosen brand stays in view even when it is beyond the first few.
  const shownBrands = allBrands ? brands : brands.filter((brand, index) => index < BRANDS_SHOWN || brand.name === filters.brand);
  const hasActiveFilters =
    filters.category !== null || filters.brand !== null || filters.minPrice > 0 || filters.maxPrice < MAX_PRICE || filters.onSale || filters.search !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ category: null, brand: null, minPrice: 0, maxPrice: MAX_PRICE, onSale: false, search: "" })}
          >
            Clear all
          </Button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={filters.onSale} onCheckedChange={(checked) => onChange({ onSale: Boolean(checked) })} />
        On sale
      </label>

      <div>
        <h3 className="mb-3 text-sm font-medium">Category</h3>
        <div className="flex flex-col gap-2">
          {categories.map(({ name: category }) => (
            <label key={category} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.category === category}
                onCheckedChange={(checked) =>
                  onChange({ category: checked ? category : null })
                }
              />
              {category}
            </label>
          ))}
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">Brand</h3>
          <div className="flex flex-col gap-2">
            {shownBrands.map(({ name }) => (
              <label key={name} className="flex items-center gap-2 text-sm">
                <Checkbox checked={filters.brand === name} onCheckedChange={(checked) => onChange({ brand: checked ? name : null })} />
                {name}
              </label>
            ))}
          </div>
          {brands.length > BRANDS_SHOWN && (
            <Button variant="link" size="sm" className="mt-1 h-auto px-0" onClick={() => setAllBrands((all) => !all)}>
              {allBrands ? "Show fewer" : `Show all ${brands.length} brands`}
            </Button>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium">Price range</h3>
        <Slider
          min={0}
          max={MAX_PRICE}
          step={5}
          value={[filters.minPrice, filters.maxPrice]}
          onValueChange={(value) => {
            const [min, max] = value as number[];
            onChange({ minPrice: min, maxPrice: max });
          }}
        />
        <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>${filters.minPrice}</span>
          <span>${filters.maxPrice}+</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/features/catalog/categories";

export const MAX_PRICE = 200;

export type FilterState = {
  category: string | null;
  minPrice: number;
  maxPrice: number;
  search: string;
};

export function ProductFilters({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
}) {
  const hasActiveFilters =
    filters.category !== null || filters.minPrice > 0 || filters.maxPrice < MAX_PRICE || filters.search !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ category: null, minPrice: 0, maxPrice: MAX_PRICE, search: "" })}
          >
            Clear all
          </Button>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Category</h3>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((category) => (
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

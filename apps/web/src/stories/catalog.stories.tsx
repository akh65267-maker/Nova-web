import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCard } from "@/features/catalog/product-card";
import { byName, mockProducts, unpictured } from "./mock-data";

const meta = {
  title: "Catalog/Product card",
  component: ProductCard,
  decorators: [(Story) => <div className="w-64"><Story /></div>],
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InStock: Story = { args: { product: byName("Apple AirPods Max Silver") } };
export const OnSale: Story = { args: { product: byName("Tennis Racket") } };
export const LowStock: Story = { args: { product: byName("Rolex Cellini Moonphase") } };
export const OutOfStock: Story = { args: { product: byName("Nike Air Jordan 1 Red And Black") } };
export const NoPicture: Story = { args: { product: unpictured } };

/** The catalogue grid, as on /products. */
export const Grid: Story = {
  args: { product: mockProducts[0] },
  decorators: [() => (
    <div className="grid w-[64rem] grid-cols-4 gap-4">
      {[...mockProducts, unpictured].map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  )],
};

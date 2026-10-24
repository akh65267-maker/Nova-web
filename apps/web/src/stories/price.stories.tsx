import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductPrice } from "@/features/catalog/product-price";
import { byName } from "./mock-data";

const meta = { title: "Catalog/Price", component: ProductPrice } satisfies Meta<typeof ProductPrice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Regular: Story = { args: { product: byName("iPhone 13 Pro"), className: "text-2xl" } };
export const OnSale: Story = { args: { product: byName("Rolex Cellini Moonphase"), className: "text-2xl" } };

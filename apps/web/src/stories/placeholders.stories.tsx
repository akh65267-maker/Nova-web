import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductIllustration } from "@/features/catalog/product-illustration";
import { ProductGallery } from "@/features/catalog/product-gallery";
import { byName } from "./mock-data";

const meta = { title: "Catalog/Pictures" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** What a product without a picture shows, per category. */
export const Placeholders: Story = {
  render: () => (
    <div className="grid w-[48rem] grid-cols-5 gap-4">
      {["Electronics", "Fashion", "Home & Kitchen", "Sports & Outdoors", "Other"].map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <ProductIllustration category={category} className="aspect-square rounded-2xl" />
          <span className="text-xs text-muted-foreground">{category}</span>
        </div>
      ))}
    </div>
  ),
};

/** The product page's gallery: the main picture and the thumbnails that swap it. */
export const Gallery: Story = { render: () => <div className="w-[32rem]"><ProductGallery product={byName("iPhone 13 Pro")} /></div> };

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FeaturedHero } from "@/features/catalog/featured-hero";
import { PromoTiles } from "@/features/catalog/promo-tiles";
import { BestOffers, NewArrivals, TopSelling } from "@/features/catalog/product-row";
import { byName } from "./mock-data";

const meta = { title: "Home/Sections", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hero: Story = { render: () => <FeaturedHero product={byName("Tennis Racket")} /> };
export const HeroWithoutProduct: Story = { render: () => <FeaturedHero product={null} /> };
export const Tiles: Story = { render: () => <PromoTiles offer={byName("Rolex Cellini Moonphase")} /> };
export const NewArrivalsRow: Story = { render: () => <NewArrivals /> };
export const TopSellingRow: Story = { render: () => <TopSelling /> };
export const BestOffersRow: Story = { render: () => <BestOffers /> };

/** The home page from the hero down, put together from the sections above. */
export const HomePage: Story = {
  render: () => (
    <>
      <FeaturedHero product={byName("Tennis Racket")} />
      <PromoTiles offer={byName("Rolex Cellini Moonphase")} />
      <NewArrivals />
      <TopSelling />
      <BestOffers />
      <div className="h-20" />
    </>
  ),
};

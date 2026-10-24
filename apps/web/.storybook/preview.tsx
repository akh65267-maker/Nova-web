import type { Preview } from "@storybook/nextjs-vite";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../src/app/globals.css";
import { seedQueries } from "../src/stories/mock-data";

// The same fonts as the app (src/app/layout.tsx), on <html> where the theme reads their variables.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i } },
  },
  globalTypes: {
    theme: {
      description: "Light or dark theme",
      toolbar: { title: "Theme", icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => {
      // The app switches themes with a class on <html> (next-themes), so the stories do the same.
      document.documentElement.classList.add(geistSans.variable, geistMono.variable, "antialiased");
      document.documentElement.classList.toggle("dark", context.globals.theme === "dark");

      // A fresh cache per story, filled with the mock answers, and never asking the network.
      const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchInterval: false, refetchOnWindowFocus: false } } });
      seedQueries(queryClient);

      return (
        <QueryClientProvider client={queryClient}>
          <div className="bg-background text-foreground font-sans">
            <Story />
          </div>
        </QueryClientProvider>
      );
    },
  ],
};

export default preview;

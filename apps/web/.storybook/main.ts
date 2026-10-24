import type { StorybookConfig } from "@storybook/nextjs-vite";

// Storybook for the shop's components, with mock data: it needs neither the backend nor a
// signed-in session, so it can be built once (npm run build-storybook) and shown anywhere.
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  staticDirs: ["../public"],
};

export default config;

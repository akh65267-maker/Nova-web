import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { StoreHydrator } from "@/providers/store-hydrator";
import { WebVitals } from "@/providers/web-vitals";
import { CartSync } from "@/features/cart/cart-sync";
import { SiteHeader } from "@/components/layout/site-header";
import { AssistantPanel } from "@/features/assistant/assistant-panel";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { Toaster } from "@taskmanager/ui/components/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nova Commerce",
  description: "Full-stack e-commerce storefront",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <StoreHydrator />
            <WebVitals />
            <CartSync />
            <SiteHeader />
            <main className="flex flex-1 flex-col">{children}</main>
            <SiteFooter />
            <CartDrawer />
            <AssistantPanel />
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

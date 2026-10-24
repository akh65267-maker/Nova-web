import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { StoreHydrator } from "@/providers/store-hydrator";
import { WebVitals } from "@/providers/web-vitals";
import { Toaster } from "@taskmanager/ui/components/sonner";
import { MotionProvider } from "@taskmanager/ui/components/motion-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nova Commerce Admin",
  description: "Administration for the Nova Commerce shop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <MotionProvider>
              <StoreHydrator />
              <WebVitals />
              {children}
              <Toaster />
            </MotionProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

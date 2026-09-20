import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ToastViewport } from "@/components/shared/toast-viewport";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata = {
  title: "Shopflar — Modern Apparel & Lifestyle",
  description: "A modern clothing and lifestyle store built on a self-hostable ecommerce platform.",
  keywords: ["apparel", "ecommerce", "clothing", "shopflar"],
  authors: [{ name: "Shopflar" }],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Shopflar — Modern Apparel & Lifestyle",
    description: "A modern clothing and lifestyle store.",
    siteName: "Shopflar",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopflar",
    description: "A modern clothing and lifestyle store.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
          <Sonner position="top-right" richColors closeButton />
          <ToastViewport />
        </ThemeProvider>
      </body>
    </html>
  );
}

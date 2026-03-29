import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PriceSimulator } from "@/components/PriceSimulator";
import { NewsTicker } from "@/components/NewsTicker";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "PredictX - Paper Trading",
  description: "Real-time prediction market paper trading platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <PriceSimulator />
        <Sidebar />
        <main className="md:ml-60 min-h-screen pb-20 md:pb-0">
          <NewsTicker />
          {children}
        </main>
      </body>
    </html>
  );
}

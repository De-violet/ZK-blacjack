import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blackjack 21 — ZK Casino",
  description: "A provably fair Blackjack game. Phase 1: Pure logic with Math.random(). Future phases will add Web3, hashing, and ZKP verification.",
  keywords: ["Blackjack", "21", "Web3", "ZKP", "Zero-Knowledge", "Casino", "Next.js"],
  authors: [{ name: "ZK Casino" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Blackjack 21 — ZK Casino",
    description: "A provably fair Blackjack game with cryptographic verification",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blackjack 21 — ZK Casino",
    description: "A provably fair Blackjack game with cryptographic verification",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

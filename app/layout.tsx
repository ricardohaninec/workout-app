import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import Providers from "./providers";
import AiWorkoutFloatingChat from "@/components/ai-workout-floating-chat";
import PwaInstallBanner from "@/components/pwa-install-banner";
import PullToRefresh from "@/components/pull-to-refresh";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "Track your workouts and daily nutrition",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Workout",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-[#0D0D0D] text-white antialiased pb-[env(safe-area-inset-bottom)]">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
          <PullToRefresh />
          <AiWorkoutFloatingChat />
          <PwaInstallBanner />
        </Providers>
      </body>
    </html>
  );
}

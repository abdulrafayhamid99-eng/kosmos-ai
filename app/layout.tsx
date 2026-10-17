import './globals.css';
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "KosMos AI — Broadcast Video Upscaler & Frame-Rate Conversion",
  description:
    "Elevate video footage up to 8K resolution with professional frame-rate conversion, neural super-resolution, broadcast color science, and verified technical quality control.",
  keywords: [
    "KosMos AI",
    "AI Video Enhancer",
    "Video Upscaler 4K 8K",
    "Frame Rate Conversion",
    "Real-ESRGAN",
    "Broadcast Standards",
    "60fps 120fps 240fps"
  ],
  authors: [{ name: "KosMos AI Systems" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" className="dark" dir="ltr" suppressHydrationWarning>
        <body className="bg-neutral-950 text-neutral-100 min-h-screen antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
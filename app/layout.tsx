import './globals.css';
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "KosMos AI — Next-Gen AI Video Upscaler & Cinematic Frame Interpolation",
  description:
    "Elevate your video footage to 8K Cinematic clarity and up to 240 FPS smooth motion using state-of-the-art neural upscaling and optical-flow interpolation.",
  keywords: [
    "KosMos AI",
    "AI Video Enhancer",
    "Video Upscaler 4K 8K",
    "Frame Interpolation",
    "Real-ESRGAN",
    "RIFE Motion Smoothing",
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
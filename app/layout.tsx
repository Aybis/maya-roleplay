import type { Metadata } from "next";
import { Nunito, Quicksand } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const nunito = Nunito({ variable: "--font-body", subsets: ["latin"] });
const quicksand = Quicksand({ variable: "--font-display", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);

  return {
    metadataBase: baseUrl,
    title: "Maya — Voice Roleplay Companion",
    description: "Step into a cozy interactive story with Maya, a realistic voice companion.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Maya — Your story, spoken aloud.",
      description: "A cozy interactive voice roleplay with Maya.",
      type: "website",
      images: [{ url: "/og.png", width: 1731, height: 909, alt: "Maya voice roleplay companion" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Maya — Your story, spoken aloud.",
      description: "A cozy interactive voice roleplay with Maya.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${quicksand.variable}`}>{children}</body>
    </html>
  );
}

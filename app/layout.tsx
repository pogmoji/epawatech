import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "ePawatech",
  title: {
    default: "ePawatech | Digital Learning by Pawatech Solutions",
    template: "%s | ePawatech",
  },
  description:
    "ePawatech is a Pawatech Solutions learning platform for coding, CBC-aligned digital skills, classroom projects, and interactive technology challenges.",
  keywords: [
    "ePawatech",
    "Pawatech Solutions",
    "digital learning",
    "coding education",
    "CBC digital literacy",
  ],
  icons: {
    icon: [
      {
        url: "/pawatech_logo.png",
        sizes: "225x225",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/pawatech_logo.png",
        sizes: "225x225",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#1b2b7c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background">
      <body
        className="antialiased font-sans"
      >
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}

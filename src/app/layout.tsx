import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});


export const metadata: Metadata = {
  metadataBase: new URL("https://www.kitacademy.net"),

  title: {
    default: "KIT — Helping young people thrive in an AI-driven world",
    template: "%s · KIT",
  },
  description:
    "KIT is an online tech school where young people aged 10–15 learn to build with technology — web development, AI, Python, and more. Live classes, taught from Port Harcourt to students worldwide.",

  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    siteName: "KIT",
    locale: "en",
    url: "https://www.kitacademy.net",
    title: "KIT — Helping young people thrive in an AI-driven world",
    description:
      "An online tech school for ages 10–15. Live classes in web development, AI, Python and more — join from anywhere in the world.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KIT — online tech school for ages 10–15" }],
  },

  twitter: {
    card: "summary_large_image",
    title: "KIT — Helping young people thrive in an AI-driven world",
    description:
      "An online tech school for ages 10–15. Live classes in web development, AI, Python and more — join from anywhere.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}

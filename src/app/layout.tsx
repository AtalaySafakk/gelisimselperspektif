import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Yılmazer Akademi",
    template: "%s | Yılmazer Akademi",
  },
  description:
    "Psikologlar için premium online eğitim platformu — klinik beceriler, canlı oturumlar ve sertifikalı programlar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${fraunces.variable} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}

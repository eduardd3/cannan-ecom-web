import type { Metadata } from "next";
import { Geist_Mono, Archivo } from "next/font/google";
import "./globals.css";

//  Archivo is the site font: globals.css maps --font-sans to it, so it is
//  inherited everywhere and needs no utility class. Geist Mono stays for
//  `font-mono` (order numbers, SKUs).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});
//  Fallback only — this applies to any page that sets no title of its own,
//  including the admin and identity areas. Keep it brand-generic; pages that
//  want a specific title set their own.
export const metadata: Metadata = {
  title: "Cannan",
};


export default function RootLayout({
  children, //  children -> content of the page
}: Readonly<{
  children: React.ReactNode;
}>) {
  //  Skeleton only. No <main> here on purpose: this layout wraps the storefront,
  //  identity and admin areas alike, and each of those renders its own chrome.
  //  A <main> at this level would swallow their <header>/<footer> as page
  //  content and nest inside the <main> the admin layout already has.
  //
  //  min-h-dvh on the body instead of an h-full chain through <html>: the old
  //  version only worked as long as every layout below it agreed to pass a
  //  percentage height down, and collapsed silently when one didn't.
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${archivo.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
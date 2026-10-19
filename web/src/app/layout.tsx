import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Rail } from "@/components/Rail";

// next/font downloads at build time and serves the files from our own domain, so no request goes to Google.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["400", "500", "600", "700", "800"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Zishi 自食",
  description: "自食其力 · The robot that pays for itself. A wallet for machines that earn, pay and post a bond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${mono.variable}`}>
      <body>
        <Rail />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}

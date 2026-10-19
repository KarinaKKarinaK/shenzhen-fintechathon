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
        <div className="flex min-h-screen">
          <aside className="sticky top-0 z-40 hidden h-screen w-[84px] shrink-0 px-3 py-5 md:block"><div className="card flex h-full flex-col items-center"><Rail /></div></aside>
          <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:py-5 md:pl-1 md:pr-5">{children}</main>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface md:hidden"><Rail bar /></div>
      </body>
    </html>
  );
}

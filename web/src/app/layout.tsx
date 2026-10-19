import type { Metadata } from "next";
import { Manrope, Geist_Mono, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { Rail } from "@/components/Rail";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["400", "500", "600", "700", "800"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const chakra = Chakra_Petch({ subsets: ["latin"], variable: "--font-chakra", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "JiXin",
  description: "JiXin (机信), machine credit. A wallet for machines that earn, pay and post a bond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${mono.variable} ${chakra.variable}`}>
      <body>
        <div className="flex min-h-screen">
          <aside className="sticky top-0 z-40 h-screen w-[84px] shrink-0 px-4 py-5"><div className="card flex h-full flex-col items-center bg-white"><Rail /></div></aside>
          <main className="min-w-0 flex-1 py-5 pr-5">{children}</main>
        </div>
      </body>
    </html>
  );
}

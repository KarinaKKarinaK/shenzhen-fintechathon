import type { Metadata } from "next";
import { Manrope, Geist_Mono, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { Rail } from "@/components/Rail";
import { LangProvider } from "@/i18n/LangProvider";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["400", "500", "600", "700", "800"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const chakra = Chakra_Petch({ subsets: ["latin"], variable: "--font-chakra", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Zishi 自食其力",
  description: "Zishi (自食其力), the robot that pays for itself. A wallet for machines that earn, pay and post a bond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${mono.variable} ${chakra.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('zishi-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
        <script dangerouslySetInnerHTML={{ __html: "try{var l=localStorage.getItem('zishi-lang');if(l!=='zh'&&l!=='en'){l=(navigator.language||'').toLowerCase().indexOf('zh')===0?'zh':'en'}document.documentElement.lang=l==='zh'?'zh-CN':'en'}catch(e){}" }} />
      </head>
      <body>
        <LangProvider>
          <Rail />
          <main className="page-main">{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}

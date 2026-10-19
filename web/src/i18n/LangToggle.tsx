"use client";
import { useLang } from "./LangProvider";

// EN / 中 switch on the rail, next to the theme toggle. Remembered per browser under jixin-lang.
export function LangToggle() {
  const { lang, setLang, t } = useLang();
  const zh = lang === "zh";
  return (
    <button type="button" onClick={() => setLang(zh ? "en" : "zh")} aria-pressed={zh} aria-label={zh ? t("lang.toEn") : t("lang.toZh")} title={zh ? t("lang.toEn") : t("lang.toZh")} className="tech grid h-10 w-10 place-items-center rounded-[4px] text-[12px] font-bold tracking-wider text-ink-2 transition hover:bg-gold-soft hover:text-ink">
      <span className="flex items-baseline gap-0.5"><span className={zh ? "text-muted" : "text-ink"}>EN</span><span className="text-muted">/</span><span lang="zh-Hans" className={zh ? "text-ink" : "text-muted"}>中</span></span>
    </button>
  );
}

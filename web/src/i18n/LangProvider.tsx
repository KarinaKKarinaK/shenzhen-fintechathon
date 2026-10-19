"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type Dict } from "./en";
import { zh } from "./zh";
import type { Lang } from "@/engine/i18n";

export type { Lang };
export const LANG_KEY = "jixin-lang";

// Dotted paths to every string leaf of the dictionary, so a typo in a key fails tsc.
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : T[K] extends readonly unknown[] ? never : T[K] extends object ? Leaves<T[K], `${P}${K}.`> : never;
}[keyof T & string];
export type TKey = Leaves<Dict>;
export type Vars = Record<string, string | number | boolean | undefined | null>;

const DICTS: Record<Lang, Dict> = { en, zh };

function lookup(d: Dict, key: string): string {
  let cur: unknown = d;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

export function fill(tpl: string, vars?: Vars): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => { const v = vars[k]; return v === undefined || v === null ? "" : String(v); });
}

export function translate(lang: Lang, key: TKey, vars?: Vars): string {
  return fill(lookup(DICTS[lang], key), vars);
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: TKey, vars?: Vars) => string; d: Dict };
const LangCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k, v) => translate("en", k, v), d: en });

// English on the server and on first paint; the stored or browser language takes over after mount.
// The pre paint script in layout.tsx already set the html lang attribute, so the document is right from the start.
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    let l: Lang = "en";
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === "zh" || stored === "en") l = stored;
      else if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) l = "zh";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLangState(l);
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  }, []);
  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars), d: DICTS[lang] }), [lang, setLang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

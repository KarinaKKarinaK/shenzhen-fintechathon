"use client";
import { useLang } from "@/i18n/LangProvider";
import { layerLabel, standardLabel } from "@/engine/i18n";

export type AttackResult = { id: number; name: string; nameZh?: string; layer: string; blocked: boolean; detail: string; detailZh?: string; naive?: boolean | "fell" | "held"; standard?: string; isolated?: boolean };

// The five scored standards, in the order the evidence dictionary lists them. Cases without one land in "other".
export const STANDARD_KEYS = ["permission hierarchy", "hallucination prevention", "injection defense", "intent understanding", "task planning"] as const;

export function naiveFell(r: AttackResult): boolean | undefined {
  return r.naive === undefined ? undefined : r.naive === true || r.naive === "fell";
}

// One accordion, one row per standard. A closed row carries the counts; an open row lists its cases.
export function AttackGrid({ results }: { results: AttackResult[] }) {
  const { d, t, lang } = useLang();
  const G = d.grid, E = d.evidence;
  const name = (r: AttackResult) => (lang === "zh" ? r.nameZh ?? r.name : r.name);
  const detail = (r: AttackResult) => (lang === "zh" ? r.detailZh ?? r.detail : r.detail);
  const groups = [
    ...STANDARD_KEYS.map((key, i) => ({ key, title: standardLabel(lang, key), where: E.standards[i]?.[1] ?? "", cases: results.filter((r) => r.standard === key) })),
    { key: "other", title: G.other, where: "", cases: results.filter((r) => !r.standard || !(STANDARD_KEYS as readonly string[]).includes(r.standard)) },
  ].filter((g) => g.cases.length);
  if (!results.length) return <div className="text-sm text-muted">{G.none}</div>;
  return (
    <div className="flex flex-col gap-1.5">
      {groups.map((g) => {
        const blocked = g.cases.filter((r) => r.blocked).length;
        const fell = g.cases.filter((r) => naiveFell(r) === true).length;
        const all = blocked === g.cases.length;
        return (
          <details key={g.key} className="group cut-sm border border-line bg-white open:bg-paper-2/40">
            <summary title={g.where || undefined} className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
              <span className="tech text-[10px] text-red transition group-open:rotate-90">&#9656;</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{g.title}</span>
              <span className="hidden text-xs text-muted sm:inline">{t("grid.fellN", { n: fell })}</span>
              <span className={`pill !px-2 !py-0.5 !text-[11px] tabular-nums ${all ? "bg-gold text-ink" : "bg-red text-white"}`}>{t("grid.blockedOf", { b: blocked, n: g.cases.length })}</span>
            </summary>
            <ul className="flex flex-col px-3 pb-2">
              {g.cases.map((r) => {
                const nf = naiveFell(r);
                return (
                  <li key={r.id} className="border-t border-line/60 first:border-t-0">
                    <details className="group/case">
                      <summary className="flex cursor-pointer list-none items-center gap-2 py-1.5 text-xs [&::-webkit-details-marker]:hidden">
                        <span className={`inline-block h-2 w-2 shrink-0 rotate-45 ${r.blocked ? "bg-gold" : "bg-red"}`} aria-label={r.blocked ? G.blockedPill : G.notBlocked} />
                        <span className="mono w-5 shrink-0 text-muted">{String(r.id).padStart(2, "0")}</span>
                        <span className="min-w-0 flex-1 truncate text-ink">{name(r)}</span>
                        {r.isolated ? <span className="hidden rounded-sm bg-gold-soft px-1 py-0.5 text-[9px] uppercase tracking-wide text-ink-2 sm:inline" title={G.isolatedNote}>{G.isolated}</span> : null}
                        {nf === false ? <span className="rounded-sm bg-paper-2 px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted">{G.naiveHeld}</span> : null}
                        <span className="w-16 shrink-0 text-right text-muted">{layerLabel(lang, r.layer)}</span>
                      </summary>
                      <div className="pb-2 pl-9 text-[11px] text-muted">{detail(r)}</div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

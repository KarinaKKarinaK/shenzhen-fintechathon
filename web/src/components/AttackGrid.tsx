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
        return (
          <details key={g.key} className="group cut-sm border border-line bg-white open:bg-paper-2/40">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
              <span className="tech text-[10px] text-red transition group-open:rotate-90">&#9656;</span>
              <span className="font-semibold">{g.title}</span>
              <span className="mono text-muted">{t("grid.cases", { n: g.cases.length })}</span>
              <span className={`mono ${blocked === g.cases.length ? "text-gold-deep" : "text-red"}`}>{t("grid.blockedN", { n: blocked })}</span>
              <span className="mono text-red">{t("grid.fellN", { n: fell })}</span>
              {g.where ? <span className="basis-full text-xs text-muted md:ml-auto md:basis-auto">{g.where}</span> : null}
            </summary>
            <div className="overflow-x-auto px-3 pb-3">
              <table className="passbook w-full text-xs">
                <thead><tr><th className="text-left">#</th><th className="text-left">{G.thCase}</th><th className="text-left">{G.thLayer}</th><th className="text-left">Zishi</th><th className="text-left">{G.thNaive}</th></tr></thead>
                <tbody>
                  {g.cases.map((r) => {
                    const nf = naiveFell(r);
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="whitespace-nowrap">{String(r.id).padStart(2, "0")}</td>
                        <td className="min-w-[14rem]"><div className="text-ink">{name(r)}{r.isolated ? <span className="ml-1.5 rounded-sm bg-gold-soft px-1 py-0.5 text-[9px] uppercase tracking-wide text-ink-2" title={G.isolatedNote}>{G.isolated}</span> : null}</div><div className="mt-0.5 text-muted">{detail(r)}</div></td>
                        <td className="whitespace-nowrap text-ink-2">{layerLabel(lang, r.layer)}</td>
                        <td className="whitespace-nowrap"><span className={`mr-1.5 inline-block h-2 w-2 rotate-45 ${r.blocked ? "bg-gold" : "bg-red"}`} aria-hidden />{r.blocked ? G.blockedPill : G.notBlocked}</td>
                        <td className={`whitespace-nowrap ${nf ? "text-red" : "text-ink-2"}`}>{nf === undefined ? "?" : nf ? G.falls : G.holds}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}

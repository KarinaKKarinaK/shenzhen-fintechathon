"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Scene from "./SceneLoader";
import { useRun, type RunState } from "./useRun";
import { ChainFeed, Narration } from "./Panels";
import { KpiTiles } from "./Kpis";
import { Moments, momentsOf, type MomentKey } from "./Moments";
import { useLang, type Lang } from "@/i18n/LangProvider";

type Tab = "feed" | "data";
type Sample = { name: string; path: string; description?: { en?: string; zh?: string } };

// Reads the list from GET /api/samples. Any row without a name and a path is dropped.
function samplesOf(body: unknown): Sample[] {
  const list = Array.isArray(body) ? body : body && typeof body === "object" && Array.isArray((body as { samples?: unknown }).samples) ? (body as { samples: unknown[] }).samples : [];
  return list.flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    if (typeof o.name !== "string" || typeof o.path !== "string") return [];
    const d = (o.description ?? {}) as Record<string, unknown>;
    return [{ name: o.name, path: o.path, description: { en: typeof d.en === "string" ? d.en : undefined, zh: typeof d.zh === "string" ? d.zh : undefined } }];
  });
}

// The live page: an endless feed of jobs, or one run over data the visitor brings. Both land in the same
// reducer and the same scene, moments, tiles and chain feed as the demo run.
export function LiveView() {
  const { d, lang } = useLang();
  const L = d.live;
  const { state, startStream, stop, reset } = useRun("fleet", lang);
  const [tab, setTab] = useState<Tab>("feed");
  const switchTab = (next: Tab) => { if (next !== tab) { stop(); reset(); setTab(next); } };

  return (
    <div className="mx-auto max-w-[1560px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="tech text-[11px] tracking-[0.25em] text-red">{L.eyebrow}</div>
          <h1 className="display text-4xl md:text-5xl">{L.title}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-2">{L.intro}</p>
        </div>
        <div className="flex gap-1 border-b border-line" role="tablist" aria-label={L.tabsAria}>
          {(["feed", "data"] as Tab[]).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => switchTab(k)}
              className={`tech px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${tab === k ? "border-b-2 border-red text-ink" : "text-muted hover:text-ink"}`}>
              {k === "feed" ? L.tabFeed : L.tabData}
            </button>
          ))}
        </div>
      </header>

      {tab === "feed" ? <Feed state={state} lang={lang} onStart={() => startStream(`/api/live?scenario=fleet&lang=${lang}`)} onStop={stop} /> : <YourData state={state} lang={lang} onRun={(url, init) => startStream(url, init)} onStop={stop} />}
    </div>
  );
}

function Feed({ state, lang, onStart, onStop }: { state: RunState; lang: Lang; onStart: () => void; onStop: () => void }) {
  const { d, t } = useLang();
  const L = d.live;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {!state.running ? <button className="btn btn-red" onClick={onStart}>{L.startLive}</button> : <button className="btn btn-ghost" onClick={onStop}>{d.run.stop}</button>}
        <span className="pill bg-gold-soft text-ink">{t("live.processed", { n: state.processed })}</span>
        {state.running ? <span className="pill bg-red text-white">{d.run.live}</span> : null}
        <span className="mono ml-auto text-muted">{L.feedNote}</span>
      </div>
      <Stage state={state} lang={lang} />
    </>
  );
}

function YourData({ state, lang, onRun, onStop }: { state: RunState; lang: Lang; onRun: (url: string, init: RequestInit) => void; onStop: () => void }) {
  const { d, t } = useLang();
  const L = d.live;
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [local, setLocal] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sample, setSample] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/samples", { signal: ac.signal }).then((r) => (r.ok ? r.json() : [])).then((b) => setSamples(samplesOf(b))).catch(() => {});
    return () => ac.abort();
  }, []);

  const take = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(json|csv)$/i.test(f.name)) { setLocal(t("live.badType", { name: f.name })); return; }
    setLocal(null); setFile(f); setText(""); setSample("");
  };

  const loadSample = useCallback(async (path: string) => {
    setSample(path); setFile(null); setLocal(null);
    if (!path) return;
    try {
      const r = await fetch(path);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setText(await r.text());
    } catch (e) { setLocal(t("live.sampleFailed", { msg: (e as Error).message })); }
  }, [t]);

  const run = () => {
    setLocal(null);
    const url = `/api/run-custom?lang=${lang}`;
    if (file) {
      const fd = new FormData();
      fd.append("file", file, file.name);
      onRun(url, { method: "POST", body: fd });
      return;
    }
    const raw = text.trim();
    if (!raw) { setLocal(L.empty); return; }
    // Pasted CSV goes up as a file so the server parses it the same way as a dropped one.
    if (!/^[[{]/.test(raw)) {
      const fd = new FormData();
      fd.append("file", new Blob([raw], { type: "text/csv" }), "pasted.csv");
      onRun(url, { method: "POST", body: fd });
      return;
    }
    try { JSON.parse(raw); } catch (e) { setLocal(t("live.badJson", { msg: (e as Error).message })); return; }
    onRun(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: raw });
  };

  const errors = [...(local ? [local] : []), ...(state.errors ?? [])];
  const current = samples.find((s) => s.path === sample) ?? samples[0];
  const canRun = !state.running && (!!file || text.trim().length > 0);

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">{L.bringTitle}</h2>
          <div role="button" tabIndex={0} aria-label={L.dropAria} data-over={over}
            onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
            className={`cut-sm cursor-pointer border border-dashed p-6 text-center transition-colors ${over ? "border-red bg-gold-soft" : "border-rule bg-paper-2 hover:bg-gold-soft"}`}>
            <div className="tech text-sm font-bold uppercase tracking-wide">{file ? file.name : L.dropHere}</div>
            <div className="mt-1 text-xs text-muted">{file ? t("live.fileSize", { kb: (file.size / 1024).toFixed(1) }) : L.dropHint}</div>
            <input ref={input} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={(e) => take(e.target.files?.[0])} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted" htmlFor="live-sample">{L.loadSample}</label>
            <select id="live-sample" value={sample} onChange={(e) => loadSample(e.target.value)} className="rounded-sm border border-line bg-white px-2 py-1 text-sm text-ink" disabled={!samples.length}>
              <option value="">{samples.length ? L.pickSample : L.noSamples}</option>
              {samples.map((s) => <option key={s.path} value={s.path}>{s.name}</option>)}
            </select>
            {current ? <a href={current.path} download className="link text-sm">{L.downloadSample}</a> : null}
          </div>
          {current?.description?.[lang] ? <p className="mt-2 text-xs text-ink-2">{current.description[lang]}</p> : null}
          <h3 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{L.schemaTitle}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {L.schema.map(([k, v]) => <div key={k} className="contents"><dt className="mono text-ink">{k}</dt><dd className="text-ink-2">{v}</dd></div>)}
          </dl>
        </section>

        <section className="card flex flex-col p-4">
          <h2 className="mb-3 text-sm font-semibold">{L.pasteTitle}</h2>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setFile(null); setLocal(null); }} rows={12} spellCheck={false} placeholder={L.pastePlaceholder} aria-label={L.pasteTitle}
            className="mono min-h-[200px] w-full flex-1 rounded-sm border border-line bg-paper-2 p-3 text-[11px] text-ink outline-none focus:ring-2 focus:ring-red" />
          {errors.length ? (
            <div role="alert" className="mt-3 border-l-4 border-red bg-red/5 p-3">
              <div className="text-xs font-semibold text-red-deep">{L.notAccepted}</div>
              <ul className="mt-1 flex flex-col gap-0.5 text-xs text-ink">{errors.map((e, i) => <li key={i} className="mono">{e}</li>)}</ul>
            </div>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            {!state.running ? <button className="btn btn-red" onClick={run} disabled={!canRun}>{L.run}</button> : <button className="btn btn-ghost" onClick={onStop}>{d.run.stop}</button>}
            {state.running ? <span className="pill bg-red text-white">{d.run.live}</span> : null}
            <span className="mono ml-auto text-muted">{t("live.processed", { n: state.processed })}</span>
          </div>
        </section>
      </div>
      <Stage state={state} lang={lang} />
    </>
  );
}

// Scene, moments, tiles and chain feed, the same four parts the demo run shows.
function Stage({ state, lang }: { state: RunState; lang: Lang }) {
  const { d, t } = useLang();
  const R = d.run;
  const m = state.machine;
  const slashTxs = state.txs.filter((x) => x.kind === "slash");
  const breached = useMemo(() => state.proofs.some((p) => p.rule === "geofence") || slashTxs.some((x) => /geofence/i.test(x.label)), [state.proofs, slashTxs]);
  const frozen = m?.status === "frozen";
  const lastJob = Object.values(state.jobs).slice(-1)[0];
  const chainMode = state.txs[0]?.simulated === false ? "Base Sepolia" : R.simulated;
  const modelMode = state.model ?? (state.messages.some((x) => x.source === "model") ? "Claude" : R.scripted);
  const elapsed = state.events.length ? (state.events[state.events.length - 1].at - state.events[0].at) / 1000 : 0;

  // Moments light again as they recur. The newest takes the caption; a click pins one until the next lands.
  const moments = useMemo(() => momentsOf(state.events, lang, true), [state.events, lang]);
  const lit = moments.filter((x) => typeof x.at === "number");
  const latest = lit.length ? lit.reduce((a, b) => ((b.at ?? 0) > (a.at ?? 0) ? b : a)).key : null;
  const stamp = lit.reduce((n, x) => n + (x.at ?? 0), 0);
  const [pick, setPick] = useState<{ key: MomentKey; n: number } | null>(null);
  const active = pick && pick.n === stamp ? pick.key : latest;
  const pinned = moments.find((x) => x.key === active)?.text;

  return (
    <>
      <div className="mb-4"><Moments moments={moments} active={active} onSelect={(key) => setPick({ key, n: stamp })} /></div>
      <div className="mb-4"><KpiTiles m={m} /></div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        <section className="aurora aurora-cream card cut relative min-h-[420px] md:min-h-[640px]">
          <span className="bracket left-3 top-3 z-10 border-t border-l" /><span className="bracket right-3 top-3 z-10 border-t border-r" /><span className="bracket bottom-3 left-3 z-10 border-b border-l" /><span className="bracket bottom-3 right-3 z-10 border-b border-r" />
          <div className="absolute inset-0 overflow-hidden"><Scene side="fleet" machine={m} txs={state.txs} jobs={state.jobs} breached={breached} slashed={slashTxs.length > 0} frozen={frozen} worst={state.solvency.last?.worst} telemetry={state.telemetry.last} geofence={lastJob?.geofence} /></div>
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            <span className="pill bg-white/90 text-ink backdrop-blur">{m ? `${m.name}: ${R.status[m.status] ?? m.status}` : R.scene}</span>
            <span className="pill bg-white/85 text-ink backdrop-blur">{t("run.chain", { mode: chainMode })}</span>
            <span className="pill bg-white/85 text-ink backdrop-blur">{t("run.model", { mode: modelMode })}</span>
            {frozen ? <span className="pill bg-red text-white">{R.frozen}</span> : null}
            {state.running ? <span className="pill bg-red text-white">{R.live}</span> : null}
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20">
            <div className="pointer-events-auto bg-white/96 p-4 backdrop-blur" style={{ borderLeft: "4px solid #c8102e" }}>
              <Narration lines={state.narration} pinned={pinned} />
              {state.done ? <div className="mt-2 flex items-center gap-3"><span className="seal stamp tech px-2 py-1 text-[11px] tracking-[0.15em]">已验证 VERIFIED</span><span className="text-sm font-semibold text-red-deep">{state.done}</span></div> : null}
            </div>
          </div>
        </section>
        <aside className="card flex flex-col p-4">
          <h2 className="mb-3 text-sm font-semibold">{R.chainFeed}</h2>
          <div className="scroll-thin max-h-[600px] min-h-0 flex-1 overflow-auto pr-1"><ChainFeed txs={state.txs} /></div>
        </aside>
      </div>
      <div className="mt-4 border-y border-line py-2"><span className="mono text-muted">{t("run.meta", { n: state.events.length, s: elapsed.toFixed(1), tx: state.txs.length })}</span></div>
    </>
  );
}

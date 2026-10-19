"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RunState } from "./useRun";
import { useLang, type Lang } from "@/i18n/LangProvider";

type Sample = { name: string; path: string; description?: { en?: string; zh?: string } };

// Reads the list from GET /api/samples. Any row without a file (or a name and a path) is dropped.
function samplesOf(body: unknown): Sample[] {
  const list = Array.isArray(body) ? body : body && typeof body === "object" && Array.isArray((body as { samples?: unknown }).samples) ? (body as { samples: unknown[] }).samples : [];
  return list.flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    // /api/samples sends { file, en, zh }; also accept { name, path, description }.
    const path = typeof o.path === "string" ? o.path : typeof o.file === "string" ? `/samples/${o.file}` : null;
    const name = typeof o.name === "string" ? o.name : typeof o.file === "string" ? o.file : null;
    if (!name || !path) return [];
    const d = (o.description ?? o) as Record<string, unknown>;
    return [{ name, path, description: { en: typeof d.en === "string" ? d.en : undefined, zh: typeof d.zh === "string" ? d.zh : undefined } }];
  });
}

// Bring your own data: drop or paste jobs, flight logs and messages, or load a sample, then run
// them through the same engine. Lives inside the demo page as its "Your data" mode.
export function YourData({ state, lang, onRun, onStop }: { state: RunState; lang: Lang; onRun: (url: string, init: RequestInit) => void; onStop: () => void }) {
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
    </>
  );
}

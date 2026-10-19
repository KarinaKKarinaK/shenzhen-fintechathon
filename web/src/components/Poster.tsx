"use client";
import { useState } from "react";

// A photo that fills its parent, with a designed block behind it so a missing file still looks finished.
// A plain img tag on purpose: next/image fails the build when the file is not there yet.
export function Poster({ src = "/hero.jpg", alt, label = "自食其力 ZISHI", priority = false }: { src?: string; alt: string; label?: string; priority?: boolean }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="poster-fallback aurora aurora-cream absolute inset-0" aria-hidden>
        <div className="absolute inset-x-0 bottom-[38%] h-px bg-ink/15" />
        <div className="absolute left-6 top-6 flex items-center gap-3"><span className="h-2.5 w-2.5 rotate-45 bg-red" /><span className="tech text-[11px] tracking-[0.3em] text-ink-2">{label}</span></div>
        <div className="absolute bottom-6 right-6 tech text-[10px] tracking-[0.25em] text-ink-2/70">FIELD VIEW</div>
      </div>
      {!missing ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" onError={() => setMissing(true)} />
      ) : null}
    </div>
  );
}

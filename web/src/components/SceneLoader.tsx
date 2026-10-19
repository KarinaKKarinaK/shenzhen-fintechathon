"use client";
import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentProps } from "react";
import type { Scene as SceneType } from "./Scene";
import { Poster } from "./Poster";

function Loading() {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div className="bg-white/90 px-4 py-3 text-sm text-ink-2 backdrop-blur" style={{ borderLeft: "4px solid #c8102e" }}>
        <div className="font-semibold text-ink">Loading the field view</div>
        <div className="mt-0.5 text-xs text-muted">A few seconds. The numbers above are already live.</div>
      </div>
    </div>
  );
}

const Live = dynamic<ComponentProps<typeof SceneType>>(() => import("./Scene").then((m) => m.Scene), { ssr: false, loading: () => <Loading /> });

// Phones get a still photo instead of WebGL. Undefined until the first client render, so the server and the client agree.
function useNarrow() {
  const [narrow, setNarrow] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export default function Scene(props: ComponentProps<typeof SceneType>) {
  const narrow = useNarrow();
  if (narrow === undefined) return <Loading />;
  if (narrow) return <Poster alt="An agricultural drone spraying a rice field" label="STILL VIEW ON PHONES" />;
  return <Live {...props} />;
}

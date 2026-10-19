"use client";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { Scene as SceneType } from "./Scene";

const Scene = dynamic<ComponentProps<typeof SceneType>>(() => import("./Scene").then((m) => m.Scene), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading the scene</div> });
export default Scene;

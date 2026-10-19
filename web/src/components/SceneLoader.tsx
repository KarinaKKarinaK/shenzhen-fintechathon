"use client";
import dynamic from "next/dynamic";
const Scene = dynamic(() => import("./Scene").then((m) => m.Scene), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-[#9fb5b1]">Loading the scene</div> });
export default Scene;

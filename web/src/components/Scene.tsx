"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line, Sparkles, RoundedBox, Float } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import type { ChainTx, Job, MachineState, Side } from "@/engine/types";
import { Seal } from "./Logo";
import { StatusIcon } from "./StatusIcon";

// Every object here maps to engine state: the machine moves on machine events, money dots fly
// on chain events, the fence turns coral on a slash, labels show live numbers.

const INK = "#1F1A17", TURQ = "#d4a017", TURQ_SOFT = "#f3e7c3", SAND = "#ead9a9", CORAL = "#9A5B00", PLUM = "#4b5563", BONE = "#f6f3ea";

// Deterministic value noise so the world is the same on every load.
function hash(x: number, y: number) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) { return 0.6 * noise(x, y) + 0.3 * noise(x * 2.1, y * 2.1) + 0.1 * noise(x * 4.3, y * 4.3); }

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; draw(ctx);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function useTextures() {
  return useMemo(() => {
    const grain = canvasTexture(256, 256, (ctx) => { const img = ctx.createImageData(256, 256); for (let i = 0; i < img.data.length; i += 4) { const v = 200 + Math.random() * 55; img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255; } ctx.putImageData(img, 0, 0); }, [12, 12]);
    const rows = canvasTexture(256, 256, (ctx) => { ctx.fillStyle = "#8a7a3a"; ctx.fillRect(0, 0, 256, 256); for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? "#b59a48" : "#6f6230"; ctx.fillRect(0, i * 16, 256, 9); for (let j = 0; j < 40; j++) { ctx.fillStyle = `rgba(${150 + Math.random() * 60},${180 + Math.random() * 50},90,0.5)`; ctx.fillRect(Math.random() * 256, i * 16 + Math.random() * 9, 2, 2); } } }, [3, 3]);
    const rice = canvasTexture(256, 256, (ctx) => { ctx.fillStyle = "#c9a94a"; ctx.fillRect(0, 0, 256, 256); for (let i = 0; i < 24; i++) { ctx.fillStyle = i % 2 ? "#e2c66a" : "#a98b36"; ctx.fillRect(i * 11, 0, 6, 256); } for (let k = 0; k < 400; k++) { ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 3); } }, [3, 3]);
    const tiles = canvasTexture(256, 256, (ctx) => { ctx.fillStyle = "#e7e0cf"; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = "#cfc6b0"; ctx.lineWidth = 2; for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(256, i * 32); ctx.stroke(); } for (let k = 0; k < 300; k++) { ctx.fillStyle = "rgba(0,0,0,0.04)"; ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); } }, [6, 6]);
    const windows = canvasTexture(256, 256, (ctx) => { ctx.fillStyle = "#d8d2c2"; ctx.fillRect(0, 0, 256, 256); for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) { const lit = hash(x, y) > 0.55; ctx.fillStyle = lit ? "#ffd977" : "#3a3a3a"; ctx.fillRect(10 + x * 40, 10 + y * 30, 24, 18); ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(10 + x * 40, 10 + y * 30, 24, 4); } }, [1, 1]);
    const roof = canvasTexture(128, 128, (ctx) => { ctx.fillStyle = "#1F1A17"; ctx.fillRect(0, 0, 128, 128); for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? "#8A2A22" : "#5C1A15"; ctx.fillRect(0, i * 8, 128, 4); } }, [2, 2]);
    return { grain, rows, rice, tiles, windows, roof };
  }, []);
}

function Terrain({ tex }: { tex: THREE.Texture }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 60, 140, 140);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const low = new THREE.Color("#e3d6b3"), mid = new THREE.Color("#c9b57a"), high = new THREE.Color("#9c8a56"), peak = new THREE.Color("#f4efe3");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      const flat = THREE.MathUtils.smoothstep(r, 9, 16);
      const h = (fbm(x * 0.12 + 7, z * 0.12 + 3) - 0.35) * 7 * flat + Math.max(0, r - 20) * 0.25 * fbm(x * 0.05, z * 0.05);
      pos.setY(i, h);
      const t = THREE.MathUtils.clamp(h / 5, 0, 1);
      const c = h < 0.15 ? low.clone().lerp(mid, THREE.MathUtils.clamp(h / 0.15, 0, 1)) : t < 0.6 ? mid.clone().lerp(high, t / 0.6) : high.clone().lerp(peak, (t - 0.6) / 0.4);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors map={tex} roughness={0.95} metalness={0} /></mesh>;
}

function River() {
  const geo = useMemo(() => {
    const pts = [new THREE.Vector3(-30, 0.06, 12), new THREE.Vector3(-18, 0.06, 9), new THREE.Vector3(-10, 0.06, 11), new THREE.Vector3(-2, 0.06, 7.5), new THREE.Vector3(8, 0.06, 8.5), new THREE.Vector3(18, 0.06, 6), new THREE.Vector3(30, 0.06, 9)];
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 120, 1.1, 8, false);
    g.scale(1, 0.12, 1);
    return g;
  }, []);
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (m.current) m.current.emissiveIntensity = 0.25 + Math.sin(clock.elapsedTime * 1.3) * 0.08; });
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial ref={m} color="#b0b8c2" emissive="#d4a017" emissiveIntensity={0.15} roughness={0.1} metalness={0.6} transparent opacity={0.9} /></mesh>;
}

function Fields({ rows, rice }: { rows: THREE.Texture; rice: THREE.Texture }) {
  const plots: Array<[number, number, number, number, number, boolean]> = [[-4, -2.2, 10, 2.6, 0, true], [-4, 0, 7, 2, 0, false], [-4, 2.2, 10, 2.6, 0, true], [4.5, 0.2, 4, 3, 0.4, false], [-9.5, 1, 3, 6, 0.1, true]];
  return <>{plots.map(([x, z, w, h, r, isRice], i) => (
    <mesh key={i} position={[x, 0.04, z]} rotation={[-Math.PI / 2, 0, r]} receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={isRice ? rice : rows} roughness={0.9} />
    </mesh>
  ))}</>;
}

function Trees({ count = 180 }: { count?: number }) {
  const data = useMemo(() => {
    const arr: Array<{ p: [number, number, number]; s: number; c: THREE.Color }> = [];
    let i = 0;
    while (arr.length < count && i < count * 20) {
      i += 1;
      const x = (hash(i, 1) - 0.5) * 52, z = (hash(i, 2) - 0.5) * 52;
      const r = Math.sqrt(x * x + z * z);
      if (r < 13) continue;
      if (Math.abs(z - (8 + Math.sin(x * 0.3) * 2)) < 2.2) continue;
      const h = (fbm(x * 0.12 + 7, z * 0.12 + 3) - 0.35) * 7 * THREE.MathUtils.smoothstep(r, 9, 16) + Math.max(0, r - 20) * 0.25 * fbm(x * 0.05, z * 0.05);
      arr.push({ p: [x, h, z], s: 0.7 + hash(i, 3) * 0.9, c: new THREE.Color().setHSL(0.09 + hash(i, 4) * 0.06, 0.45 + hash(i, 5) * 0.25, 0.32 + hash(i, 6) * 0.18) });
    }
    return arr;
  }, [count]);
  const crown = useRef<THREE.InstancedMesh>(null), trunk = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    data.forEach((d, i) => {
      p.set(d.p[0], d.p[1] + 1.1 * d.s, d.p[2]); s.set(d.s, d.s, d.s); m.compose(p, q, s); crown.current!.setMatrixAt(i, m); crown.current!.setColorAt(i, d.c);
      p.set(d.p[0], d.p[1] + 0.35 * d.s, d.p[2]); s.set(d.s, d.s, d.s); m.compose(p, q, s); trunk.current!.setMatrixAt(i, m);
    });
    crown.current!.instanceMatrix.needsUpdate = true; if (crown.current!.instanceColor) crown.current!.instanceColor.needsUpdate = true; trunk.current!.instanceMatrix.needsUpdate = true;
  }, [data]);
  return (
    <>
      <instancedMesh ref={crown} args={[undefined, undefined, data.length]} castShadow receiveShadow><coneGeometry args={[0.7, 1.9, 7]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>
      <instancedMesh ref={trunk} args={[undefined, undefined, data.length]} castShadow><cylinderGeometry args={[0.09, 0.14, 0.7, 6]} /><meshStandardMaterial color="#5a3f2b" roughness={1} /></instancedMesh>
    </>
  );
}

function Village({ windows, roof, origin = [12, 0, -9] as [number, number, number], n = 12 }: { windows: THREE.Texture; roof: THREE.Texture; origin?: [number, number, number]; n?: number }) {
  const houses = useMemo(() => Array.from({ length: n }, (_, i) => ({ p: [origin[0] + (i % 4) * 2.6 + hash(i, 9) * 0.6, origin[2] + Math.floor(i / 4) * 2.8 + hash(i, 8) * 0.5] as [number, number], h: 1.2 + hash(i, 7) * 1.4, w: 1.6 + hash(i, 6) * 0.6 })), [n, origin]);
  return <>{houses.map((h, i) => {
    const x = h.p[0], z = h.p[1];
    const r = Math.sqrt(x * x + z * z);
    const y = (fbm(x * 0.12 + 7, z * 0.12 + 3) - 0.35) * 7 * THREE.MathUtils.smoothstep(r, 9, 16);
    return (
      <group key={i} position={[x, y, z]}>
        <mesh position={[0, h.h / 2, 0]} castShadow receiveShadow><boxGeometry args={[h.w, h.h, h.w * 0.9]} /><meshStandardMaterial map={windows} roughness={0.8} /></mesh>
        <mesh position={[0, h.h + 0.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[h.w * 0.85, 0.7, 4]} /><meshStandardMaterial map={roof} roughness={0.9} /></mesh>
      </group>
    );
  })}</>;
}

function Label({ pos, title, value, accent = "#1F1A17", y = 2.6 }: { pos: [number, number, number]; title: string; value?: string; accent?: string; y?: number }) {
  return (
    <Html position={[pos[0], y, pos[2]]} center distanceFactor={11} zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
      <div style={{ background: "#FFFFFF", color: INK, padding: "4px 8px", borderRadius: 4, fontSize: 11, lineHeight: 1.35, whiteSpace: "nowrap", border: "1px solid #E4E1D8", borderLeft: `3px solid ${accent}`, fontFamily: "var(--font-sans)" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>{value ? <div style={{ color: "#5C524A" }}>{value}</div> : null}
      </div>
    </Html>
  );
}

// The lender: a small bank hall with columns, a navy roof and a gold plaque. Instalments fly here.
function Bank({ pos, paid, total, windows }: { pos: [number, number, number]; paid: number; total: number; windows: THREE.Texture }) {
  const pct = total > 0 ? Math.min(1, paid / total) : 0;
  return (
    <group position={pos}>
      <mesh position={[0, 0.15, 0]} receiveShadow><boxGeometry args={[3.4, 0.3, 2.6]} /><meshStandardMaterial color="#e8e2d3" roughness={0.9} /></mesh>
      <mesh position={[0, 1.2, -0.3]} castShadow receiveShadow><boxGeometry args={[2.8, 1.8, 1.8]} /><meshStandardMaterial map={windows} roughness={0.85} /></mesh>
      {[-1.1, -0.37, 0.37, 1.1].map((x) => <mesh key={x} position={[x, 1.2, 0.85]} castShadow><cylinderGeometry args={[0.1, 0.12, 1.8, 10]} /><meshStandardMaterial color="#f4efe3" roughness={0.6} /></mesh>)}
      <mesh position={[0, 2.35, 0]} castShadow><boxGeometry args={[3.5, 0.5, 2.9]} /><meshStandardMaterial color="#1F1A17" roughness={0.7} /></mesh>
      <mesh position={[0, 2.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[2.2, 0.8, 4]} /><meshStandardMaterial color="#8A2A22" roughness={0.7} /></mesh>
      <mesh position={[0, 1.6, 0.95]}><boxGeometry args={[1.2, 0.3, 0.05]} /><meshStandardMaterial color={TURQ} emissive={TURQ} emissiveIntensity={0.8} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[-1.5 + pct * 3, 0.36, 1.2]}><boxGeometry args={[0.08, 0.1, 0.2]} /><meshStandardMaterial color={TURQ} emissive={TURQ} emissiveIntensity={2} /></mesh>
      <mesh position={[0, 0.33, 1.2]}><boxGeometry args={[3, 0.04, 0.12]} /><meshStandardMaterial color="#bdb5a3" /></mesh>
      <Label pos={pos} title="Lender" value={`lease ${paid.toFixed(1)} of ${total} repaid`} accent="#1F1A17" y={3.9} />
    </group>
  );
}

// The bond contract: a glass vault with a gold liquid level that rises with the bond and drops on a slash.
function Vault({ pos, bond, min, slashed }: { pos: [number, number, number]; bond: number; min: number; slashed: boolean }) {
  const liquid = useRef<THREE.Mesh>(null);
  const cap = Math.max(min * 1.6, 1);
  useFrame((_, dt) => {
    if (!liquid.current) return;
    const h = Math.max(0.02, (Math.min(bond, cap) / cap) * 1.6);
    liquid.current.scale.y = THREE.MathUtils.lerp(liquid.current.scale.y, h, dt * 3);
    liquid.current.position.y = 0.25 + liquid.current.scale.y / 2;
  });
  const low = bond < min;
  return (
    <group position={pos}>
      <mesh position={[0, 0.12, 0]} receiveShadow><cylinderGeometry args={[1.3, 1.4, 0.24, 24]} /><meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 1.05, 0]}><boxGeometry args={[1.5, 1.7, 1.5]} /><meshPhysicalMaterial color="#ffffff" transmission={0.9} thickness={0.6} roughness={0.08} transparent opacity={0.5} /></mesh>
      <lineSegments position={[0, 1.05, 0]}><edgesGeometry args={[new THREE.BoxGeometry(1.5, 1.7, 1.5)]} /><lineBasicMaterial color={low ? CORAL : TURQ} /></lineSegments>
      <mesh ref={liquid} position={[0, 0.3, 0]}><boxGeometry args={[1.38, 1, 1.38]} /><meshStandardMaterial color={low ? "#9A5B00" : "#d4a017"} emissive={low ? "#9A5B00" : "#d4a017"} emissiveIntensity={0.5} metalness={0.4} roughness={0.3} /></mesh>
      <mesh position={[0, 0.25 + (Math.min(min, cap) / cap) * 1.6, 0]}><boxGeometry args={[1.55, 0.02, 1.55]} /><meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={1.5} /></mesh>
      <mesh position={[0, 2.05, 0]}><torusGeometry args={[0.45, 0.05, 10, 40]} /><meshStandardMaterial color={TURQ} metalness={0.8} roughness={0.2} emissive={slashed ? CORAL : TURQ} emissiveIntensity={slashed ? 2 : 0.4} /></mesh>
      <Label pos={pos} title="Bond vault" value={`${bond.toFixed(0)} locked, minimum ${min}${low ? ", below minimum" : ""}`} accent={low ? "#9A5B00" : "#d4a017"} y={3.2} />
    </group>
  );
}

// The farm: a house with a notice board where jobs are posted and the fee is held.
function Farmhouse({ pos, windows, roof, job }: { pos: [number, number, number]; windows: THREE.Texture; roof: THREE.Texture; job?: Job }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 1.8, 2]} /><meshStandardMaterial map={windows} roughness={0.85} /></mesh>
      <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.9, 0.9, 4]} /><meshStandardMaterial map={roof} roughness={0.9} /></mesh>
      <group position={[1.9, 0, 0.4]}>
        <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[0.06, 1.4, 0.06]} /><meshStandardMaterial color={INK} /></mesh>
        <mesh position={[0, 1.35, 0]} castShadow><boxGeometry args={[1.1, 0.7, 0.05]} /><meshStandardMaterial color="#f6f3ea" roughness={0.9} /></mesh>
        <mesh position={[0, 1.35, 0.03]}><boxGeometry args={[0.9, 0.5, 0.01]} /><meshStandardMaterial color={job ? (job.status === "held" ? CORAL : TURQ) : "#d9d2c0"} emissive={job ? (job.status === "held" ? CORAL : TURQ) : "#000"} emissiveIntensity={job ? 0.6 : 0} /></mesh>
      </group>
      <Label pos={pos} title="Farmer, job board" value={job ? `${job.title}, fee ${job.fee} ${job.status}` : "no job posted"} accent="#d4a017" y={3.4} />
    </group>
  );
}

// Launch pad with a charging post. Energy is paid here.
function Pad({ pos }: { pos: [number, number, number] }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ring.current) (ring.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 2) * 0.4; });
  return (
    <group position={pos}>
      <mesh position={[0, 0.03, 0]} receiveShadow><cylinderGeometry args={[1.4, 1.4, 0.06, 32]} /><meshStandardMaterial color="#2b2b2b" roughness={0.8} /></mesh>
      <mesh ref={ring} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.05, 1.2, 48]} /><meshStandardMaterial color={TURQ} emissive={TURQ} emissiveIntensity={1} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.1, 0.16, 24]} /><meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={1} side={THREE.DoubleSide} /></mesh>
      <mesh position={[1.6, 0.5, 0]} castShadow><boxGeometry args={[0.3, 1, 0.3]} /><meshStandardMaterial color={INK} roughness={0.5} /></mesh>
      <mesh position={[1.6, 1.05, 0]}><boxGeometry args={[0.2, 0.1, 0.2]} /><meshStandardMaterial color={TURQ} emissive={TURQ} emissiveIntensity={2} /></mesh>
      <Label pos={pos} title="Launch pad" value="charging, energy by time of day" accent="#121212" y={1.9} />
    </group>
  );
}

// Work made visible: a darker, wet stripe grows across the field as the drone covers it.
function SprayedStrip({ job, machine }: { job?: Job; machine?: MachineState }) {
  if (!job || !machine || (job.status !== "locked" && job.status !== "running" && job.status !== "released" && job.status !== "held")) return null;
  const dx = job.to.x - job.from.x, dz = job.to.z - job.from.z;
  const len = Math.hypot(dx, dz) || 1;
  const done = job.status === "released" || job.status === "held" ? 1 : Math.max(0, Math.min(1, ((machine.position.x - job.from.x) * dx + (machine.position.z - job.from.z) * dz) / (len * len)));
  const ang = Math.atan2(dx, dz);
  return (
    <group position={[job.from.x + dx * done / 2, 0.06, job.from.z + dz * done / 2]} rotation={[0, ang, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[1.2, Math.max(0.01, len * done)]} /><meshStandardMaterial color={job.status === "held" ? "#9A5B00" : "#5a4a1a"} transparent opacity={job.status === "held" ? 0.35 : 0.45} roughness={1} /></mesh>
    </group>
  );
}

function Sticker({ job, kind }: { job: Job; kind: "seal" | "flag" }) {
  return (
    <Html position={[job.to.x, 1.2, job.to.z]} center distanceFactor={10} zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
      {kind === "seal" ? <div className="stamp" style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "1px solid #E4E1D8", borderRadius: 6, padding: "5px 10px 5px 5px", fontSize: 13, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}><Seal size={26} title="Verified" /><span><span lang="zh-Hans">已验证</span> Confirmed</span></div> : <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1px solid #9A5B00", borderRadius: 6, padding: "5px 10px", fontSize: 13, fontWeight: 600, color: "#9A5B00", whiteSpace: "nowrap" }}><StatusIcon kind="warn" />Held, log failed</div>}
    </Html>
  );
}

function Halo({ machine }: { machine?: MachineState }) {
  const r = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => { if (!r.current || !machine) return; r.current.position.lerp(new THREE.Vector3(machine.position.x, machine.position.y + 0.6, machine.position.z), dt * 4); r.current.rotation.y += dt * 1.5; (r.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 4) * 0.8; });
  if (!machine?.owned) return null;
  return <mesh ref={r} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.8, 0.04, 12, 48]} /><meshStandardMaterial color={TURQ} emissive={TURQ} emissiveIntensity={2} metalness={0.8} roughness={0.2} /></mesh>;
}

function Spray({ active, parent }: { active: boolean; parent: React.RefObject<THREE.Group | null> }) {
  const n = 240;
  const pts = useRef<THREE.Points>(null);
  const data = useMemo(() => ({ pos: new Float32Array(n * 3), life: new Float32Array(n).map(() => Math.random()) }), []);
  useFrame((_, dt) => {
    if (!pts.current || !parent.current) return;
    const p = parent.current.position;
    const a = pts.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      data.life[i] += dt * 1.6;
      if (data.life[i] > 1) { data.life[i] = active ? 0 : 1; }
      const t = data.life[i];
      const ang = hash(i, 11) * Math.PI * 2, rad = t * (0.5 + hash(i, 12) * 0.5);
      a.setXYZ(i, p.x + Math.cos(ang) * rad, p.y - 0.25 - t * (p.y - 0.1), p.z + Math.sin(ang) * rad);
    }
    a.needsUpdate = true;
    (pts.current.material as THREE.PointsMaterial).opacity = active ? 0.55 : 0;
  });
  return <points ref={pts}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.pos, 3]} /></bufferGeometry><pointsMaterial size={0.08} color={TURQ_SOFT} transparent opacity={0} depthWrite={false} /></points>;
}

function Drone({ state, trail, ambient }: { state?: MachineState; trail: THREE.Vector3[]; ambient?: { r: number; speed: number; phase: number; y: number } }) {
  const g = useRef<THREE.Group>(null);
  const rotors = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(0, 1.6, 0), []);
  const moving = ambient ? true : state?.status === "moving";
  useFrame(({ clock }, dt) => {
    if (!g.current) return;
    if (ambient) {
      const t = clock.elapsedTime * ambient.speed + ambient.phase;
      target.set(Math.cos(t) * ambient.r, ambient.y + Math.sin(t * 2) * 0.3, Math.sin(t) * ambient.r * 0.6);
      g.current.rotation.y = -t + Math.PI / 2;
    } else if (state) { target.set(state.position.x, state.position.y, state.position.z); g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, state.heading, dt * 3); }
    g.current.position.lerp(target, Math.min(1, dt * 4));
    if (rotors.current) rotors.current.children.forEach((c, i) => { c.rotation.y += dt * (moving ? 42 : 8) * (i % 2 ? 1 : -1); });
    g.current.rotation.z = THREE.MathUtils.lerp(g.current.rotation.z, moving ? 0.14 : 0, dt * 3);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, moving ? -0.08 : 0, dt * 3);
  });
  const held = state?.status === "held";
  const body = held ? CORAL : ambient ? "#d9d2c0" : BONE;
  const arms = [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const;
  return (
    <>
      <group ref={g} position={[0, 1.6, 0]}>
        <RoundedBox args={[0.62, 0.16, 0.5]} radius={0.05} smoothness={4} castShadow><meshStandardMaterial color={body} roughness={0.35} metalness={0.15} /></RoundedBox>
        <mesh position={[0, 0.12, 0]} castShadow><boxGeometry args={[0.3, 0.1, 0.26]} /><meshStandardMaterial color={INK} roughness={0.4} /></mesh>
        <mesh position={[0, -0.2, 0]} castShadow><cylinderGeometry args={[0.2, 0.22, 0.26, 16]} /><meshStandardMaterial color={TURQ_SOFT} roughness={0.2} metalness={0.1} transparent opacity={0.85} /></mesh>
        <mesh position={[0.27, -0.06, 0]}><sphereGeometry args={[0.06, 12, 12]} /><meshStandardMaterial color={INK} roughness={0.2} metalness={0.6} /></mesh>
        <mesh position={[-0.3, 0.05, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color={held ? CORAL : TURQ} emissive={held ? CORAL : TURQ} emissiveIntensity={3} /></mesh>
        {arms.map(([x, z], i) => (
          <group key={i}>
            <mesh position={[x * 0.42, 0.02, z * 0.36]} rotation={[0, Math.atan2(x, z), 0]} castShadow><boxGeometry args={[0.05, 0.05, 0.95]} /><meshStandardMaterial color={INK} roughness={0.5} /></mesh>
            <mesh position={[x * 0.78, 0.08, z * 0.66]}><cylinderGeometry args={[0.05, 0.06, 0.12, 10]} /><meshStandardMaterial color="#2b3b3b" metalness={0.5} roughness={0.4} /></mesh>
            <mesh position={[x * 0.6, -0.22, z * 0.5]} rotation={[0, 0, x * 0.25]}><cylinderGeometry args={[0.02, 0.02, 0.36, 6]} /><meshStandardMaterial color={INK} /></mesh>
          </group>
        ))}
        <group ref={rotors}>
          {arms.map(([x, z], i) => (
            <group key={i} position={[x * 0.78, 0.16, z * 0.66]}>
              <mesh><boxGeometry args={[0.72, 0.012, 0.06]} /><meshStandardMaterial color={INK} transparent opacity={0.75} /></mesh>
              <mesh rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.72, 0.012, 0.06]} /><meshStandardMaterial color={INK} transparent opacity={0.75} /></mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.37, 0.012, 6, 32]} /><meshStandardMaterial color={TURQ} emissive={TURQ} emissiveIntensity={moving ? 1.6 : 0.4} transparent opacity={0.9} /></mesh>
            </group>
          ))}
        </group>
      </group>
      {!ambient ? <Spray active={!!moving} parent={g} /> : null}
      {trail.length > 1 ? <Line points={trail} color={TURQ} lineWidth={1.5} transparent opacity={0.6} /> : null}
    </>
  );
}

function Humanoid({ state }: { state?: MachineState }) {
  const g = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null), rArm = useRef<THREE.Group>(null), lLeg = useRef<THREE.Group>(null), rLeg = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(-3, 0, 0), []);
  useFrame(({ clock }, dt) => {
    if (!g.current) return;
    if (state) target.set(state.position.x, 0, state.position.z);
    g.current.position.lerp(target, Math.min(1, dt * 4));
    const walking = state?.status === "moving" || state?.status === "returning";
    const t = clock.elapsedTime * 7;
    const sw = walking ? Math.sin(t) * 0.6 : state?.status === "working" ? Math.sin(t * 1.2) * 0.35 : 0;
    if (lArm.current) lArm.current.rotation.x = sw; if (rArm.current) rArm.current.rotation.x = -sw;
    if (lLeg.current) lLeg.current.rotation.x = walking ? -sw : 0; if (rLeg.current) rLeg.current.rotation.x = walking ? sw : 0;
    if (state) g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, state.status === "working" ? g.current.rotation.y + dt * 1.2 : state.heading, dt * 4);
    g.current.position.y = walking ? Math.abs(Math.sin(t)) * 0.04 : 0;
  });
  const shell = state?.status === "frozen" || state?.status === "held" ? CORAL : BONE;
  return (
    <group ref={g} position={[-3, 0, 0]}>
      <RoundedBox args={[0.5, 0.62, 0.3]} radius={0.1} smoothness={4} position={[0, 1.15, 0]} castShadow><meshStandardMaterial color={shell} roughness={0.35} metalness={0.1} /></RoundedBox>
      <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[0.14, 0.2, 0.22, 12]} /><meshStandardMaterial color={INK} roughness={0.5} /></mesh>
      <mesh position={[0, 1.62, 0]} castShadow><sphereGeometry args={[0.2, 24, 24]} /><meshStandardMaterial color={shell} roughness={0.3} /></mesh>
      <mesh position={[0, 1.63, 0.11]} rotation={[0.1, 0, 0]}><boxGeometry args={[0.26, 0.1, 0.2]} /><meshStandardMaterial color={INK} roughness={0.2} metalness={0.4} /></mesh>
      <mesh position={[0, 1.63, 0.21]}><boxGeometry args={[0.2, 0.03, 0.01]} /><meshStandardMaterial color={TURQ} emissive={TURQ} emissiveIntensity={3} /></mesh>
      <mesh position={[0, 1.2, 0.16]}><boxGeometry args={[0.14, 0.08, 0.01]} /><meshStandardMaterial color={TURQ} emissive={TURQ} emissiveIntensity={2} /></mesh>
      <group ref={lArm} position={[-0.34, 1.38, 0]}><mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.07, 0.42, 4, 10]} /><meshStandardMaterial color={shell} /></mesh><mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.07, 10, 10]} /><meshStandardMaterial color={INK} /></mesh></group>
      <group ref={rArm} position={[0.34, 1.38, 0]}><mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.07, 0.42, 4, 10]} /><meshStandardMaterial color={shell} /></mesh><mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.07, 10, 10]} /><meshStandardMaterial color={INK} /></mesh></group>
      <group ref={lLeg} position={[-0.13, 0.7, 0]}><mesh position={[0, -0.33, 0]} castShadow><capsuleGeometry args={[0.085, 0.5, 4, 10]} /><meshStandardMaterial color={INK} /></mesh><mesh position={[0, -0.66, 0.04]}><boxGeometry args={[0.16, 0.08, 0.26]} /><meshStandardMaterial color="#2b3b3b" /></mesh></group>
      <group ref={rLeg} position={[0.13, 0.7, 0]}><mesh position={[0, -0.33, 0]} castShadow><capsuleGeometry args={[0.085, 0.5, 4, 10]} /><meshStandardMaterial color={INK} /></mesh><mesh position={[0, -0.66, 0.04]}><boxGeometry args={[0.16, 0.08, 0.26]} /><meshStandardMaterial color="#2b3b3b" /></mesh></group>
    </group>
  );
}

function Flat({ pos, label, active, windows }: { pos: [number, number, number]; label: string; active: boolean; windows: THREE.Texture }) {
  return (
    <group position={pos}>
      <mesh position={[0, 1.1, -1.3]} receiveShadow castShadow><boxGeometry args={[3.4, 2.2, 0.12]} /><meshStandardMaterial map={windows} roughness={0.8} /></mesh>
      <mesh position={[-1.7, 1.1, 0]} receiveShadow><boxGeometry args={[0.12, 2.2, 2.6]} /><meshStandardMaterial color="#e2dac6" roughness={0.9} /></mesh>
      <mesh position={[1.7, 1.1, 0]} receiveShadow><boxGeometry args={[0.12, 2.2, 2.6]} /><meshStandardMaterial color="#e2dac6" roughness={0.9} /></mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[3.4, 2.6]} /><meshStandardMaterial color={active ? "#d6ece7" : "#efe8d6"} roughness={0.9} /></mesh>
      <mesh position={[0.9, 0.3, -0.6]} castShadow><boxGeometry args={[1.1, 0.6, 0.7]} /><meshStandardMaterial color={active ? TURQ_SOFT : "#cbbfa3"} roughness={0.7} /></mesh>
      <mesh position={[-0.9, 0.45, 0.4]} castShadow><cylinderGeometry args={[0.28, 0.28, 0.9, 16]} /><meshStandardMaterial color="#d8cfb8" roughness={0.8} /></mesh>
      <Html position={[0, 2.6, 0]} center distanceFactor={11} zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ background: active ? INK : "#FFFFFF", color: active ? "white" : INK, padding: "5px 10px", borderRadius: 6, border: "1px solid #E4E1D8", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}>{label}</div>
      </Html>
    </group>
  );
}

function Fence({ center, size, breached, height = 2.3 }: { center: [number, number, number]; size: [number, number]; breached: boolean; height?: number }) {
  const col = breached ? CORAL : TURQ;
  const box = useMemo(() => new THREE.BoxGeometry(size[0], height, size[1]), [size, height]);
  return (
    <group position={[center[0], height / 2, center[2]]}>
      <mesh geometry={box}><meshStandardMaterial color={col} transparent opacity={breached ? 0.14 : 0.06} depthWrite={false} /></mesh>
      <lineSegments><edgesGeometry args={[box]} /><lineBasicMaterial color={col} transparent opacity={0.9} /></lineSegments>
    </group>
  );
}

function MoneyDots({ txs, from, to }: { txs: ChainTx[]; from: THREE.Vector3; to: Record<string, THREE.Vector3> }) {
  const [dots, setDots] = useState<Array<{ id: string; kind: ChainTx["kind"]; t0: number }>>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = txs.filter((t) => !seen.current.has(t.hash));
    fresh.forEach((t) => seen.current.add(t.hash));
    if (fresh.length) setDots((d) => [...d, ...fresh.map((t) => ({ id: t.hash, kind: t.kind, t0: performance.now() }))].slice(-14));
  }, [txs]);
  return <>{dots.map((d) => <Dot key={d.id} dot={d} from={from} to={to} />)}</>;
}

function Dot({ dot, from, to }: { dot: { id: string; kind: ChainTx["kind"]; t0: number }; from: THREE.Vector3; to: Record<string, THREE.Vector3> }) {
  const m = useRef<THREE.Mesh>(null);
  const tail = useRef<THREE.Mesh>(null);
  const inbound = dot.kind === "fee_in" || dot.kind === "top_up" || dot.kind === "bounty" || dot.kind === "release";
  const danger = dot.kind === "slash" || dot.kind === "refund";
  const target = to[dot.kind] ?? to.default;
  useFrame(() => {
    if (!m.current) return;
    const k = Math.min(1, (performance.now() - dot.t0) / 1500);
    const a = inbound ? target : from, b = inbound ? from : target;
    m.current.position.lerpVectors(a, b, k); m.current.position.y += Math.sin(k * Math.PI) * 1.6 + 0.6;
    m.current.visible = k < 1;
    if (tail.current) { const k2 = Math.max(0, k - 0.06); tail.current.position.lerpVectors(a, b, k2); tail.current.position.y += Math.sin(k2 * Math.PI) * 1.6 + 0.6; tail.current.visible = k < 1; }
  });
  const col = danger ? CORAL : inbound ? TURQ : PLUM;
  return (<>
    <mesh ref={m}><sphereGeometry args={[0.11, 14, 14]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={2.5} /></mesh>
    <mesh ref={tail}><sphereGeometry args={[0.07, 10, 10]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.5} transparent opacity={0.5} /></mesh>
  </>);
}

function Lamp({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[0.04, 0.06, 2.8, 8]} /><meshStandardMaterial color={INK} /></mesh>
      <mesh position={[0, 2.85, 0]}><sphereGeometry args={[0.12, 12, 12]} /><meshStandardMaterial color="#fff2c7" emissive="#ffd98a" emissiveIntensity={2} /></mesh>
      <pointLight position={[0, 2.8, 0]} color="#ffd98a" intensity={1.8} distance={6} />
    </group>
  );
}

function World({ side, machine, txs, jobs, breached, live }: { side: Side; machine?: MachineState; txs: ChainTx[]; jobs: Record<string, Job>; breached?: boolean; live?: boolean }) {
  const tex = useTextures();
  const trailRef = useRef<THREE.Vector3[]>([]);
  const [trail, setTrail] = useState<THREE.Vector3[]>([]);
  useEffect(() => {
    if (!machine || side !== "fleet") return;
    const v = new THREE.Vector3(machine.position.x, machine.position.y, machine.position.z);
    const last = trailRef.current[trailRef.current.length - 1];
    if (!last || last.distanceTo(v) > 0.2) { trailRef.current = [...trailRef.current, v].slice(-60); setTrail(trailRef.current); }
  }, [machine, side]);
  const origin = useMemo(() => new THREE.Vector3(side === "fleet" ? 0 : -3, 0.8, 0), [side]);
  const lenderPos: [number, number, number] = side === "fleet" ? [6.5, 0, -5] : [6, 0, -3];
  const bondPos: [number, number, number] = side === "fleet" ? [2.5, 0, 5.6] : [0, 0, 3.6];
  const boardPos: [number, number, number] = side === "fleet" ? [-6.5, 0, -5] : [3, 0.1, 0];
  const padPos: [number, number, number] = [-5.5, 0, 4.6];
  const targets = useMemo(() => {
    const v = (p: [number, number, number]) => new THREE.Vector3(p[0], 1.2, p[2]);
    return { default: v(lenderPos), instalment: v(lenderPos), title: v(lenderPos), fee_in: v(boardPos), lock: v(boardPos), release: v(boardPos), refund: v(boardPos), bond_fill: v(bondPos), slash: v(bondPos), bounty: v(bondPos), top_up: v(bondPos), cover: v(padPos), energy: v(padPos) };
  }, [side]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeJob = Object.values(jobs).find((j) => j.status === "locked" || j.status === "running");
  const jobList = Object.values(jobs);
  const lastJob = activeJob ?? jobList[jobList.length - 1];
  const [recent, setRecent] = useState(false);
  useEffect(() => { if (lastJob?.status === "released") { setRecent(true); const t = setTimeout(() => setRecent(false), 2600); return () => clearTimeout(t); } }, [lastJob?.id, lastJob?.status]);
  const m = machine;
  return (
    <>
      <hemisphereLight args={["#fff5e6", "#e8c46a", 0.9]} />
      <directionalLight position={[14, 18, 8]} intensity={1.6} color="#fff4df" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-bias={-0.0004} />
      <ambientLight intensity={0.25} />
      <fog attach="fog" args={["#f3e7c3", 26, 60]} />
      {side === "fleet" ? (<>
        <Terrain tex={tex.grain} />
        <River />
        <Fields rows={tex.rows} rice={tex.rice} />
        <Trees />
        <Village windows={tex.windows} roof={tex.roof} />
        <Fence center={[0, 0, 0]} size={[12, 7.5]} breached={!!breached} height={2.4} />
        <Sparkles count={120} scale={[14, 4, 9]} position={[0, 1.6, 0]} size={2} speed={0.3} color={TURQ_SOFT} />
        <Drone state={m} trail={trail} />
        <Drone trail={[]} ambient={{ r: 9.5, speed: 0.22, phase: 1.2, y: 3.2 }} />
        {!live ? <Drone trail={[]} ambient={{ r: 7, speed: -0.17, phase: 3.9, y: 2.6 }} /> : null}
        <Farmhouse pos={boardPos} windows={tex.windows} roof={tex.roof} job={lastJob} />
        <Pad pos={padPos} />
        <SprayedStrip job={lastJob} machine={m} />
        {lastJob && lastJob.status === "released" && recent ? <Sticker job={lastJob} kind="seal" /> : null}
        {lastJob && lastJob.status === "held" ? <Sticker job={lastJob} kind="flag" /> : null}
        <Halo machine={m} />
      </>) : (<>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial map={tex.tiles} roughness={0.95} /></mesh>
        <mesh position={[0, 3.2, -8]} receiveShadow castShadow><boxGeometry args={[18, 6.4, 3]} /><meshStandardMaterial map={tex.windows} roughness={0.85} /></mesh>
        <mesh position={[-12, 2.4, -2]} receiveShadow castShadow><boxGeometry args={[3, 4.8, 10]} /><meshStandardMaterial map={tex.windows} roughness={0.85} /></mesh>
        <Flat pos={[-3, 0, 0]} label="Owner, flat 4A" active={false} windows={tex.windows} />
        <Flat pos={[3, 0, 0]} label="Neighbour, flat 4B" active={!!activeJob} windows={tex.windows} />
        <Fence center={[3, 0, 0]} size={[3.6, 2.9]} breached={!!breached} />
        <Lamp pos={[0, 0, 2.6]} /><Lamp pos={[-7, 0, 2.6]} /><Lamp pos={[7, 0, 2.6]} />
        <Trees count={70} />
        <Sparkles count={60} scale={[14, 3, 8]} position={[0, 1.5, 0]} size={1.6} speed={0.2} color={TURQ_SOFT} />
        <Humanoid state={m} />
        <Float speed={1.5} rotationIntensity={0} floatIntensity={0.6}><mesh position={[3, 2.2, 0]}><torusGeometry args={[1.3, 0.015, 8, 64]} /><meshStandardMaterial color={breached ? CORAL : TURQ} emissive={breached ? CORAL : TURQ} emissiveIntensity={1.5} /></mesh></Float>
      </>)}
      <Bank pos={lenderPos} paid={m ? m.leaseTotal - m.leaseBalance : 0} total={m?.leaseTotal ?? 1} windows={tex.windows} />
      <Vault pos={bondPos} bond={m?.bond ?? 0} min={m?.bondMin ?? 0} slashed={!!breached} />
      <MoneyDots txs={txs} from={origin} to={targets} />
    </>
  );
}

export function Scene({ side, machine, txs, jobs, breached, autoRotate = false, live = true }: { side: Side; machine?: MachineState; txs: ChainTx[]; jobs: Record<string, Job>; breached?: boolean; autoRotate?: boolean; live?: boolean }) {
  return (
    <Canvas shadows camera={{ position: side === "fleet" ? [13, 9, 15] : [9, 6.5, 10], fov: 34 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} style={{ background: "transparent" }}>
      <World side={side} machine={machine} txs={txs} jobs={jobs} breached={breached} live={live} />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.85} intensity={0.9} mipmapBlur radius={0.6} />
        <Vignette eskil={false} offset={0.2} darkness={0.35} />
      </EffectComposer>
      <OrbitControls enablePan={false} minDistance={7} maxDistance={32} maxPolarAngle={Math.PI / 2.15} autoRotate={autoRotate} autoRotateSpeed={0.5} enableDamping target={[0, 0.8, 0]} />
    </Canvas>
  );
}

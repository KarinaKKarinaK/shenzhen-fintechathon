"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Html, Line } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import type { ChainTx, Job, MachineState, Side } from "@/engine/types";

// The scene is the memorable element. Everything in it maps to a real state change in the engine:
// the machine moves on machine events, money dots fly on chain events, the fence turns red on a slash.

const TEAL = "#119e9b", GLOW = "#63dcd2", IND = "#5b63b7", RUST = "#c4502b", BONE = "#e6dfcf", DARK = "#15302d";

function lerpVec(cur: THREE.Vector3, target: THREE.Vector3, a: number) { cur.lerp(target, a); }

function Humanoid({ state }: { state?: MachineState }) {
  const g = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (!g.current) return;
    if (state) target.set(state.position.x, 0, state.position.z);
    lerpVec(g.current.position, target, Math.min(1, dt * 4));
    const t = performance.now() / 1000;
    g.current.children[0].position.y = 0.95 + (state?.status === "working" ? Math.sin(t * 6) * 0.03 : 0);
    if (state?.status === "working") g.current.rotation.y += dt * 1.5;
    else if (state) g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, state.heading, dt * 4);
  });
  const col = state?.status === "frozen" || state?.status === "held" ? RUST : state?.status === "working" ? GLOW : BONE;
  return (
    <group ref={g} position={[-3, 0, 0]}>
      <mesh position={[0, 0.95, 0]}><capsuleGeometry args={[0.22, 0.7, 6, 14]} /><meshStandardMaterial color={col} roughness={0.5} /></mesh>
      <mesh position={[0, 1.65, 0]}><sphereGeometry args={[0.2, 20, 20]} /><meshStandardMaterial color={DARK} roughness={0.4} /></mesh>
      <mesh position={[0.12, 1.68, 0.16]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial emissive={GLOW} emissiveIntensity={3} color={GLOW} /></mesh>
      <mesh position={[-0.3, 1.0, 0]} rotation={[0, 0, 0.2]}><capsuleGeometry args={[0.07, 0.6, 4, 8]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[0.3, 1.0, 0]} rotation={[0, 0, -0.2]}><capsuleGeometry args={[0.07, 0.6, 4, 8]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[-0.12, 0.3, 0]}><capsuleGeometry args={[0.08, 0.5, 4, 8]} /><meshStandardMaterial color={DARK} /></mesh>
      <mesh position={[0.12, 0.3, 0]}><capsuleGeometry args={[0.08, 0.5, 4, 8]} /><meshStandardMaterial color={DARK} /></mesh>
    </group>
  );
}

function Drone({ state, trail }: { state?: MachineState; trail: THREE.Vector3[] }) {
  const g = useRef<THREE.Group>(null);
  const rotors = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(0, 1.5, 0), []);
  useFrame((_, dt) => {
    if (!g.current) return;
    if (state) target.set(state.position.x, state.position.y, state.position.z);
    lerpVec(g.current.position, target, Math.min(1, dt * 4));
    if (rotors.current) rotors.current.rotation.y += dt * (state?.status === "moving" ? 40 : 6);
    if (state) g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, state.heading, dt * 3);
    g.current.rotation.z = THREE.MathUtils.lerp(g.current.rotation.z, state?.status === "moving" ? 0.12 : 0, dt * 3);
  });
  const col = state?.status === "held" ? RUST : BONE;
  return (
    <>
      <group ref={g} position={[0, 1.5, 0]}>
        <mesh><boxGeometry args={[0.5, 0.14, 0.5]} /><meshStandardMaterial color={col} roughness={0.45} /></mesh>
        <mesh position={[0, -0.14, 0]}><cylinderGeometry args={[0.16, 0.2, 0.14, 12]} /><meshStandardMaterial color={DARK} /></mesh>
        <group ref={rotors}>
          {[[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]].map(([x, z], i) => (
            <group key={i} position={[x, 0.08, z]}>
              <mesh rotation={[0, 0, 0]}><boxGeometry args={[0.02, 0.02, 0.6]} /><meshStandardMaterial color={DARK} /></mesh>
              <mesh><torusGeometry args={[0.3, 0.012, 6, 24]} /><meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={0.6} /></mesh>
            </group>
          ))}
        </group>
        {[[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]].map(([x, z], i) => (
          <mesh key={i} position={[x / 2, 0, z / 2]} rotation={[0, Math.atan2(x, z), 0]}><boxGeometry args={[0.04, 0.04, 0.72]} /><meshStandardMaterial color={DARK} /></mesh>
        ))}
        {state?.status === "working" || state?.status === "moving" ? <mesh position={[0, -0.3, 0]}><coneGeometry args={[0.6, 0.5, 16, 1, true]} /><meshStandardMaterial color={GLOW} transparent opacity={0.12} side={THREE.DoubleSide} /></mesh> : null}
      </group>
      {trail.length > 1 ? <Line points={trail} color={GLOW} lineWidth={1.2} transparent opacity={0.5} /> : null}
    </>
  );
}

function MoneyDots({ txs, from, to }: { txs: ChainTx[]; from: THREE.Vector3; to: Record<string, THREE.Vector3> }) {
  const [dots, setDots] = useState<Array<{ id: string; kind: ChainTx["kind"]; t0: number }>>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = txs.filter((t) => !seen.current.has(t.hash));
    fresh.forEach((t) => seen.current.add(t.hash));
    if (fresh.length) setDots((d) => [...d, ...fresh.map((t) => ({ id: t.hash, kind: t.kind, t0: performance.now() }))].slice(-12));
  }, [txs]);
  return <>{dots.map((d) => <Dot key={d.id} dot={d} from={from} to={to} />)}</>;
}

function Dot({ dot, from, to }: { dot: { id: string; kind: ChainTx["kind"]; t0: number }; from: THREE.Vector3; to: Record<string, THREE.Vector3> }) {
  const m = useRef<THREE.Mesh>(null);
  const inbound = dot.kind === "fee_in" || dot.kind === "top_up" || dot.kind === "bounty";
  const danger = dot.kind === "slash" || dot.kind === "refund";
  const target = to[dot.kind] ?? to.default;
  useFrame(() => {
    if (!m.current) return;
    const k = Math.min(1, (performance.now() - dot.t0) / 1400);
    const a = inbound ? target : from, b = inbound ? from : target;
    m.current.position.lerpVectors(a, b, k);
    m.current.position.y += Math.sin(k * Math.PI) * 1.2 + 0.4;
    m.current.visible = k < 1;
  });
  const col = danger ? RUST : inbound ? TEAL : IND;
  return <mesh ref={m}><sphereGeometry args={[0.09, 12, 12]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.2} /></mesh>;
}

function Fence({ center, size, breached }: { center: [number, number, number]; size: [number, number]; breached: boolean }) {
  const pts = useMemo(() => {
    const [cx, , cz] = center, [w, h] = size;
    const y = 0.02;
    return [new THREE.Vector3(cx - w / 2, y, cz - h / 2), new THREE.Vector3(cx + w / 2, y, cz - h / 2), new THREE.Vector3(cx + w / 2, y, cz + h / 2), new THREE.Vector3(cx - w / 2, y, cz + h / 2), new THREE.Vector3(cx - w / 2, y, cz - h / 2)];
  }, [center, size]);
  return (
    <>
      <Line points={pts} color={breached ? RUST : GLOW} lineWidth={2} dashed dashSize={0.25} gapSize={0.15} />
      <mesh position={[center[0], 0.01, center[2]]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={size} /><meshStandardMaterial color={breached ? RUST : TEAL} transparent opacity={0.08} /></mesh>
    </>
  );
}

function Pylon({ pos, label, color = DARK }: { pos: [number, number, number]; label: string; color?: string }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.18, 0.26, 1, 6]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      <mesh position={[0, 1.08, 0]}><sphereGeometry args={[0.12, 12, 12]} /><meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.5} /></mesh>
      <Html position={[0, 1.5, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
        <div style={{ background: "rgba(14,31,30,0.85)", color: "#e6f2ef", padding: "4px 8px", borderRadius: 8, fontSize: 11, whiteSpace: "nowrap", border: "1px solid rgba(99,220,210,0.4)" }}>{label}</div>
      </Html>
    </group>
  );
}

function Flat({ pos, label, active }: { pos: [number, number, number]; label: string; active: boolean }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.9, 0]}><boxGeometry args={[2.6, 1.8, 2.6]} /><meshStandardMaterial color={active ? TEAL : BONE} transparent opacity={0.16} /></mesh>
      <lineSegments position={[0, 0.9, 0]}><edgesGeometry args={[new THREE.BoxGeometry(2.6, 1.8, 2.6)]} /><lineBasicMaterial color={active ? GLOW : "#9aa6a2"} /></lineSegments>
      <Html position={[0, 2.1, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
        <div style={{ background: "rgba(14,31,30,0.85)", color: "#e6f2ef", padding: "4px 8px", borderRadius: 8, fontSize: 11, whiteSpace: "nowrap" }}>{label}</div>
      </Html>
    </group>
  );
}

function FieldRows() {
  const rows = useMemo(() => Array.from({ length: 9 }, (_, i) => -4 + i), []);
  return <>{rows.map((z) => <mesh key={z} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 0.35]} /><meshStandardMaterial color={z % 2 ? "#1f4a3a" : "#24573f"} roughness={1} /></mesh>)}</>;
}

export function Scene({ side, machine, txs, jobs, breached, autoRotate = false }: { side: Side; machine?: MachineState; txs: ChainTx[]; jobs: Record<string, Job>; breached?: boolean; autoRotate?: boolean }) {
  const trailRef = useRef<THREE.Vector3[]>([]);
  const [trail, setTrail] = useState<THREE.Vector3[]>([]);
  useEffect(() => {
    if (!machine || side !== "fleet") return;
    const v = new THREE.Vector3(machine.position.x, machine.position.y, machine.position.z);
    const last = trailRef.current[trailRef.current.length - 1];
    if (!last || last.distanceTo(v) > 0.2) { trailRef.current = [...trailRef.current, v].slice(-40); setTrail(trailRef.current); }
  }, [machine, side]);

  const origin = useMemo(() => new THREE.Vector3(side === "fleet" ? 0 : -3, 0.6, 0), [side]);
  const targets = useMemo(() => ({
    default: new THREE.Vector3(4.5, 0.6, -3.5),
    instalment: new THREE.Vector3(4.5, 0.6, -3.5),
    title: new THREE.Vector3(4.5, 0.6, -3.5),
    fee_in: new THREE.Vector3(side === "fleet" ? -4.5 : 3, 0.6, side === "fleet" ? -3.5 : 0),
    lock: new THREE.Vector3(side === "fleet" ? -4.5 : 3, 0.6, side === "fleet" ? -3.5 : 0),
    release: new THREE.Vector3(side === "fleet" ? -4.5 : 3, 0.6, side === "fleet" ? -3.5 : 0),
    refund: new THREE.Vector3(side === "fleet" ? -4.5 : 3, 0.6, side === "fleet" ? -3.5 : 0),
    bond_fill: new THREE.Vector3(0, 0.6, 3.8),
    slash: new THREE.Vector3(0, 0.6, 3.8),
    bounty: new THREE.Vector3(0, 0.6, 3.8),
    top_up: new THREE.Vector3(0, 0.6, 3.8),
    cover: new THREE.Vector3(-4.5, 0.6, 3.5),
    energy: new THREE.Vector3(-4.5, 0.6, 3.5),
  }), [side]);
  const activeJob = Object.values(jobs).find((j) => j.status === "locked" || j.status === "running");

  return (
    <Canvas camera={{ position: [7.5, 6.5, 8.5], fov: 38 }} dpr={[1, 1.8]} gl={{ antialias: true }}>
      <color attach="background" args={["#0e1f1e"]} />
      <fog attach="fog" args={["#0e1f1e", 14, 30]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 10, 4]} intensity={1.4} color="#fff6e5" />
      <pointLight position={[0, 3, 0]} intensity={6} color={GLOW} distance={12} />
      <Grid args={[14, 14]} cellColor="#1d3a37" sectionColor="#2b5551" fadeDistance={22} infiniteGrid position={[0, 0, 0]} />
      {side === "fleet" ? <FieldRows /> : null}
      {side === "neighbour" ? (<>
        <Flat pos={[-3, 0, 0]} label="Owner, flat 4A" active={false} />
        <Flat pos={[3, 0, 0]} label="Neighbour, flat 4B" active={!!activeJob} />
        <Fence center={[3, 0, 0]} size={[3, 3]} breached={!!breached} />
        <Humanoid state={machine} />
      </>) : (<>
        <Fence center={[0, 0, 0]} size={[10, 6]} breached={!!breached} />
        <Drone state={machine} trail={trail} />
        <Pylon pos={[-4.5, 0, -3.5]} label="Farmer, job board" />
        <Pylon pos={[-4.5, 0, 3.5]} label="Charging pad" />
      </>)}
      <Pylon pos={[4.5, 0, -3.5]} label="Lender, lease contract" color="#0b6f6d" />
      <Pylon pos={[0, 0, 3.8]} label="Bond contract" color="#5b63b7" />
      <MoneyDots txs={txs} from={origin} to={targets} />
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} maxPolarAngle={Math.PI / 2.1} autoRotate={autoRotate} autoRotateSpeed={0.6} enableDamping />
    </Canvas>
  );
}

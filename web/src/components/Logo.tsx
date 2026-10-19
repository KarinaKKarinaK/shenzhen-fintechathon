import { Seal } from "./Seal";

// The rail mark and the wordmark. The seal is the brand: 自食 on a red stamp, with 自食其力 as the idiom.
export function Mark({ size = 36 }: { size?: number }) {
  return <Seal size={size} />;
}
export function Wordmark({ h = 22 }: { h?: number }) {
  return (
    <span className="flex flex-col leading-tight" style={{ fontSize: h * 0.8 }}>
      <span className="font-bold text-ink">Zishi <span lang="zh-Hans" className="cjk-serif">自食</span></span>
      <span className="text-[12px] text-ink-2"><span lang="zh-Hans" className="cjk-serif">自食其力</span>, software that lets machines pay for themselves</span>
    </span>
  );
}
export function Logo({ size = 34 }: { size?: number }) {
  return (<span className="inline-flex items-center gap-3"><Mark size={size} /><Wordmark /></span>);
}

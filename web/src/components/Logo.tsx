export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ead9a9" /><stop offset="1" stopColor="#3db1b8" /></linearGradient></defs>
      <rect x="2" y="2" width="36" height="36" rx="12" fill="url(#g)" />
      <path d="M12 26V14h4l4 7 4-7h4v12" stroke="#1b2a2a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} />
      <span className="flex flex-col leading-none"><span className="text-lg font-800 tracking-tight" style={{ fontWeight: 800 }}>JiXin</span><span className="text-[11px] text-muted">机信, machine credit</span></span>
    </span>
  );
}

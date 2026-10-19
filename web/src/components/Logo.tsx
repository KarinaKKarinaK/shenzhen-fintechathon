// Seal stamp plus a chamfered wordmark. The seal is the banking tradition, the wordmark is the machine.
export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect x="1" y="1" width="38" height="38" rx="3" fill="#c8102e" />
      <rect x="4" y="4" width="32" height="32" rx="1" fill="none" stroke="#f3e7c3" strokeWidth="1.2" />
      <text x="20" y="27" textAnchor="middle" fontSize="19" fontWeight="700" fill="#fbfaf7" fontFamily="serif">机信</text>
    </svg>
  );
}
export function Wordmark({ h = 22 }: { h?: number }) {
  // Letters drawn as chamfered strokes.
  const s = h / 22;
  return (
    <svg height={h} viewBox="0 0 215 22" aria-label="JiXin" style={{ display: "block" }}>
      <g fill="#121212" transform={`scale(${s}) scale(${1 / s})`}>
        <path d="M2 0h14v4H10v13l-3 5H0v-4h5V4H2z" />
        <path d="M20 0h5v22h-5z" />
        <path d="M30 0h6l5 7 5-7h6l-8 11 8 11h-6l-5-7-5 7h-6l8-11z" />
        <path d="M56 0h5v22h-5z" />
        <path d="M66 0h5l10 13V0h5v22h-5L71 9v13h-5z" />
      </g>
      <text x="92" y="16" fontSize="11" fill="#7a7a76" fontFamily="var(--font-tech)" letterSpacing="0.14em">MACHINE CREDIT</text>
    </svg>
  );
}
export function Logo({ size = 34 }: { size?: number }) {
  return (<span className="inline-flex items-center gap-3"><Mark size={size} /><Wordmark /></span>);
}

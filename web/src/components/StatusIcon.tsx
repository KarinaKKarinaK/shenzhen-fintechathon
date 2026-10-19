import { Seal } from "./Logo";

// Status is never colour alone: every state is an icon plus a word.
export type StatusKind = "ok" | "warn" | "slashed" | "pass" | "fail";

export function StatusIcon({ kind, size = 16 }: { kind: StatusKind; size?: number }) {
  if (kind === "ok") return <Seal size={size} title="Verified" />;
  if (kind === "slashed") return <Seal size={size + 2} variant="broken" title="Bond slashed" />;
  if (kind === "warn") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Warning" className="shrink-0 text-warn">
      <path d="M12 3.5 22 20.5H2z" /><path d="M12 10v4.5M12 17.5v.01" />
    </svg>
  );
  if (kind === "fail") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" role="img" aria-label="Failed" className="shrink-0 text-warn">
      <circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Passed" className="shrink-0 text-ink">
      <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" />
    </svg>
  );
}

export function Status({ kind, children, className = "" }: { kind: StatusKind; children: React.ReactNode; className?: string }) {
  const tone = kind === "warn" || kind === "fail" ? "status-warn" : kind === "slashed" ? "status-slashed" : "status-ok";
  return <span className={`status ${tone} ${className}`}><StatusIcon kind={kind} />{children}</span>;
}

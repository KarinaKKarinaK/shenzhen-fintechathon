export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="2" y="2" width="28" height="28" rx="9" fill="#14302d" />
        <path d="M9 20.5c1.6 2 4 3 7 3 3.8 0 6-1.7 6-4.2 0-2.6-2.2-3.5-5.7-4.2C13.2 14.5 11 13.6 11 11.4 11 9.2 13 8 16.2 8c2.6 0 4.6.9 6 2.6" stroke="#63dcd2" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="serif text-xl leading-none">Surety</span>
    </span>
  );
}

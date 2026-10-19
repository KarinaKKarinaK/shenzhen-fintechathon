// Every amount in the UI is yuan. One formatter so the sign and the separators never drift.
export function yuan(n: number | undefined | null, decimals = 0): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return "¥" + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function timeOf(ms?: number): string {
  return ms ? new Date(ms).toLocaleTimeString("en-GB", { hour12: false }) : "";
}

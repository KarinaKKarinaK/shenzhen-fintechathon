// CUSUM change detector, the statistical process control chart from manufacturing (Page, 1954).
// It watches a stream of numbers for a sustained upward shift in the mean. Each observation adds
// its excess over the target, less a slack k, to a running sum that never goes below zero; the
// sum crosses h only when the shift persists, so a single outlier does not alarm but a run of
// them does. k is half the shift worth detecting, h sets the trade off between delay and false alarms.

export interface CusumParams { target: number; k: number; h: number }
export interface CusumState { s: number; alarm: boolean; observations: number; alarms: number; lastAlarmAt: number | null; history: number[] }

const HISTORY = 120;

export class Cusum {
  private s = 0;
  private n = 0;
  private alarms = 0;
  private lastAlarmAt: number | null = null;
  private readonly history: number[] = [];

  constructor(readonly params: CusumParams) {}

  // One observation. On alarm the sum resets so the next shift is detected on its own.
  observe(x: number): { s: number; alarm: boolean } {
    if (!Number.isFinite(x)) return { s: this.s, alarm: false };
    const { target, k, h } = this.params;
    this.n += 1;
    this.s = Math.max(0, this.s + (x - target) - k);
    const alarm = this.s > h;
    this.history.push(round(this.s));
    if (this.history.length > HISTORY) this.history.shift();
    if (alarm) { this.alarms += 1; this.lastAlarmAt = this.n; this.s = 0; }
    return { s: round(alarm ? h : this.s), alarm };
  }

  // Alarm is shown as true for the window of observations right after it fired, so a poll
  // every few seconds still sees it.
  state(): CusumState {
    const recent = this.lastAlarmAt !== null && this.n - this.lastAlarmAt < 20;
    return { s: round(this.s), alarm: recent, observations: this.n, alarms: this.alarms, lastAlarmAt: this.lastAlarmAt, history: [...this.history] };
  }

  reset() { this.s = 0; this.n = 0; this.alarms = 0; this.lastAlarmAt = null; this.history.length = 0; }
}

function round(v: number) { return Math.round(v * 1000) / 1000; }

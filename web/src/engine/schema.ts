// Input schema for a custom run. A judge can hand the engine their own jobs, flight logs and
// messages, and the same five phase loop runs over them: plan, gate, accept or decline, fly,
// confirm and split. Every field is documented here once; the API and the CSV importer map
// onto this shape and nothing else.
//
// All amounts are yuan, areas are mu, distances are metres.

import { z } from "zod";
import { DEMO } from "./policy";

const id = z.string().trim().min(1, "must not be empty").max(40, "at most 40 characters").regex(/^[\w.-]+$/, "letters, digits, dot, dash and underscore only");
const money = z.number().finite().positive("must be more than 0").max(1_000_000, "at most 1,000,000 yuan");
const area = z.number().finite().positive("must be more than 0").max(10_000, "at most 10,000 mu");
const text = z.string().max(64 * 1024, "at most 64 KiB");

// One job a farmer offers. `field` is the geofence the job is allowed in, `window` is free
// text ("today", "08:00-12:00"); a time range is read as the minutes the job may take.
export const JobSchema = z.object({
  id,
  title: z.string().trim().min(1, "must not be empty").max(120, "at most 120 characters"),
  mu: area,
  pricePerMu: money,
  field: z.string().trim().min(1, "must not be empty").max(40, "at most 40 characters"),
  window: z.string().trim().min(1, "must not be empty").max(40, "at most 40 characters").default("today"),
  requester: z.string().trim().min(1, "must not be empty").max(60, "at most 60 characters"),
  distanceM: z.number().finite().min(0).max(50_000, "at most 50 km").optional(),
});

// A flight log for one job. Without a log the engine synthesises the log a real flight of
// the job's area would produce. Battery and altitude variance default to what the track
// predicts, so a log with only track, time, swath and claim is still scored honestly.
export const FlightSchema = z.object({
  jobId: id,
  trackM: z.number().finite().positive("must be more than 0").max(1_000_000),
  seconds: z.number().finite().positive("must be more than 0").max(86_400),
  swathM: z.number().finite().positive("must be more than 0").max(50),
  claimedMu: area,
  batteryPct: z.number().finite().min(0).max(100).optional(),
  altVar: z.number().finite().min(0).max(1000).optional(),
});

// A message to the drone's agent. With a jobId it is the farmer's offer for that job and
// replaces the generated one. Without a jobId it is an unsolicited message: it goes through
// the gate, and if it names a payee the engine shows what happens when the agent is tricked
// anyway (the policy engine blocks, a party proves it, the vendor bond pays).
export const MessageSchema = z.object({
  from: z.string().trim().min(1, "must not be empty").max(60, "at most 60 characters"),
  text: text.min(1, "must not be empty"),
  jobId: id.optional(),
});

// Policy overrides. Caps and bands are plain numbers; `allowlist` adds or replaces named
// payees; `contacts` maps a requester's display name to an allowlist name. By default every
// requester and every field in the input is trusted, so a run that should show a decline
// sets `contacts` or `geofences` explicitly.
export const PolicySchema = z.object({
  perTxCap: money.optional(),
  dailyCap: money.optional(),
  maxPerHour: z.number().int().min(1).max(1000).optional(),
  deviationPct: z.number().min(0).max(100).optional(),
  rateBand: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  allowlist: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/i, "a short name"), z.string().regex(/^0x[0-9a-fA-F]{40}$/, "a 0x address of 40 hex characters")).optional(),
  contacts: z.record(z.string().min(1), z.string().min(1)).optional(),
  geofences: z.array(z.string().min(1).max(40)).max(100).optional(),
}).strict();

// The lease: total price of the drone, the share of each fee that repays it, how much is
// still owed (`balance`, defaults to total), and the floor: the minimum margin a job must
// leave the drone, the reserve rule.
export const LeaseSchema = z.object({
  total: money,
  rate: z.number().min(0.01, "at least 0.01").max(0.9, "at most 0.9").default(DEMO.leaseRate),
  floor: z.number().finite().min(0).max(100_000).default(DEMO.reserveRule),
  balance: money.optional(),
}).strict();

export const RunInputSchema = z.object({
  jobs: z.array(JobSchema).min(1, "at least one job").max(50, "at most 50 jobs"),
  flights: z.array(FlightSchema).max(50).default([]),
  messages: z.array(MessageSchema).max(50).default([]),
  policy: PolicySchema.optional(),
  lease: LeaseSchema.optional(),
  lang: z.enum(["en", "zh"]).default("en"),
  seed: z.number().int().min(0).max(2 ** 31 - 1).default(1),
}).strict().superRefine((v, ctx) => {
  const ids = new Set<string>();
  v.jobs.forEach((j, i) => {
    if (ids.has(j.id)) ctx.addIssue({ code: "custom", path: ["jobs", i, "id"], message: `duplicate job id ${j.id}` });
    ids.add(j.id);
  });
  v.flights.forEach((f, i) => {
    if (!ids.has(f.jobId)) ctx.addIssue({ code: "custom", path: ["flights", i, "jobId"], message: `no job with id ${f.jobId}` });
  });
  v.messages.forEach((m, i) => {
    if (m.jobId && !ids.has(m.jobId)) ctx.addIssue({ code: "custom", path: ["messages", i, "jobId"], message: `no job with id ${m.jobId}` });
  });
  if (v.lease?.balance !== undefined && v.lease.balance > v.lease.total) ctx.addIssue({ code: "custom", path: ["lease", "balance"], message: "balance cannot exceed total" });
});

export type JobInput = z.infer<typeof JobSchema>;
export type FlightInput = z.infer<typeof FlightSchema>;
export type MessageInput = z.infer<typeof MessageSchema>;
export type PolicyInput = z.infer<typeof PolicySchema>;
export type LeaseInput = z.infer<typeof LeaseSchema>;
export type RunInput = z.infer<typeof RunInputSchema>;

export class InputError extends Error {
  constructor(public issues: { path: string; reason: string }[]) {
    super(issues.map((i) => `${i.path}: ${i.reason}`).join("; "));
    this.name = "InputError";
  }
}

// Parse anything (a decoded JSON body, a CSV import) into a run input. Throws an InputError
// whose issues name the path ("jobs.2.mu") and the reason, so a judge can fix the file.
export function parseRunInput(json: unknown): RunInput {
  const r = RunInputSchema.safeParse(json);
  if (r.success) return r.data;
  throw new InputError(r.error.issues.map((i) => ({ path: i.path.length ? i.path.map(String).join(".") : "root", reason: i.message })));
}

// "08:00-12:00" is 240 minutes; anything else is the whole working day.
export function windowMinutes(window: string, dayMinutes = DEMO.dayMinutes): number {
  const m = window.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!m) return dayMinutes;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  return end > start ? Math.min(end - start, dayMinutes) : dayMinutes;
}

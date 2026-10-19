// Turns an uploaded file into a run input. JSON is parsed as the run input itself. CSV is a
// job list with the columns job id, title, mu, price per mu, field, window, requester
// (header names are matched loosely: "Price per mu", "price_per_mu" and "pricePerMu" all
// work). A second CSV carries flights: job id, track m, seconds, swath m, claimed mu, and
// optionally battery pct and alt var. Validation happens once, in parseRunInput.

import { parseCsv, num } from "./csv";
import { InputError, parseRunInput, type RunInput } from "@/engine/schema";

const alias = (row: Record<string, string>, ...names: string[]) => { for (const n of names) if (row[n] !== undefined) return row[n]; return undefined; };

export function jobsFromCsv(text: string): unknown[] {
  const { header, rows } = parseCsv(text);
  if (!header.includes("jobid") && !header.includes("id")) throw new InputError([{ path: "jobs", reason: "CSV needs a 'job id' column (found: " + (header.join(", ") || "nothing") + ")" }]);
  return rows.map((r) => ({
    id: alias(r, "jobid", "id"),
    title: alias(r, "title", "job", "name"),
    mu: num(alias(r, "mu", "area", "areamu")),
    pricePerMu: num(alias(r, "pricepermu", "price", "rate", "yuanpermu")),
    field: alias(r, "field", "geofence", "plot"),
    window: alias(r, "window", "when") || "today",
    requester: alias(r, "requester", "farmer", "from"),
    distanceM: num(alias(r, "distancem", "distance")),
  }));
}

export function flightsFromCsv(text: string): unknown[] {
  const { header, rows } = parseCsv(text);
  if (!header.includes("jobid") && !header.includes("id")) throw new InputError([{ path: "flights", reason: "flights CSV needs a 'job id' column (found: " + (header.join(", ") || "nothing") + ")" }]);
  return rows.map((r) => ({
    jobId: alias(r, "jobid", "id"),
    trackM: num(alias(r, "trackm", "track", "trackmetres")),
    seconds: num(alias(r, "seconds", "secs", "time")),
    swathM: num(alias(r, "swathm", "swath")),
    claimedMu: num(alias(r, "claimedmu", "claimed", "mu")),
    batteryPct: num(alias(r, "batterypct", "battery")),
    altVar: num(alias(r, "altvar", "altitudevariance")),
  }));
}

export interface Upload { text: string; name?: string; flights?: string; lang?: string }

// JSON when the text starts with a brace or bracket, CSV otherwise. The optional flights
// file is always CSV. Returns a validated run input or throws an InputError.
export function ingest(u: Upload): RunInput {
  const body = u.text.trim();
  let raw: unknown;
  if (body.startsWith("{") || body.startsWith("[")) {
    let j: unknown;
    try { j = JSON.parse(body); } catch (e) { throw new InputError([{ path: "root", reason: `not valid JSON: ${(e as Error).message}` }]); }
    raw = Array.isArray(j) ? { jobs: j } : j;
  } else {
    raw = { jobs: jobsFromCsv(body) };
  }
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (u.flights?.trim()) obj.flights = flightsFromCsv(u.flights);
  if (u.lang === "zh" || u.lang === "en") obj.lang = u.lang;
  return parseRunInput(obj);
}

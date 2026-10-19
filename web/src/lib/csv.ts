// A small CSV parser. Handles quoted fields, doubled quotes, CRLF and a BOM. No dependencies.

export interface Csv { header: string[]; rows: Record<string, string>[] }

export function parseCsv(text: string): Csv {
  const src = text.replace(/^﻿/, "");
  const lines: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) lines.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) lines.push(row);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = lines[0].map((h) => key(h));
  const rows = lines.slice(1).map((cells) => Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()])));
  return { header, rows };
}

// "Price per mu", "price_per_mu" and "pricePerMu" all become "pricepermu".
export function key(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function num(v: string | undefined): number | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

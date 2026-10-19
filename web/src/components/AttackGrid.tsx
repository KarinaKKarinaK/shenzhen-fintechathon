"use client";
import { Fragment, useState } from "react";
import { Status } from "./StatusIcon";

type R = { id: number; name: string; layer: string; blocked: boolean; detail: string };

// The attack set as a results table. Select a row for the reason.
export function AttackGrid({ results }: { results: R[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="card overflow-x-auto">
      <table className="ledger min-w-[640px]">
        <thead><tr><th className="w-12 r">#</th><th>Attack</th><th className="w-28">Layer</th><th className="w-36">Result</th><th className="w-10"><span className="sr-only">Reason</span></th></tr></thead>
        <tbody>
          {results.map((r) => {
            const on = open === r.id;
            return (
              <Fragment key={r.id}>
                <tr className="cursor-pointer hover:bg-paper" onClick={() => setOpen(on ? null : r.id)}>
                  <td className="num r text-ink-2">{r.id}</td>
                  <td><button type="button" aria-expanded={on} className="text-left font-medium" onClick={(e) => { e.stopPropagation(); setOpen(on ? null : r.id); }}>{r.name}</button></td>
                  <td className="capitalize text-ink-2">{r.layer}</td>
                  <td>{r.blocked ? <Status kind="ok">Blocked</Status> : <Status kind="warn">Not blocked</Status>}</td>
                  <td className="text-ink-2" aria-hidden>{on ? "−" : "+"}</td>
                </tr>
                {on ? <tr className="bg-paper"><td /><td colSpan={4} className="text-ink-2"><span className="font-medium text-ink">Reason at the {r.layer} layer: </span>{r.detail}</td></tr> : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

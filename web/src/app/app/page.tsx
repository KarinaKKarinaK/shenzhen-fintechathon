import Link from "next/link";
import { ATTACKS } from "@/engine/attacks";
import { DEFAULT_POLICY } from "@/engine/policy";

const tiles = [
  { href: "/app/neighbourhood", title: "Neighbourhood", body: "A humanoid cleans the flat next door. Fee locked, geofence checked, bond filled, instalment paid, one attack slashed by proof.", stat: "Side B" },
  { href: "/app/fleet", title: "Fleet", body: "An agricultural drone pays for itself one mu at a time. Declined jobs, a held fake log, a lookalike lender caught, title transferred.", stat: "Side A" },
  { href: "/app/attack", title: "Attack lab", body: "Twenty attacks against a shadow agent, then yours. Message gate, policy engine, contract rules.", stat: `${ATTACKS.length} cases` },
  { href: "/app/evidence", title: "Evidence", body: "Live attack results, chain mode, model mode, and how to verify every claim yourself.", stat: "verify" },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <h1 className="serif text-4xl md:text-5xl">Mission control</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">Two sides, one rail. Pick a side to watch the agents act, or go straight to the attack lab.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card group p-5 transition-colors hover:border-teal">
            <div className="flex items-center justify-between"><h2 className="serif text-2xl">{t.title}</h2><span className="pill bg-ink text-paper">{t.stat}</span></div>
            <p className="mt-2 text-sm text-ink-2">{t.body}</p>
            <div className="mt-3 text-sm text-teal-deep group-hover:underline">Open</div>
          </Link>
        ))}
      </div>

      <section className="card-dark grain grain-dark mt-4 p-5">
        <h2 className="text-sm font-semibold">The policy that runs in code</h2>
        <p className="mt-1 text-sm text-[#cfe3df]">Rules are data. The model never sees them and cannot change them. Only the physical button can.</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
          <div><dt className="text-[#9fb5b1]">Per transaction cap</dt><dd>{DEFAULT_POLICY.perTxCap}</dd></div>
          <div><dt className="text-[#9fb5b1]">Daily cap</dt><dd>{DEFAULT_POLICY.dailyCap}</dd></div>
          <div><dt className="text-[#9fb5b1]">Instalment band</dt><dd>{DEFAULT_POLICY.rateBand[0] * 100} to {DEFAULT_POLICY.rateBand[1] * 100} percent of a fee</dd></div>
          <div><dt className="text-[#9fb5b1]">Payments per hour</dt><dd>{DEFAULT_POLICY.maxPerHour}</dd></div>
          <div><dt className="text-[#9fb5b1]">Price deviation</dt><dd>{DEFAULT_POLICY.deviationPct} percent</dd></div>
          <div><dt className="text-[#9fb5b1]">Geofences</dt><dd>{DEFAULT_POLICY.geofences.length} allowed</dd></div>
          <div><dt className="text-[#9fb5b1]">Cover required</dt><dd>{DEFAULT_POLICY.coverRequired ? "yes" : "no"}</dd></div>
          <div><dt className="text-[#9fb5b1]">Allowlisted payees</dt><dd>{Object.keys(DEFAULT_POLICY.allowlist).length}</dd></div>
        </dl>
      </section>
    </div>
  );
}

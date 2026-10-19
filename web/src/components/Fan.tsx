// Where else it applies: one row of plain cards, the demo case marked.
export function Fan({ items }: { items: { who: string; line: string; tag: string }[] }) {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((it) => {
        const demo = it.tag === "Demo";
        return (
          <li key={it.who} className={`card flex flex-col gap-3 p-5 ${demo ? "border-ink" : ""}`} style={demo ? { borderColor: "var(--color-ink)" } : undefined}>
            <span className="label">{it.tag}{demo ? ", shown in the live demo" : ""}</span>
            <span className="text-lg font-semibold leading-snug">{it.who}</span>
            <span className="text-[15px] text-ink-2">{it.line}</span>
          </li>
        );
      })}
    </ul>
  );
}

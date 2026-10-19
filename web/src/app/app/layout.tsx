import { Rail } from "@/components/Rail";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 h-screen w-[72px] shrink-0 border-r border-line bg-paper-2/70 backdrop-blur">
        <Rail />
      </aside>
      <main className="min-w-0 flex-1 px-5 py-6 md:px-8">{children}</main>
    </div>
  );
}

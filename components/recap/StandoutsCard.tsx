import type { Standout } from "@/lib/data/types";

// Up to three genuinely rare things from the game, each with what it was
// compared against underneath. Not rendered at all after an ordinary game
// (the recap page checks for an empty list), which is the honest result.
export function StandoutsCard({ standouts }: { standouts: Standout[] }) {
  return (
    <section
      aria-labelledby="standouts-heading"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 id="standouts-heading" className="text-xs font-bold uppercase tracking-wide text-red">
        What Stood Out
      </h2>
      <ol className="mt-3 space-y-3">
        {standouts.map((s) => (
          <li key={s.group} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.tone === "good" ? "bg-rank-good" : "bg-rank-bad"}`}
            />
            <div>
              <p className="text-sm font-medium leading-snug text-foreground">{s.text}</p>
              <p className="mt-0.5 text-xs text-muted">Compared against {s.population}.</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

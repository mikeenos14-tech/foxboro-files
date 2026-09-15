import type { GameRecap } from "@/lib/data/types";

const sections: Array<{
  key: keyof GameRecap["goodBadUgly"];
  label: string;
  className: string;
}> = [
  { key: "good", label: "Good", className: "text-rank-good" },
  { key: "bad", label: "Bad", className: "text-rank-mid" },
  { key: "ugly", label: "Ugly", className: "text-rank-bad" },
];

export function GoodBadUglySidebar({
  goodBadUgly,
}: {
  goodBadUgly: GameRecap["goodBadUgly"];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold">Good, Bad & Ugly</h3>
      <div className="mt-3 space-y-4">
        {sections.map((s) => (
          <div key={s.key}>
            <span className={`text-sm font-bold uppercase ${s.className}`}>
              {s.label}
            </span>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted">
              {goodBadUgly[s.key].map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

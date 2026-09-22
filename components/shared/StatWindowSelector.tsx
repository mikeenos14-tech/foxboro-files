"use client";

interface Option {
  key: string;
  label: string;
}

// Reusable "last N games" window picker — same select-dropdown pattern
// used elsewhere on the site (see QbHeadToHead's opponent picker). Purely
// controlled: the parent owns which precomputed snapshot is selected and
// swaps what it renders, so this never fetches anything itself.
export function StatWindowSelector({
  options,
  value,
  onChange,
  label = "Show stats for",
}: {
  options: Option[];
  value: string;
  onChange: (key: string) => void;
  label?: string;
}) {
  return (
    <label className="block">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${label ? "mt-1" : ""} w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-red focus:outline-none sm:w-auto`}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";

interface Option {
  key: string;
  label: string;
}

// Reusable "last N games" window picker — same select-dropdown pattern
// used elsewhere on the site (see QbHeadToHead's opponent picker). Purely
// controlled: the parent owns which precomputed snapshot is selected and
// swaps what it renders, so this never fetches anything itself.
//
// `label` always names the control for assistive tech, even when
// `hideLabelVisually` keeps it off-screen (e.g. Team Strength, where a
// visible "Show stats for" next to the section's own heading would be
// redundant clutter) — an empty/unrendered label would leave the select
// with no accessible name at all, not just no visible one.
export function StatWindowSelector({
  options,
  value,
  onChange,
  label = "Show stats for",
  hideLabelVisually = false,
}: {
  options: Option[];
  value: string;
  onChange: (key: string) => void;
  label?: string;
  hideLabelVisually?: boolean;
}) {
  return (
    <label className="block">
      <span className={hideLabelVisually ? "sr-only" : "text-xs font-medium text-muted"}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${hideLabelVisually ? "" : "mt-1"} w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-red focus:outline-none sm:w-auto`}
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

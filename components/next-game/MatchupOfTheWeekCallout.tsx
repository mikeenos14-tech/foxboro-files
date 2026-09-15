export function MatchupOfTheWeekCallout({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border-2 border-red bg-red/5 p-5">
      <span className="text-xs font-bold uppercase tracking-wide text-red">
        Matchup of the Week
      </span>
      <h3 className="mt-1 text-xl font-bold text-navy dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

// A compact glossary strip for a table that leans on abbreviated column
// headers to stay dense (Sofascore's pattern: CMP/ATT/YDS/RTG columns,
// spelled out once in a legend rather than never or in every header).
// Deliberately no border/background baked in here — callers attach this
// as a footer inside an existing card (add border-t) or as its own
// standalone strip (add a full border/rounding), and those two contexts
// want different framing, not one default fighting a caller's override.
export function Legend({
  items,
  className,
}: {
  items: Array<{ term: string; definition: string }>;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 text-xs text-muted ${className ?? ""}`}>
      {items.map((item) => (
        <span key={item.term}>
          <span className="font-semibold text-foreground">{item.term}</span> = {item.definition}
        </span>
      ))}
    </div>
  );
}

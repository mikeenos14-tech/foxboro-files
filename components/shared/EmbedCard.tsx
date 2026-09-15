export function EmbedCard({
  kind,
  url,
}: {
  kind: "video" | "tweet";
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted hover:border-navy/30"
    >
      <span>{kind === "video" ? "▶" : "𝕏"}</span>
      <span>{kind === "video" ? "Watch clip" : "View post"}</span>
    </a>
  );
}

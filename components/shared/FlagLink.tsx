// "Something look off?" under each block of AI-written text.
//
// The site has no database, so a flag opens a pre-filled GitHub issue on
// the site's public repo: which page, which section, and the exact text
// as it was shown — enough to check it against the data without asking
// the reader anything else. Flagging needs a GitHub account; to send
// flags somewhere else (a Google Form, say), change FLAG_URL alone.
const FLAG_URL = "https://github.com/mikeenos14-tech/foxboro-files/issues/new";

export function FlagLink({
  page,
  section,
  text,
  className = "",
}: {
  /** Path of the page, e.g. "/recap/2026_03_NE_JAX". */
  page: string;
  section: string;
  text: string;
  className?: string;
}) {
  const quoted = text.length > 1500 ? `${text.slice(0, 1500)}…` : text;
  const params = new URLSearchParams({
    title: `Looks off: ${section} (${page})`,
    body: `**Page:** https://foxboro-files.vercel.app${page}\n**Section:** ${section}\n\n**What looks wrong?**\n\n\n\n---\nThe text as it was shown:\n\n> ${quoted.replace(/\n/g, "\n> ")}`,
  });
  return (
    <a
      href={`${FLAG_URL}?${params.toString()}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block py-1 text-[11px] text-muted underline hover:text-foreground ${className}`}
    >
      Something look off? Flag it
    </a>
  );
}

export function SoWhatNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 border-l-2 border-red pl-2 text-sm text-muted italic">
      {children}
    </p>
  );
}

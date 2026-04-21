export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 w-full text-center">
      <div className="mx-auto w-32 h-px bg-hairline relative overflow-hidden">
        <div className="absolute inset-0 bg-accent shimmer" />
      </div>
      <p className="mt-6 text-xs font-mono uppercase tracking-[0.2em] text-muted">Loading</p>
    </div>
  );
}

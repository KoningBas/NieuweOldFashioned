export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-surface-elevated border border-white/5 p-6 shadow-[0_15px_35px_-15px_rgba(0,0,0,0.5)]">
      <div className="text-muted text-base uppercase tracking-widest mb-2">{label}</div>
      <div className="font-heading text-4xl text-gold-light">{value}</div>
    </div>
  );
}

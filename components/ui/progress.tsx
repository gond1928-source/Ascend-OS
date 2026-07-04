export function Progress({ value, colorClassName = "bg-accent-violet" }: { value: number; colorClassName?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-700">
      <div
        className={`h-full rounded-full ${colorClassName}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

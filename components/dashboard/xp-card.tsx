import { Zap } from "lucide-react";

export function XPCard({
  level, xpIntoLevel, xpToNextLevel, totalXP, rank, tier,
}: {
  level: number; xpIntoLevel: number; xpToNextLevel: number; totalXP: number; rank?: string; tier?: string;
}) {
  const pct = (xpIntoLevel / (xpIntoLevel + xpToNextLevel)) * 100;
  const tierColor: Record<string, string> = {
    S: "#f5b94d", A: "#4dc8f5", B: "#3ddc97", C: "#7c6cf6", D: "#838383",
  };
  const color = tier ? (tierColor[tier] ?? "#7c6cf6") : "#7c6cf6";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-base-900/70 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-violet/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">XP & Level</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-violet/15">
            <Zap className="h-4 w-4 text-accent-violet" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-3xl font-semibold text-ink-50">Lv. {level}</p>
          {rank && (
            <span className="font-mono text-[11px] font-bold" style={{ color }}>
              {tier} · {rank}
            </span>
          )}
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-ink-500">{totalXP.toLocaleString()} total XP</p>
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-base-700">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, #7c6cf6, ${color})` }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-ink-500">{xpToNextLevel} XP to next level</p>
      </div>
    </div>
  );
}

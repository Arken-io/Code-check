/**
 * Purely decorative, fixed behind everything. No motion library needed —
 * these are slow CSS keyframe drifts (see .bg-glow-a/b in globals.css),
 * and prefers-reduced-motion already freezes all animation-duration
 * globally, so this respects that automatically.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="bg-glow-a absolute left-1/2 top-[-10%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
      <div className="bg-glow-b absolute right-[-10%] top-[20%] h-[28rem] w-[28rem] rounded-full bg-accent-soft/10 blur-[110px]" />
      <div className="bg-grid absolute inset-0" />
    </div>
  );
}

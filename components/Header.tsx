import { ArkenMark } from "./ArkenMark";

export function Header() {
  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-center gap-2.5">
        <ArkenMark size={18} className="text-accent" />
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          Arken
        </span>
        <span className="text-border-soft text-ink-faint">/</span>
        <span className="text-[13px] text-ink-muted">Code Check</span>
      </div>
      <span className="hidden sm:inline-flex items-center rounded-full border border-border px-3.5 py-1.5 text-[13px] text-ink-muted">
        No AI · No API key · Runs in your browser
      </span>
    </header>
  );
}

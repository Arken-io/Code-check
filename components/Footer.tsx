import { ArkenMark, XMark } from "./ArkenMark";

export function Footer() {
  return (
    <footer className="mt-20 flex flex-col-reverse items-center justify-between gap-4 border-t border-border-soft py-8 text-[12.5px] text-ink-faint sm:flex-row">
      <div className="flex items-center gap-2">
        <ArkenMark size={14} />
        <span>
          Built by <span className="text-ink-muted">Arken</span>
        </span>
        <span aria-hidden>·</span>
        <span>Build. Learn. Repeat.</span>
      </div>
      <a
        href="https://x.com/BuildArken"
        target="_blank"
        rel="noreferrer"
        aria-label="Arken on X"
        className="focus-ring inline-flex shrink-0 items-center text-ink-faint transition-colors hover:text-ink-muted"
      >
        <XMark size={14} />
      </a>
    </footer>
  );
}

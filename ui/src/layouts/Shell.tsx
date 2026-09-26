import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Activity as ActivityIcon, Fingerprint, Home, UserRound } from "lucide-react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5"><Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight"><span className="brand-mark small"><img src="/brand-icon.png" alt="Promise" /></span><span>Proof of Promise</span></Link><span className="verified-pill"><Fingerprint /> Human verified</span></div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-28 pt-7">{children}</main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavLink to="/" end><Home /><span>Promise</span></NavLink>
        <NavLink to="/activity"><ActivityIcon /><span>Activity</span></NavLink>
        <NavLink to="/personal"><UserRound /><span>Personal</span></NavLink>
      </nav>
    </div>
  );
}

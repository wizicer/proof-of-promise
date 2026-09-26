"use client";

import { createContext, useContext, useState } from "react";

const PresenceModeContext = createContext(false);

export function PresenceModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  return <PresenceModeContext.Provider value={enabled}>
    <header className="topbar">
      <a href="/" className="brand">Borrow From A Human</a>
      <div className="topbar-right">
        <span className="protocol">Proof of Promise</span>
        <button type="button" className={`presence-toggle ${enabled ? "on" : ""}`}
          aria-pressed={enabled} aria-label="Require fresh presence check"
          onClick={() => setEnabled(value => !value)}>
          <span className="presence-toggle-track" aria-hidden="true"><span /></span>
          <span>Live check</span>
        </button>
      </div>
    </header>
    {children}
  </PresenceModeContext.Provider>;
}

export function usePresenceMode() {
  return useContext(PresenceModeContext);
}

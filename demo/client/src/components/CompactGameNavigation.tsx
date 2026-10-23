import React, { useRef, useState } from 'react';

/** The same tabs remain available in a disclosure on very narrow windows. */
export function CompactGameNavigation({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    if (trigger.current?.offsetWidth) trigger.current.focus();
  };
  return <div className="compact-game-navigation" data-open={open} onKeyDown={event => {
    if (event.key === 'Escape' && open) close();
  }}>
    <button ref={trigger} type="button" className="compact-game-navigation-trigger"
      aria-expanded={open} aria-controls="game-view-tabs" onClick={() => setOpen(!open)}>
      <span aria-hidden="true">☰</span> {label}
    </button>
    <div id="game-view-tabs" className="compact-game-navigation-tabs" onClick={event => {
      const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
      if (tab && !tab.disabled) close();
    }}>{children}</div>
  </div>;
}

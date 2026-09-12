"use client";

import { useMemo, type ReactNode } from "react";
import type { ShellDrawerEntry } from "../shell/drawerState";
import { useDrawerMotion, type DrawerMotion } from "./useDrawerTransition";

/** Keep the incoming page's identity when it becomes current, including its rows. */
export function DrawerPages({ entry, modeId, motion, renderContent }: {
  entry: ShellDrawerEntry;
  modeId: string;
  motion: DrawerMotion;
  renderContent: (entry: ShellDrawerEntry) => ReactNode;
}) {
  const transition = useDrawerMotion(motion);
  const target = transition?.target;
  const targetEntry = useMemo(() => target ? { kind: target } : null, [target]);
  const offset = transition ? -transition.direction * transition.progress * 100 : 0;
  const pages = [{ entry, incoming: false, offset }];
  if (transition && targetEntry) pages.push({ entry: targetEntry, incoming: true, offset: offset + transition.direction * 100 });

  return <div className="drawer-pages">
    {pages.map((page) => <div key={`${modeId}:${JSON.stringify(page.entry)}`}
      className={`drawer-inner drawer-page ${page.incoming ? "drawer-page-incoming" : ""}`}
      inert={page.incoming} aria-hidden={page.incoming || undefined}
      style={{ transform: `translateX(${page.offset}%)` }}>
      {renderContent(page.entry)}
    </div>)}
  </div>;
}

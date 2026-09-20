"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { DrawerContent, type DrawerContentProps } from "./DrawerContent";
import { DrawerPages } from "./drawer/DrawerPages";
import { MobileDrawerHandle } from "./drawer/MobileDrawerHandle";
import { useMobileDrawerGestures } from "./drawer/useMobileDrawerGestures";
import type { DrawerMotion, HorizontalDrawerGesture } from "./drawer/useDrawerTransition";

import type { DrawerMobilePosition } from "./shell/drawerState";

type SideDrawerProps = DrawerContentProps & {
  globeControls: ReactNode;
  collapsed: boolean;
  isLoadingDrawerTask: boolean;
  loadingTaskLabel: string;
  mobilePosition: DrawerMobilePosition;
  shellRef: RefObject<HTMLElement | null>;
  onSetMobilePosition: (position: DrawerMobilePosition) => void;
  onToggleCollapsed: () => void;
  motion: DrawerMotion;
  horizontal: HorizontalDrawerGesture;
};

export function SideDrawer(props: SideDrawerProps) {
  const { globeControls, collapsed, isLoadingDrawerTask, loadingTaskLabel,
    mobilePosition, shellRef, onSetMobilePosition, onToggleCollapsed, motion, horizontal, ...content } = props;
  const { activeMode, activeModeId, entry } = content;
  const drawerRef = useRef<HTMLElement>(null);
  useMobileDrawerGestures({
    drawerRef, shellRef, mobilePosition,
    navigationKey: `${activeModeId}:${JSON.stringify(entry)}`,
    onMobilePositionChange: onSetMobilePosition,
    horizontal
  });
  return <>
    <div className="drawer-loading-anchor">
      <DrawerLoadingStatus active={isLoadingDrawerTask} label={loadingTaskLabel} />
    </div>
    <aside ref={drawerRef} className={`drawer ${collapsed ? "collapsed" : ""}`}
      aria-label={`${activeMode.label} data`} data-mobile-position={mobilePosition}>
      {globeControls}
      <button aria-label={collapsed ? "Open drawer" : "Close drawer"} className="drawer-toggle" type="button" onClick={onToggleCollapsed}>
        {collapsed ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
      </button>
      <MobileDrawerHandle mobilePosition={mobilePosition} onMobilePositionChange={onSetMobilePosition} />
      <DrawerPages entry={entry} modeId={activeModeId} motion={motion}
        renderContent={(pageEntry) => <DrawerContent {...content}
          view={pageEntry.kind} entry={pageEntry} />} />
    </aside>
  </>;
}

function DrawerLoadingStatus({ active, label }: { active: boolean; label: string }) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "complete">("loading");

  useEffect(() => {
    if (active) {
      setVisible(true);
      setStatus("loading");
      return;
    }

    setStatus("complete");
    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [active]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`drawer-loading-panel ${status}`} role="status" aria-live="polite">
      {status === "loading" ? (
        <LoaderCircle className="drawer-loading-icon spinning" size={18} aria-hidden="true" />
      ) : (
        <CheckCircle2 className="drawer-loading-icon" size={18} aria-hidden="true" />
      )}
      <span>{status === "loading" ? label : "Loaded"}</span>
    </div>
  );
}

"use client";

import Image from "next/image";
import { History, Star, UserCircle } from "lucide-react";
import blomoonFullLogo from "@/assets/images/full_logo/Blomoon_Full_Logo.png";
import type { TerraMode } from "@/lib/modes/types";
import { isAccountDrawerView, type ShellDrawerView } from "./drawerState";
import { modeIcons } from "./modeIcons";

type ShellMobileNavProps = {
  activeMode: TerraMode;
  activeView: ShellDrawerView;
  onAccountOpen: () => void;
  onFavouritesOpen: () => void;
  onHistoryOpen: () => void;
  onHome: () => void;
  onModeOpen: () => void;
};

export function ShellMobileNav({
  activeMode,
  activeView,
  onAccountOpen,
  onFavouritesOpen,
  onHistoryOpen,
  onHome,
  onModeOpen
}: ShellMobileNavProps) {
  const accountActive = isAccountDrawerView(activeView);
  const ModeIcon = modeIcons[activeMode.controlIcon];

  return (
    <nav className="shell-mobile-nav" aria-label="Blomoon mobile navigation">
      <button
        aria-pressed={activeView === "mode-switcher"}
        className={`shell-mobile-nav-button ${activeView === "mode-switcher" ? "active" : ""}`}
        type="button"
        onClick={onModeOpen}
      >
        <ModeIcon size={19} aria-hidden="true" />
        <span className="sr-only">Change mode</span>
      </button>
      <button
        aria-pressed={activeView === "history"}
        className={`shell-mobile-nav-button ${activeView === "history" ? "active" : ""}`}
        type="button"
        onClick={onHistoryOpen}
      >
        <History size={19} aria-hidden="true" />
        <span className="sr-only">{activeMode.label} playback history</span>
      </button>
      <button aria-current={activeView === "main" ? "page" : undefined} className="shell-mobile-logo-button" type="button" onClick={onHome}>
        <Image
          alt="Blomoon"
          className="shell-mobile-logo"
          priority
          sizes="120px"
          src={blomoonFullLogo}
        />
      </button>
      <button
        aria-pressed={activeView === "favourites" || activeView === "favourite-folder"}
        className={`shell-mobile-nav-button ${activeView === "favourites" || activeView === "favourite-folder" ? "active" : ""}`}
        type="button"
        onClick={onFavouritesOpen}
      >
        <Star size={19} aria-hidden="true" />
        <span className="sr-only">Favourites</span>
      </button>
      <button
        aria-pressed={accountActive}
        className={`shell-mobile-nav-button ${accountActive ? "active" : ""}`}
        type="button"
        onClick={onAccountOpen}
      >
        <UserCircle size={20} aria-hidden="true" />
        <span className="sr-only">Account</span>
      </button>
    </nav>
  );
}

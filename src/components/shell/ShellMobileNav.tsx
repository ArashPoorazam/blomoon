"use client";

import Image from "next/image";
import { Grid2X2, Star, UserCircle } from "lucide-react";
import blomoonFullLogo from "@/assets/images/full_logo/Blomoon_Full_Logo.png";
import { isAccountDrawerView, type ShellDrawerView } from "./drawerState";

type ShellMobileNavProps = {
  activeView: ShellDrawerView;
  onAccountOpen: () => void;
  onFavouritesOpen: () => void;
  onHome: () => void;
  onModeOpen: () => void;
};

export function ShellMobileNav({
  activeView,
  onAccountOpen,
  onFavouritesOpen,
  onHome,
  onModeOpen
}: ShellMobileNavProps) {
  const accountActive = isAccountDrawerView(activeView);

  return (
    <nav className="shell-mobile-nav" aria-label="Blomoon mobile navigation">
      <button
        aria-pressed={activeView === "mode-switcher"}
        className={`shell-mobile-nav-button ${activeView === "mode-switcher" ? "active" : ""}`}
        type="button"
        onClick={onModeOpen}
      >
        <Grid2X2 size={19} aria-hidden="true" />
        <span className="sr-only">Change mode</span>
      </button>
      <div className="shell-mobile-nav-slot" aria-hidden="true" />
      <button className="shell-mobile-logo-button" type="button" onClick={onHome}>
        <Image
          alt="Blomoon"
          className="shell-mobile-logo"
          priority
          sizes="120px"
          src={blomoonFullLogo}
        />
      </button>
      <button
        aria-pressed={activeView === "favourites"}
        className={`shell-mobile-nav-button ${activeView === "favourites" ? "active" : ""}`}
        type="button"
        onClick={onFavouritesOpen}
      >
        <Star size={19} aria-hidden="true" fill={activeView === "favourites" ? "currentColor" : "none"} />
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

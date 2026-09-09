"use client";

import Image from "next/image";
import { useState } from "react";

/** A reserved artwork slot keeps station identity visible throughout image loading. */
export function StationArtwork({ name, artworkUrl, size = "row" }: {
  name: string;
  artworkUrl?: string;
  size?: "row" | "profile" | "player";
}) {
  const [imageState, setImageState] = useState<{ url?: string; status: "loading" | "loaded" | "failed" }>({ url: artworkUrl, status: "loading" });
  const status = imageState.url === artworkUrl ? imageState.status : "loading";
  return <span className={`station-artwork station-artwork-${size}`} aria-hidden="true">
    <span className="station-artwork-letter">{Array.from(name.trim())[0]?.toLocaleUpperCase() || "B"}</span>
    {artworkUrl && status !== "failed" ? <Image
      key={artworkUrl}
      alt=""
      className={`station-artwork-image ${status === "loaded" ? "loaded" : ""}`}
      fill
      sizes={size === "profile" ? "80px" : "40px"}
      src={artworkUrl}
      unoptimized
      onLoad={() => setImageState({ url: artworkUrl, status: "loaded" })}
      onError={() => setImageState({ url: artworkUrl, status: "failed" })}
    /> : null}
  </span>;
}

"use client";

import Image from "next/image";
import { ChevronLeft, ExternalLink, Share2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { TerraMode, TerraPointDetail } from "@/lib/modes/types";
import { DrawerHeader } from "./DrawerHeader";

type PointDetailDrawerProps = {
  activeMode: TerraMode;
  detail: TerraPointDetail | null;
  detailAccessory?: ReactNode;
  onBack: () => void;
  onShare: (detail: TerraPointDetail) => void;
};

export function PointDetailDrawer({
  activeMode,
  detail,
  detailAccessory,
  onBack,
  onShare
}: PointDetailDrawerProps) {
  return (
    <>
      <DrawerHeader
        headingAs="h1"
        title={detail?.name ?? `${activeMode.copy.itemSingular} info`}
        subtitle={detail?.summary ?? `Loading ${activeMode.copy.itemSingular} information`}
        actions={(
          <button className="icon-button" type="button" aria-label="Back" onClick={onBack}>
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
        )}
      />

      <div className="detail-body">
        <div className="detail-hero">
          <StationArtwork detail={detail} />
          <div className="detail-hero-actions">
            <button className="icon-button detail-share-button" type="button" aria-label="Share station" disabled={!detail} onClick={() => detail && onShare(detail)}>
              <Share2 size={16} aria-hidden="true" />
            </button>
            {detail?.sourceUrl ? (
              <a className="detail-source-button clickable-text" href={detail.sourceUrl} target="_blank" rel="noreferrer">
                Source record
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>

        {detailAccessory ? <div className="detail-accessory">{detailAccessory}</div> : null}

        <div className="detail-sections">
          {activeMode.formatDetailSections(detail).map((section) => (
            <div className="detail-section" key={section.title}>
              <div className="detail-section-title">{section.title}</div>
              <div className="detail-grid">
                {section.fields.map((field) => (
                  <div className="detail-stat" key={field.label}>
                    <div className="detail-label">{field.label}</div>
                    <div className="detail-value">{field.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StationArtwork({ detail }: { detail: TerraPointDetail | null }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [detail?.artworkUrl]);

  if (detail?.artworkUrl && !failed) {
    return (
      <div className="detail-artwork-frame">
        <Image
          alt=""
          className="detail-artwork-image"
          fill
          sizes="(max-width: 760px) 100vw, 390px"
          src={detail.artworkUrl}
          unoptimized
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="detail-artwork-placeholder" aria-hidden="true">
      <span>{detail?.name.trim().charAt(0).toUpperCase() || "B"}</span>
    </div>
  );
}

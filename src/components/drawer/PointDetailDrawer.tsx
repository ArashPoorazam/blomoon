"use client";

import { ChevronLeft, ExternalLink, ImageIcon, Share2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { TerraMode, TerraPointDetail } from "@/lib/modes/types";

type PointDetailDrawerProps = {
  activeMode: TerraMode;
  detail: TerraPointDetail | null;
  detailAccessory?: ReactNode;
  onBack: () => void;
};

export function PointDetailDrawer({
  activeMode,
  detail,
  detailAccessory,
  onBack
}: PointDetailDrawerProps) {
  return (
    <>
      <div className="drawer-header">
        <div>
          <h1 className="drawer-title">{activeMode.copy.itemSingular} info</h1>
        </div>
        <button className="icon-button" type="button" aria-label="Back" onClick={onBack}>
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="detail-body">
        <div className="detail-hero">
          <StationArtwork detail={detail} />
          <div className="detail-hero-copy">
            <div>
              <h2>{detail?.name ?? "Loading"}</h2>
              {detail?.summary ? <p>{detail.summary}</p> : null}
            </div>
            <div className="detail-hero-actions">
              <button className="icon-button detail-share-button" type="button" aria-label="Share station" disabled>
                <Share2 size={16} aria-hidden="true" />
              </button>
              {detail?.sourceUrl ? (
                <a className="detail-source-button" href={detail.sourceUrl} target="_blank" rel="noreferrer">
                  Source record
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : null}
            </div>
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
      <img
        alt=""
        className="detail-artwork-image"
        src={detail.artworkUrl}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="detail-artwork-placeholder" aria-hidden="true">
      <ImageIcon size={28} />
      <span>{detail?.name.trim().charAt(0).toUpperCase() || "B"}</span>
    </div>
  );
}

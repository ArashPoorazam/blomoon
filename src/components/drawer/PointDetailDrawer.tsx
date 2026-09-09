"use client";

import { ChevronLeft, ExternalLink, Share2 } from "lucide-react";
import type { ReactNode } from "react";
import { StationArtwork } from "../ui/StationArtwork";
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
        title={`${activeMode.copy.itemSingular.charAt(0).toUpperCase()}${activeMode.copy.itemSingular.slice(1)} info`}
        subtitle="Station profile"
        actions={(
          <>
          <button className="icon-button detail-share-button" type="button" aria-label="Share station" disabled={!detail} onClick={() => detail && onShare(detail)}>
            <Share2 size={16} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Back" onClick={onBack}>
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          </>
        )}
      />

      <div className="detail-body">
        <div className="detail-hero">
          <StationArtwork key={detail?.id} name={detail?.name ?? ""} artworkUrl={detail?.artworkUrl} size="profile" />
          <div className="detail-identity"><h2>{detail?.name ?? "Loading station…"}</h2><p>{detail?.summary}</p></div>
          {detail?.sourceUrl ? (
              <a className="detail-source-button clickable-text" href={detail.sourceUrl} target="_blank" rel="noreferrer">
                Source record
                <ExternalLink size={14} aria-hidden="true" />
              </a>
          ) : null}
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

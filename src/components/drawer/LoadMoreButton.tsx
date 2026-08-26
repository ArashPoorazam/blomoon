"use client";

import { LoaderCircle } from "lucide-react";

type LoadMoreButtonProps = {
  className: string;
  isLoading: boolean;
  onLoadMore?: () => void;
};

export function LoadMoreButton({ className, isLoading, onLoadMore }: LoadMoreButtonProps) {
  return (
    <button
      className={className}
      disabled={isLoading}
      type="button"
      onClick={() => {
        if (onLoadMore) {
          onLoadMore();
        }
      }}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="loading-status-icon spinning" size={14} aria-hidden="true" />
          Loading
        </>
      ) : (
        "Show 50 more"
      )}
    </button>
  );
}

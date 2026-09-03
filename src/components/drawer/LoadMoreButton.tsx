"use client";

type LoadMoreButtonProps = {
  className: string;
  isLoading: boolean;
  onLoadMore?: () => void;
};

export function LoadMoreButton({ className, isLoading, onLoadMore }: LoadMoreButtonProps) {
  return (
    <button
      className={className}
      aria-busy={isLoading}
      disabled={isLoading}
      type="button"
      onClick={() => {
        if (onLoadMore) {
          onLoadMore();
        }
      }}
    >
      Show 50 more
    </button>
  );
}

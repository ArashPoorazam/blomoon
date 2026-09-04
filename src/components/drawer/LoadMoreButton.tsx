"use client";

type LoadMoreButtonProps = {
  className: string;
  disabled?: boolean;
  isLoading: boolean;
  onLoadMore?: () => void;
};

export function LoadMoreButton({ className, disabled = false, isLoading, onLoadMore }: LoadMoreButtonProps) {
  const isDisabled = disabled || isLoading || !onLoadMore;

  return (
    <button
      className={className}
      aria-busy={isLoading}
      disabled={isDisabled}
      type="button"
      onClick={() => {
        if (!isDisabled && onLoadMore) {
          onLoadMore();
        }
      }}
    >
      Show 50 more
    </button>
  );
}

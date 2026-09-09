import type { ReactNode } from "react";

type DrawerHeaderProps = {
  actions?: ReactNode;
  className?: string;
  headingAs?: "h1" | "h2";
  subtitle: string;
  title: string;
};

export function DrawerHeader({
  actions,
  className = "",
  headingAs = "h2",
  subtitle,
  title
}: DrawerHeaderProps) {
  const Heading = headingAs;

  return (
    <div className={`drawer-header ${className}`.trim()}>
      <div className="drawer-header-copy">
        <Heading className="drawer-title">{title}</Heading>
        <p className="drawer-subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="drawer-header-actions">{actions}</div> : null}
    </div>
  );
}

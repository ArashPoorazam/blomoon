"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  AudioLines,
  Boxes,
  ChevronRight,
  Globe2,
  LayoutDashboard,
  Menu,
  Server,
  Settings2,
  Users,
  Workflow,
} from "lucide-react";
const links = [
  { path: "", label: "Overview", icon: LayoutDashboard },
  { path: "/media", label: "Media library", icon: AudioLines },
  { path: "/modes", label: "Modes & providers", icon: Boxes },
  { path: "/users", label: "Users", icon: Users },
  { path: "/servers", label: "Servers", icon: Server },
  { path: "/jobs", label: "Jobs", icon: Workflow },
  { path: "/activity", label: "Activity & issues", icon: Activity },
  { path: "/settings", label: "Settings", icon: Settings2 },
];
export function OmnisireShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current =
    links.find((l) => l.path && pathname.startsWith(`/omnisire${l.path}`)) ??
    links[0];
  return (
    <div className="om-shell">
      <aside className="om-sidebar" data-open={open}>
        <Link className="om-brand" href="/omnisire">
          <span className="om-symbol">◒</span>
          <span>
            BLOMOON<small>OMNISIRE</small>
          </span>
        </Link>
        <p className="om-nav-label">WORKSPACE</p>
        <nav aria-label="Administration">
          {links.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              href={`/omnisire${path}`}
              onClick={() => setOpen(false)}
              aria-current={current.path === path ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
              {current.path === path && <ChevronRight size={14} />}
            </Link>
          ))}
        </nav>
        <div className="om-sidebar-bottom">
          <Link href="/">
            <Globe2 size={18} /> Open Blomoon ↗
          </Link>
          <div className="om-owner">
            <span className="om-avatar">O</span>
            <span>
              Owner<small>{email}</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="om-workspace">
        <header className="om-topbar">
          <button
            className="om-menu"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Menu size={20} />
          </button>
          <span>
            Workspace <ChevronRight size={14} />{" "}
            <strong>{current.label}</strong>
          </span>
          <span className="om-private">PRIVATE · OWNER ACCESS</span>
        </header>
        <main className="om-main">{children}</main>
        <footer className="om-footer">
          Blomoon / Omnisire <span>Discovery, under your control.</span>
        </footer>
      </div>
    </div>
  );
}
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="om-page-title">
      <div>
        <p className="om-eyebrow">BLOMOON CONTROL CENTER</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

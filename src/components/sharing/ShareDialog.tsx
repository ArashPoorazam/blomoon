"use client";

import { Check, Copy, Share2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ModalShell } from "../ui/ModalShell";

export function ShareDialog({ link, onClose, onChangeLink, title }: { link: string; onClose: () => void; onChangeLink?: () => Promise<void>; title: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [changing, setChanging] = useState(false);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  useEffect(() => setNativeShareAvailable(typeof navigator.share === "function"), []);
  useEffect(() => setStatus("idle"), [link]);
  async function copy() { try { await navigator.clipboard.writeText(link); setStatus("copied"); } catch { setStatus("error"); } }
  async function nativeShare() { try { await navigator.share({ title, url: link }); } catch (error) { if ((error as Error).name !== "AbortError") setStatus("error"); } }
  return <ModalShell kicker="Share link" title={title} onClose={onClose}>
    <p className="share-dialog-copy">Anyone you send this link to can open it after signing in.</p>
    {onChangeLink ? <p className="share-link-help">Changing the folder link makes all previous links stop working.</p> : null}
    <div className="share-link-value">{link}</div>
    <div className="share-dialog-actions">
      <button className="primary-action" disabled={changing} type="button" onClick={() => void copy()}>{status === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {status === "copied" ? "Copied" : "Copy link"}</button>
      {nativeShareAvailable ? <button className="secondary-action" disabled={changing} type="button" onClick={() => void nativeShare()}><Share2 size={15} aria-hidden="true" /> Share</button> : null}
      {onChangeLink ? <button className="secondary-action danger-action" disabled={changing} type="button" onClick={() => { setStatus("idle"); setChanging(true); void onChangeLink().catch(() => setStatus("error")).finally(() => setChanging(false)); }}><RefreshCw size={15} aria-hidden="true" /> {changing ? "Changing…" : "Change folder link"}</button> : null}
    </div>
    {status === "error" ? <div className="form-error" role="status">The action failed. Please try again.</div> : null}
  </ModalShell>;
}

"use client";

import { Check, Copy, Share2, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { ModalShell } from "../ui/ModalShell";

export function ShareDialog({ link, onClose, onStopSharing, title }: { link: string; onClose: () => void; onStopSharing?: () => Promise<void>; title: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [stopping, setStopping] = useState(false);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  useEffect(() => setNativeShareAvailable(typeof navigator.share === "function"), []);
  async function copy() { try { await navigator.clipboard.writeText(link); setStatus("copied"); } catch { setStatus("error"); } }
  async function nativeShare() { try { await navigator.share({ title, url: link }); } catch (error) { if ((error as Error).name !== "AbortError") setStatus("error"); } }
  return <ModalShell kicker="Share link" title={title} onClose={onClose}>
    <p className="share-dialog-copy">Anyone you send this link to can open it after signing in.</p>
    <div className="share-link-value">{link}</div>
    <div className="share-dialog-actions">
      <button className="primary-action" type="button" onClick={() => void copy()}>{status === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {status === "copied" ? "Copied" : "Copy link"}</button>
      {nativeShareAvailable ? <button className="secondary-action" type="button" onClick={() => void nativeShare()}><Share2 size={15} aria-hidden="true" /> Share</button> : null}
      {onStopSharing ? <button className="secondary-action danger-action" disabled={stopping} type="button" onClick={() => { setStopping(true); void onStopSharing().then(onClose).finally(() => setStopping(false)); }}><Unlink size={15} aria-hidden="true" /> Stop sharing</button> : null}
    </div>
    {status === "error" ? <div className="form-error" role="status">Sharing failed. Select and copy the link above.</div> : null}
  </ModalShell>;
}

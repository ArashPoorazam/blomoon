"use client";

import { Download } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { ModalShell } from "../ui/ModalShell";
import { useInstall } from "./InstallProvider";

export function InstallButton() {
  const install = useInstall();
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!install.ready || install.installed) return null;

  async function onInstall(event: MouseEvent<HTMLButtonElement>) {
    // Touch browsers may not focus a tapped button; give the dialog a return target.
    event.currentTarget.focus();
    if (install.ios || !install.canPrompt) { setShowHelp(true); return; }
    setBusy(true);
    try {
      if (!await install.prompt()) setShowHelp(true);
    } finally { setBusy(false); }
  }

  return <>
    <button className="install-button" type="button" disabled={busy} onClick={onInstall}>
      <Download size={16} aria-hidden="true" /><span>Install Blomoon</span>
    </button>
    {showHelp ? <ModalShell title="Install Blomoon" subtitle="Keep the globe on your Home Screen." onClose={() => setShowHelp(false)}>
      <div className="install-help">
        {install.ios ? <ol>
          <li>Open Blomoon in Safari and tap Share (you may find it in the More menu).</li>
          <li>Choose Add to Home Screen.</li>
          <li>Keep Open as Web App enabled if shown, then tap Add.</li>
        </ol> : <p>Open your browser menu and choose Install app or Add to Home Screen. If neither appears, open Blomoon in Chrome or Edge and try again. In an in-app browser, first open this page in your regular browser.</p>}
        <p>Discovery and live streams need an internet connection. You may need to sign in again when opening the installed app.</p>
      </div>
    </ModalShell> : null}
  </>;
}

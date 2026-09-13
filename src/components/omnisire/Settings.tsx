"use client";
import { useState } from "react";
import { useUnsaved } from "./useUnsaved";
import type { ApplicationSettings } from "@/lib/admin/contracts";
import { PageTitle } from "./OmnisireShell";
import {
  Badge,
  Feedback,
  Loading,
  request,
  useAction,
  useResource,
} from "./client";
export function Settings() {
  const { data, error, refresh } = useResource<{
    settings: ApplicationSettings;
    integrations: Record<string, boolean>;
  }>("settings");
  return (
    <>
      <PageTitle
        title="Application settings"
        description="Control access, communications, and availability."
      />
      <Feedback error={error} />
      {data ? (
        <SettingsForm
          key={data.settings.version}
          data={data}
          refresh={refresh}
        />
      ) : (
        <Loading />
      )}
    </>
  );
}
function SettingsForm({
  data,
  refresh,
}: {
  data: {
    settings: ApplicationSettings;
    integrations: Record<string, boolean>;
  };
  refresh: () => void;
}) {
  const [form, setForm] = useState(data.settings);
  const action = useAction(refresh);
  useUnsaved(JSON.stringify(form) !== JSON.stringify(data.settings));
  return (
    <>
      <Feedback {...action} />
      <form
        className="om-form"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(() => request("settings", "PATCH", form));
        }}
      >
        <div className="om-panel om-form">
          <h2>Application availability</h2>
          <label className="om-check">
            <input
              type="checkbox"
              checked={form.maintenance}
              onChange={(e) =>
                setForm({ ...form, maintenance: e.target.checked })
              }
            />{" "}
            Enable maintenance mode
          </label>
          <p className="om-muted">
            Public discovery and application APIs pause. Owners retain access to
            Omnisire and can preview Blomoon.
          </p>
          <label>
            Maintenance message
            <textarea
              required
              maxLength={500}
              value={form.maintenanceMessage}
              onChange={(e) =>
                setForm({ ...form, maintenanceMessage: e.target.value })
              }
            />
          </label>
          <label className="om-check">
            <input
              type="checkbox"
              checked={form.registrationEnabled}
              onChange={(e) =>
                setForm({ ...form, registrationEnabled: e.target.checked })
              }
            />{" "}
            Accept new registrations
          </label>
          <p className="om-muted">
            Applies to password registrations and first-time social accounts.
            Existing users can still sign in.
          </p>
        </div>
        <div className="om-panel om-form">
          <h2>Public communication</h2>
          <label>
            Support email
            <input
              required
              type="email"
              value={form.supportEmail}
              onChange={(e) =>
                setForm({ ...form, supportEmail: e.target.value })
              }
            />
          </label>
          <label>
            Announcement
            <textarea
              maxLength={500}
              placeholder="Leave empty to remove the announcement"
              value={form.announcement}
              onChange={(e) =>
                setForm({ ...form, announcement: e.target.value })
              }
            />
          </label>
          <label>
            Announcement expiry (local time)
            <input
              type="datetime-local"
              value={
                form.announcementExpiresAt
                  ? new Date(
                      Date.parse(form.announcementExpiresAt) -
                        new Date(
                          form.announcementExpiresAt,
                        ).getTimezoneOffset() *
                          60000,
                    )
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  announcementExpiresAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </label>
        </div>
        <div>
          <button disabled={action.busy} className="om-primary">
            {action.busy ? "Saving…" : "Save application settings"}
          </button>
        </div>
      </form>
      <div className="om-panel">
        <h2>Deployment integrations</h2>
        <ul className="om-list">
          {Object.entries(data.integrations).map(([key, value]) => (
            <li key={key}>
              {key}
              <Badge value={value ? "configured" : "missing"} />
            </li>
          ))}
        </ul>
        <p className="om-muted">
          Credentials remain on the server and are managed through deployment
          configuration.
        </p>
      </div>
    </>
  );
}

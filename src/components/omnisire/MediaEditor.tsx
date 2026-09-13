"use client";
import { StationEditor } from "@/lib/modes/radio/admin-ui/StationEditor";
const editors: Record<string, React.ComponentType<{ id: string }>> = {
  radio: StationEditor,
};
export function MediaEditor({ mode, id }: { mode: string; id: string }) {
  const Editor = editors[mode];
  return Editor ? <Editor id={id} /> : <p>Editor unavailable for this mode.</p>;
}

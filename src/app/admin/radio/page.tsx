import Link from "next/link";
import { requireRadioAdmin, RadioAdminError } from "@/lib/modes/radio/admin";
import { RadioAdmin } from "./RadioAdmin";
import "./radio-admin.css";
export default async function RadioAdminPage() {
  try {
    await requireRadioAdmin();
  } catch (error) {
    if (!(error instanceof RadioAdminError)) throw error;
    return (
      <main className="radio-admin">
        <h1>Radio administration</h1>
        <p>Sign in with an authorized, verified administrator account.</p>
        <Link href="/">Return to Blomoon</Link>
      </main>
    );
  }
  return <RadioAdmin />;
}

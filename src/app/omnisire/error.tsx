"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="om-panel">
      <h1>Omnisire is unavailable</h1>
      <p>
        A verified owner account and a working database are required. Check your
        access or try again.
      </p>
      <button onClick={reset}>Try again</button>
      <a href="/">Return to Blomoon</a>
    </main>
  );
}

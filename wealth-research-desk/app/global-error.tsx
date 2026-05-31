"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, sans-serif", padding: "48px", textAlign: "center" }}>
        <h1>Application error</h1>
        <p>A critical error occurred. Please reload the page.</p>
        <button onClick={reset} style={{ padding: "10px 20px", marginTop: "16px" }}>
          Reload
        </button>
      </body>
    </html>
  );
}

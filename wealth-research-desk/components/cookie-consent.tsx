"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONSENT_COOKIE = "wrd_cookie_consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

function writeConsent(value: "accepted" | "rejected") {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${secure}`;
}

/**
 * Cookie-consent notice (DPDP Act 2023 / GDPR-friendly).
 *
 * The app currently sets only strictly-necessary cookies (auth session + this
 * consent choice), so this is a transparency notice with a genuine, equally
 * prominent Reject option. Any future non-essential cookie (e.g. analytics)
 * must gate on the stored "accepted" value before loading.
 *
 * Renders nothing on the server and until the effect runs, so there is no
 * hydration mismatch and no flash for users who already chose.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const chosen = document.cookie.split("; ").some((c) => c.startsWith(`${CONSENT_COOKIE}=`));
    if (!chosen) setVisible(true);
  }, []);

  function choose(value: "accepted" | "rejected") {
    writeConsent(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md"
    >
      <div className="container-page flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted sm:max-w-[62ch]">
          We use only strictly-necessary cookies to keep you signed in and to remember this choice. We
          don&apos;t use advertising or tracking cookies. See our{" "}
          <Link href="/legal/privacy" className="text-accent underline underline-offset-2">
            Privacy &amp; Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" onClick={() => choose("rejected")}>
            Reject non-essential
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

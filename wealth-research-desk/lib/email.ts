import nodemailer from "nodemailer";
import { escapeHtml } from "@/lib/html";

type SendEmailResult = { sent: boolean; skipped?: boolean; error?: string };

function fromAddress(): string {
  return process.env.RESEND_FROM || process.env.SMTP_FROM || "research@wealthdesk.in";
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user, pass }
  });
}

/** Sends via the Resend HTTP API. Requires RESEND_API_KEY + a verified sender domain. */
async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html
      })
    });
    if (response.ok) return { sent: true };
    const data = (await response.json().catch(() => ({}))) as { message?: unknown };
    const message = typeof data?.message === "string" ? data.message : `Resend error ${response.status}`;
    return { sent: false, error: message };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Email failed" };
  }
}

/**
 * Sends a single email. Prefers Resend (RESEND_API_KEY), then SMTP, and in
 * development falls back to a console log when neither is configured.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(params);
  }

  const transport = getTransport();
  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] to=${params.to} subject=${params.subject}`);
    }
    return { sent: false, skipped: true };
  }

  try {
    await transport.sendMail({
      from: fromAddress(),
      to: params.to,
      subject: params.subject,
      html: params.html
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Email failed" };
  }
}

/** Sends to many recipients in sequential batches to avoid overwhelming SMTP. */
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string,
  batchSize = 20
): Promise<{ attempted: number; sent: number }> {
  let sent = 0;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((to) => sendEmail({ to, subject, html }))
    );
    sent += results.filter((r) => r.sent).length;
  }
  return { attempted: recipients.length, sent };
}

/** Wraps content in a minimal branded HTML shell. Caller must pre-escape dynamic text. */
export function emailLayout(headline: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2433">
    <h2 style="color:#8d7042">${escapeHtml(headline)}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="font-size:12px;color:#6b7280">Wealth Research Desk - market investments are subject to risk.
    Research is educational and not a guarantee of returns.</p>
  </div>`;
}

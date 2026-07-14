type SendSmsResult = { sent: boolean; skipped?: boolean; error?: string };

/** MSG91 wants the number with country code and no "+". Indian → 91XXXXXXXXXX. */
function toMsg91Mobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("91") ? digits : `91${digits}`;
}

/**
 * Sends a one-time code via MSG91's OTP API using a DLT-approved template.
 * We pass our own generated `code` (MSG91 just delivers it) so verification
 * stays in our DB. Gracefully "skips" when MSG91 isn't configured, letting dev
 * fall back to the console code.
 *
 * Requires (from the MSG91 dashboard):
 *   MSG91_AUTH_KEY         – account auth key
 *   MSG91_OTP_TEMPLATE_ID  – a DLT-approved OTP template containing an ##OTP## var
 *   MSG91_SENDER_ID        – optional 6-char DLT sender/header id
 */
export async function sendOtpSms(params: { to: string; code: string }): Promise<SendSmsResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
  if (!authKey || !templateId) {
    return { sent: false, skipped: true, error: "MSG91 not configured" };
  }

  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", templateId);
  url.searchParams.set("mobile", toMsg91Mobile(params.to));
  url.searchParams.set("otp", params.code);
  url.searchParams.set("otp_length", String(params.code.length));
  if (process.env.MSG91_SENDER_ID) url.searchParams.set("sender", process.env.MSG91_SENDER_ID);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: authKey },
      // Body carries template variables; the ##OTP## var is satisfied by the
      // `otp` query param above, so an empty object is fine for a basic template.
      body: JSON.stringify({})
    });
    const data = (await response.json().catch(() => ({}))) as { type?: string; message?: unknown };

    // MSG91 returns { type: "success" } on accept, { type: "error", message } otherwise.
    if (response.ok && data?.type === "success") {
      return { sent: true };
    }
    const message =
      typeof data?.message === "string" ? data.message : `MSG91 error ${response.status}`;
    return { sent: false, error: message };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "SMS failed" };
  }
}

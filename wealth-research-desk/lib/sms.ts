type SendSmsResult = { sent: boolean; skipped?: boolean; error?: string };

function toE164(phone: string): string {
  return phone.startsWith("+") ? phone : `+91${phone}`;
}

/**
 * Sends a one-time code via Twilio. Used only for the low-volume phone
 * verification at paid checkout (not registration), so cost stays minimal.
 * Gracefully "skips" when Twilio is unconfigured, letting dev fall back to the
 * console code.
 */
export async function sendOtpSms(params: { to: string; code: string }): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return { sent: false, skipped: true, error: "Twilio not configured" };
  }

  const body = `Your Wealth Research Desk verification code is ${params.code}. It expires in 10 minutes.`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ To: toE164(params.to), From: from, Body: body }).toString()
      }
    );
    if (!response.ok) {
      return { sent: false, error: `Twilio error ${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "SMS failed" };
  }
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { registerAction, type ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [otpPending, startOtp] = useTransition();
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  // Step-1 fields are kept so they can be re-submitted with the OTP in step 2.
  const [details, setDetails] = useState({
    name: "",
    email: "",
    phone: "",
    panNumber: "",
    aadhaarNumber: "",
    password: "",
    riskAccepted: false
  });

  if (state.status === "success") {
    setTimeout(() => router.push("/login?registered=1"), 800);
  }

  function update(field: keyof typeof details, value: string | boolean) {
    setDetails((prev) => ({ ...prev, [field]: value }));
  }

  async function sendOtp() {
    setOtpError(null);
    setOtpNotice(null);
    if (
      !details.name ||
      !details.email ||
      !/^[6-9]\d{9}$/.test(details.phone) ||
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(details.panNumber.toUpperCase()) ||
      !/^[0-9]{12}$/.test(details.aadhaarNumber) ||
      details.password.length < 8 ||
      !details.riskAccepted
    ) {
      setOtpError("Complete all fields correctly and accept the risk disclosure before continuing.");
      return;
    }
    startOtp(async () => {
      const response = await fetch("/api/auth/phone-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: details.phone })
      });
      const payload = await response.json();
      if (!response.ok) {
        setOtpError(payload.message ?? "Could not send verification code");
        return;
      }
      setOtpNotice(payload.devCode ? `Dev code: ${payload.devCode}` : payload.message);
      setStep(2);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Step {step} of 2 - {step === 1 ? "your details" : "verify your mobile"}
        </p>
      </div>

      {otpError && <InlineToast tone="error" message={otpError} />}
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={details.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={details.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Mobile number (10 digits)</Label>
            <Input
              id="phone"
              inputMode="numeric"
              maxLength={10}
              value={details.phone}
              onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                maxLength={10}
                value={details.panNumber}
                onChange={(e) => update("panNumber", e.target.value.toUpperCase())}
                required
              />
            </div>
            <div>
              <Label htmlFor="aadhaar">Aadhaar (12 digits)</Label>
              <Input
                id="aadhaar"
                inputMode="numeric"
                maxLength={12}
                value={details.aadhaarNumber}
                onChange={(e) => update("aadhaarNumber", e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Password (min 8 characters)</Label>
            <Input
              id="password"
              type="password"
              value={details.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={details.riskAccepted}
              onChange={(e) => update("riskAccepted", e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I understand market investments carry risk, that research is educational, and I accept
              the{" "}
              <Link href="/legal/disclaimer" className="text-accent" target="_blank">
                risk disclosure
              </Link>{" "}
              and{" "}
              <Link href="/legal/terms" className="text-accent" target="_blank">
                terms
              </Link>
              .
            </span>
          </label>
          <Button type="button" className="w-full" disabled={otpPending} onClick={sendOtp}>
            {otpPending ? "Sending code..." : "Send verification code"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <form action={formAction} className="space-y-4">
          {otpNotice && <InlineToast tone="info" message={otpNotice} />}
          <input type="hidden" name="name" value={details.name} />
          <input type="hidden" name="email" value={details.email} />
          <input type="hidden" name="phone" value={details.phone} />
          <input type="hidden" name="panNumber" value={details.panNumber} />
          <input type="hidden" name="aadhaarNumber" value={details.aadhaarNumber} />
          <input type="hidden" name="password" value={details.password} />
          <input type="hidden" name="riskAccepted" value={String(details.riskAccepted)} />
          <div>
            <Label htmlFor="otp">Enter the 6-digit code sent to {details.phone}</Label>
            <Input id="otp" name="otp" inputMode="numeric" maxLength={6} required />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Creating..." : "Create account"}
            </Button>
          </div>
          <button
            type="button"
            onClick={sendOtp}
            disabled={otpPending}
            className="w-full text-center text-xs text-accent"
          >
            Resend code
          </button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        Already a member?{" "}
        <Link href="/login" className="text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}

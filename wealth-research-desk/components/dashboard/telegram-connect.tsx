"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineToast } from "@/components/ui/inline-toast";
import {
  createTelegramLinkAction,
  disconnectTelegramAction,
  type TelegramLinkState
} from "@/app/dashboard/actions";

const initialState: TelegramLinkState = { status: "idle", message: "" };

export function TelegramConnect({ linked }: { linked: boolean }) {
  const [state, formAction, pending] = useActionState(createTelegramLinkAction, initialState);

  if (linked) {
    return (
      <Card className="border-positive/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Telegram alerts</p>
              <Badge tone="success">Connected</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              New trade alerts for your plan are delivered to your Telegram. Send <b>/stop</b> in the chat, or
              disconnect here, to turn them off.
            </p>
          </div>
          <form action={disconnectTelegramAction}>
            <Button type="submit" variant="secondary" size="sm">
              Disconnect
            </Button>
          </form>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm font-semibold">Telegram alerts</p>
      <p className="mt-1 text-sm text-muted">
        Your plan includes instant new-trade alerts on Telegram. Connect once to start receiving them.
      </p>

      {state.status === "error" && <InlineToast tone="error" message={state.message} />}

      {state.status === "success" && state.link ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted">{state.message}</p>
          <a href={state.link} target="_blank" rel="noopener noreferrer" className="inline-block">
            <Button type="button">Open Telegram &amp; confirm</Button>
          </a>
          <p className="text-xs text-muted">
            This opens a chat with our bot. Tap <b>Start</b> there — you’ll get a confirmation message and this
            page will show “Connected”.
          </p>
        </div>
      ) : (
        <form action={formAction} className="mt-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Preparing…" : "Connect Telegram"}
          </Button>
        </form>
      )}
    </Card>
  );
}

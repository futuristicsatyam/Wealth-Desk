"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { supportTicketSchema, firstError } from "@/lib/validations";

export type ActionState = { status: "idle" | "error" | "success"; message: string };

/** Member raises a support ticket (fixes the previously non-functional form). */
export async function createSupportTicketAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = supportTicketSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    priority: formData.get("priority")
  });
  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
      priority: parsed.data.priority,
      status: "OPEN"
    }
  });

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  redirect("/dashboard/support?submitted=1");
}

/** Marks every unread notification for the current user as read. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() }
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

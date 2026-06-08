"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Role } from "@prisma/client";
import { requireRole, requireAuth } from "@/lib/auth/guards";
import { toActionError } from "@/lib/errors/service-error";
import { orderService } from "@/services/order.service";
import type { ActionResult } from "@/types";

export async function createOrderAction(courseId: string): Promise<ActionResult<{ orderId: string }>> {
  try {
    const user = await requireRole([Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    const order = await orderService.create(user.id, courseId);
    revalidatePath("/checkout");
    redirect(`/checkout/${order.id}`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { success: false, error: toActionError(e) };
  }
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await orderService.cancel(orderId, user.id);
    revalidatePath("/orders");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

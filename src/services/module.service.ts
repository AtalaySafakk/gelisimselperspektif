import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { archivedOrderSlot, resolveOrderInsert } from "@/lib/utils/order";
import { ServiceError } from "@/lib/errors/service-error";
import { courseService } from "@/services/course.service";
import { auditLogService } from "@/services/audit-log.service";
import type { RequestMeta } from "@/types";

export const moduleService = {
  async create(
    actorId: string,
    role: Role,
    input: { courseId: string; title: string; order?: number },
    meta?: RequestMeta,
  ) {
    await courseService.assertCanManage(input.courseId, actorId, role);
    const existing = await prisma.module.findMany({
      where: { courseId: input.courseId, deletedAt: null },
      select: { order: true },
    });
    const order = resolveOrderInsert(existing, input.order);

    const created = await prisma.module.create({
      data: { courseId: input.courseId, title: input.title, order },
    });

    await auditLogService.log({
      actorId,
      action: "MODULE_CREATED",
      entityType: "COURSE",
      entityId: input.courseId,
      metadata: { moduleId: created.id, order },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return created;
  },

  async update(
    moduleId: string,
    actorId: string,
    role: Role,
    input: { title?: string; order?: number },
  ) {
    const mod = await prisma.module.findFirst({
      where: { id: moduleId, deletedAt: null },
    });
    if (!mod) throw new ServiceError("Modül bulunamadı.", "NOT_FOUND");
    await courseService.assertCanManage(mod.courseId, actorId, role);

    if (input.order !== undefined && input.order !== mod.order) {
      const siblings = await prisma.module.findMany({
        where: { courseId: mod.courseId, deletedAt: null, id: { not: moduleId } },
        select: { order: true },
      });
      const order = resolveOrderInsert(siblings, input.order);
      return prisma.module.update({
        where: { id: moduleId },
        data: { title: input.title ?? mod.title, order },
      });
    }

    return prisma.module.update({
      where: { id: moduleId },
      data: { title: input.title ?? mod.title },
    });
  },

  async softDelete(moduleId: string, actorId: string, role: Role) {
    const mod = await prisma.module.findFirst({
      where: { id: moduleId, deletedAt: null },
    });
    if (!mod) throw new ServiceError("Modül bulunamadı.", "NOT_FOUND");
    await courseService.assertCanManage(mod.courseId, actorId, role);
    await prisma.module.update({
      where: { id: moduleId },
      data: { deletedAt: new Date(), order: archivedOrderSlot() },
    });
  },
};

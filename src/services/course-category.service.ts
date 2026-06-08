import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils/slug";
import { ServiceError } from "@/lib/errors/service-error";

export const courseCategoryService = {
  listActive() {
    return prisma.courseCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  },

  listAll() {
    return prisma.courseCategory.findMany({ orderBy: { sortOrder: "asc" } });
  },

  async create(input: { name: string; description?: string; sortOrder?: number }) {
    const base = slugify(input.name);
    let slug = base;
    let i = 0;
    while (await prisma.courseCategory.findUnique({ where: { slug } })) {
      i += 1;
      slug = `${base}-${i}`;
    }
    return prisma.courseCategory.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  },

  async update(
    id: string,
    input: { name?: string; description?: string; sortOrder?: number; isActive?: boolean },
  ) {
    const cat = await prisma.courseCategory.findUnique({ where: { id } });
    if (!cat) throw new ServiceError("Kategori bulunamadı.", "NOT_FOUND");
    return prisma.courseCategory.update({ where: { id }, data: input });
  },
};

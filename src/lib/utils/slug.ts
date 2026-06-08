export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildArchivedSlug(baseSlug: string, id: string): string {
  const suffix = id.slice(-8);
  return `${baseSlug}-archived-${suffix}`.slice(0, 120);
}

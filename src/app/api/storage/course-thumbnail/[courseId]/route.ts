import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isR2Configured } from "@/lib/env";
import { uploadService } from "@/services/upload.service";
import { ServiceError } from "@/lib/errors/service-error";

/**
 * GET /api/storage/course-thumbnail/[courseId]
 * 302 → imzalı URL. Yayınlanmış kurslarda oturum opsiyonel; taslakta yalnızca eğitmen/admin.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Depolama yapılandırılmadı." }, { status: 503 });
  }

  const user = await getSession();
  const { courseId } = await params;

  try {
    const { url } = await uploadService.signedCourseThumbnailUrl(courseId, user);
    return NextResponse.redirect(url, { status: 302 });
  } catch (e) {
    if (e instanceof ServiceError) {
      const status =
        e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    console.error("[course-thumbnail-redirect]", e);
    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}

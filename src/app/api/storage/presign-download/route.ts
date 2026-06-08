import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { isR2Configured } from "@/lib/env";
import { uploadService } from "@/services/upload.service";
import { ServiceError } from "@/lib/errors/service-error";

const querySchema = z.object({
  type: z.enum(["video", "document", "receipt"]),
  lessonId: z.string().optional(),
  /** Dekont: yalnızca paymentId — sunucu receiptStorageKey çözer (key URL’de taşınmaz) */
  paymentId: z.string().cuid().optional(),
});

/**
 * GET /api/storage/presign-download?type=video&lessonId=...
 * Returns JSON { url, expiresIn } for client-side open/stream.
 *
 * - video / document: aktif CourseAccess ve sipariş PAID gerekir
 * - receipt: paymentId + (sipariş sahibi veya payments.approve)
 */
export async function GET(request: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Depolama yapılandırılmadı." }, { status: 503 });
  }

  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Geçersiz istek" },
      { status: 400 },
    );
  }

  try {
    const { type } = parsed.data;

    if (type === "video") {
      if (!parsed.data.lessonId) {
        return NextResponse.json({ error: "lessonId gerekli" }, { status: 400 });
      }
      const result = await uploadService.signedVideoUrl(parsed.data.lessonId, user);
      return NextResponse.json(result);
    }

    if (type === "document") {
      if (!parsed.data.lessonId) {
        return NextResponse.json({ error: "lessonId gerekli" }, { status: 400 });
      }
      const result = await uploadService.signedDocumentUrl(parsed.data.lessonId, user);
      return NextResponse.json(result);
    }

    if (type === "receipt") {
      if (!parsed.data.paymentId) {
        return NextResponse.json({ error: "paymentId gerekli" }, { status: 400 });
      }
      const result = await uploadService.signedReceiptUrlForPayment(parsed.data.paymentId, user);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Geçersiz tür" }, { status: 400 });
  } catch (e) {
    if (e instanceof ServiceError) {
      const status = e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    console.error("[presign-download]", e);
    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}

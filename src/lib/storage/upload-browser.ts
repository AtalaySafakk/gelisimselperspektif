/**
 * Tarayıcıdan presigned PUT (R2 / S3 uyumlu). CORS yapılandırması yoksa
 * genelde TypeError "Failed to fetch" olur.
 */
export async function putFileToPresignedUrl(url: string, file: File): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
  } catch (e) {
    const isNetwork =
      e instanceof TypeError &&
      (String((e as Error).message).toLowerCase().includes("fetch") ||
        String((e as Error).message).toLowerCase().includes("network"));
    if (isNetwork) {
      throw new Error(
        "Depoya doğrudan yüklenemedi. R2 bucket CORS ayarında uygulama adresinize (ör. http://localhost:3000) GET, PUT, HEAD ve Content-Type izni verin.",
      );
    }
    throw e;
  }
  if (!res.ok) {
    const hint = await res.text().catch(() => "");
    throw new Error(
      hint ? `Depo yanıtı ${res.status}: ${hint.slice(0, 200)}` : `Depo yanıtı: ${res.status}`,
    );
  }
}

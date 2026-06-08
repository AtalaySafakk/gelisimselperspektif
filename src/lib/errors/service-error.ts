export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function toActionError(error: unknown): string {
  if (error instanceof ServiceError) return error.message;
  if (error instanceof Error) return error.message;
  return "İşlem tamamlanamadı.";
}

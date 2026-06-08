import { createPresignedDownloadUrl } from "@/lib/storage/presign";
import type {
  PlaybackUrlInput,
  RegisterVideoInput,
  SignedPlaybackUrl,
  VideoAssetRef,
  VideoProvider,
  WatermarkedPlaybackInput,
} from "@/lib/providers/video/types";

const DOWNLOAD_TTL_SECONDS = 60 * 60 * 4;

export class R2VideoProvider implements VideoProvider {
  readonly name = "r2" as const;

  async registerAsset(input: RegisterVideoInput): Promise<VideoAssetRef> {
    return {
      provider: this.name,
      storageKey: input.storageKey,
      externalId: input.externalId,
    };
  }

  async getPlaybackUrl(input: PlaybackUrlInput): Promise<SignedPlaybackUrl> {
    if (!input.storageKey) {
      throw new Error("storageKey required for R2 video playback");
    }
    const { url, expiresIn } = await createPresignedDownloadUrl({
      key: input.storageKey,
      expiresIn: DOWNLOAD_TTL_SECONDS,
    });
    return {
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      provider: this.name,
    };
  }

  async getWatermarkedPlaybackUrl(
    input: WatermarkedPlaybackInput,
  ): Promise<SignedPlaybackUrl> {
    // Placeholder: native watermark via Mux/Bunny later; same signed URL for now
    void input.watermarkText;
    return this.getPlaybackUrl(input);
  }
}

export const r2VideoProvider = new R2VideoProvider();

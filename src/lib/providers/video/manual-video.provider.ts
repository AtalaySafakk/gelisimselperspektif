import { r2VideoProvider } from "@/lib/providers/video/r2-video.provider";
import type {
  PlaybackUrlInput,
  RegisterVideoInput,
  SignedPlaybackUrl,
  VideoAssetRef,
  VideoProvider,
} from "@/lib/providers/video/types";

/** Manual upload stored on R2 — delegates playback to R2 presigned URLs */
export class ManualVideoProvider implements VideoProvider {
  readonly name = "manual" as const;

  registerAsset(input: RegisterVideoInput): Promise<VideoAssetRef> {
    return r2VideoProvider.registerAsset({ ...input });
  }

  getPlaybackUrl(input: PlaybackUrlInput): Promise<SignedPlaybackUrl> {
    return r2VideoProvider.getPlaybackUrl(input);
  }
}

export const manualVideoProvider = new ManualVideoProvider();

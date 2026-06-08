import { getServerEnv } from "@/lib/env";
import { manualVideoProvider } from "@/lib/providers/video/manual-video.provider";
import { r2VideoProvider } from "@/lib/providers/video/r2-video.provider";
import type { VideoProvider } from "@/lib/providers/video/types";

export function getVideoProvider(): VideoProvider {
  const { VIDEO_PROVIDER } = getServerEnv();
  switch (VIDEO_PROVIDER) {
    case "manual":
      return manualVideoProvider;
    case "r2":
      return r2VideoProvider;
    case "bunny":
    case "mux":
      throw new Error(`Video provider "${VIDEO_PROVIDER}" not implemented yet`);
    default:
      return manualVideoProvider;
  }
}

export type { VideoProvider, WatermarkConfig } from "@/lib/providers/video/types";

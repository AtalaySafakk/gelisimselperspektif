export type VideoProviderName = "manual" | "r2" | "bunny" | "mux";

export type RegisterVideoInput = {
  lessonId: string;
  storageKey?: string;
  externalId?: string;
  mimeType?: string;
  durationSeconds?: number;
};

export type VideoAssetRef = {
  provider: VideoProviderName;
  storageKey?: string;
  externalId?: string;
};

export type PlaybackUrlInput = {
  videoId: string;
  storageKey?: string;
  externalId?: string;
  userId: string;
};

export type WatermarkedPlaybackInput = PlaybackUrlInput & {
  watermarkText: string;
};

export type SignedPlaybackUrl = {
  url: string;
  expiresAt: Date;
  provider: VideoProviderName;
};

export type WatermarkConfig = {
  enabled: boolean;
  type: "email" | "userId" | "custom";
  opacity?: number;
  position?: "bottom-right" | "center";
};

export interface VideoProvider {
  readonly name: VideoProviderName;
  registerAsset(input: RegisterVideoInput): Promise<VideoAssetRef>;
  getPlaybackUrl(input: PlaybackUrlInput): Promise<SignedPlaybackUrl>;
  getWatermarkedPlaybackUrl?(
    input: WatermarkedPlaybackInput,
  ): Promise<SignedPlaybackUrl>;
  deleteAsset?(assetId: string): Promise<void>;
}

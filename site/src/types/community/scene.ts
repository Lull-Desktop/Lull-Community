import {
  ANIMATION_MODE,
  MULTI_MONITOR_MODE,
  QUALITY_PROFILE,
  RESOLUTION_PROFILE,
  SCENE_TYPE,
  VISUAL_STYLE,
} from "@/generated/community-enums";

import type { CapabilitySupport, MetaBase } from "./common";

export type SceneType = (typeof SCENE_TYPE)[number];
export type VisualStyle = (typeof VISUAL_STYLE)[number];
export type AnimationMode = (typeof ANIMATION_MODE)[number];
export type QualityProfile = (typeof QUALITY_PROFILE)[number];
export type ResolutionProfile = (typeof RESOLUTION_PROFILE)[number];
export type MultiMonitorMode = (typeof MULTI_MONITOR_MODE)[number];

/** 壁纸（本仓库的 kind 叫 scene）的业务字段。 */
export interface SceneMeta extends MetaBase {
  resourceType: "scene";

  /** 内容分类，不是性能分类；未声明为 `unknown`。 */
  sceneType: SceneType;
  visualStyle: VisualStyle[];
  animationMode: AnimationMode;

  qualityProfiles: QualityProfile[];
  resolutionProfiles: ResolutionProfile[];
  multiMonitorModes: MultiMonitorMode[];

  /** 只说明资源是否支持多屏同步；未声明的能力为 null。 */
  supportsSync: CapabilitySupport;
  supportsDynamicResolution: CapabilitySupport;
  supportsAdaptiveFps: CapabilitySupport;
}

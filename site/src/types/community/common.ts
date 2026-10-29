import {
  BACKGROUND_POLICY,
  HARDWARE_LEVEL,
  NETWORK_POLICY,
  PERFORMANCE_EVIDENCE,
  PERFORMANCE_TIER,
  PERMISSION,
  PLATFORM,
  POWER_PROFILE,
  RECOMMENDED_USE,
  RENDER_TECH,
  RENDER_TYPE,
} from "@/generated/community-enums";

/**
 * 公共枚举。
 *
 * 取值不在这里手写：`site/src/generated/community-enums.ts` 由
 * `scripts/build-catalog.mjs` 从 `schemas/community-item.schema.json` 生成，
 * 类型只是对它的推导。改枚举请改 schema，然后重跑 `pnpm build:catalog`。
 */
export type RenderType = (typeof RENDER_TYPE)[number];
export type RenderTech = (typeof RENDER_TECH)[number];
export type PerformanceTier = (typeof PERFORMANCE_TIER)[number];
export type PerformanceEvidence = (typeof PERFORMANCE_EVIDENCE)[number];
export type HardwareLevel = (typeof HARDWARE_LEVEL)[number];
export type PowerProfile = (typeof POWER_PROFILE)[number];
export type BackgroundPolicy = (typeof BACKGROUND_POLICY)[number];
export type NetworkPolicy = (typeof NETWORK_POLICY)[number];
export type RecommendedUse = (typeof RECOMMENDED_USE)[number];
export type Platform = (typeof PLATFORM)[number];
export type Permission = (typeof PERMISSION)[number];

/**
 * true = 已确认支持；false = 已确认不支持；null = 未声明或未确认。
 *
 * 未声明绝不能折叠成 false，否则「筛不支持某能力」会把没测过的资源一起选中。
 */
export type CapabilitySupport = boolean | null;

export type ResourceKind = "scene" | "widget";

export interface Size {
  width: number;
  height: number;
}

export interface RuntimeRequirements {
  minAppVersion?: string;
  minWebView2Version?: string;
}

/** L2 公共运行字段：scene 与 widget 共用。 */
export interface MetaBase {
  /** 主要渲染形态。`unknown` = 未声明；入口是 HTML 不代表就是 web。 */
  renderType: RenderType;
  /** 实际采用的渲染技术，由创作者声明，不从包内文件类型推断。 */
  renderTech: RenderTech[];

  requiredFeatures: string[];
  optionalFeatures: string[];

  performanceTier: PerformanceTier;
  /** 等级来源：`manifest-declared` 只说明继承自上游清单，不代表测过。 */
  performanceEvidence: PerformanceEvidence;
  hardwareLevel: HardwareLevel;
  powerProfile: PowerProfile;

  /** 目标帧率，不是保证帧率；未给出时为 null。 */
  targetFps: number | null;
  supportsPause: CapabilitySupport;
  supportsReducedMotion: CapabilitySupport;

  platforms: Platform[];
  runtimeRequirements: RuntimeRequirements | null;

  requiredPermissions: Permission[];
  optionalPermissions: Permission[];

  /** 资源支持或建议的后台策略；宿主实际执行策略由宿主决定。 */
  backgroundPolicy: BackgroundPolicy;
  networkPolicy: NetworkPolicy;

  recommendedUse: RecommendedUse[];
}

import type {
  BackgroundPolicy,
  InteractionLevel,
  MultiMonitorMode,
  Platform,
  QualityClass,
  RecommendedUse,
  RenderClass,
  SceneType,
  UpdatePolicy,
  WidgetType,
  WindowAbility,
} from "@/types/community";

/**
 * 筛选面板的中文文案。
 *
 * `Record<...>` 要求每个枚举值都有条目——schema 新增取值后这里会直接类型报错。
 * 未知/未声明不进筛选按钮：`unknown` 不在面板里出现，只在详情页标注。
 */
export const FILTER_KIND_LABELS: Record<"all" | "scene" | "widget", string> = {
  all: "全部资源",
  scene: "动态壁纸",
  widget: "桌面组件",
};

export const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  nature: "自然风景",
  abstract: "抽象艺术",
  ambient: "氛围",
  scene: "影视场景",
  interactive: "互动场景",
  other: "其他",
  unknown: "未声明",
};

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  clock: "时钟时间",
  music: "音乐媒体",
  monitor: "系统监控",
  utility: "桌面组件",
  visual: "视觉氛围",
  other: "其他",
  unknown: "未声明",
};

export const QUALITY_CLASS_LABELS: Record<QualityClass, string> = {
  light: "轻量省资源",
  balanced: "均衡",
  quality: "高画质",
  unverified: "未测试",
};

export const RECOMMENDED_USE_LABELS: Record<RecommendedUse, string> = {
  office: "日常办公",
  laptop: "笔记本省电",
  multiMonitor: "多屏使用",
  highQuality: "沉浸观赏",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

export const RENDER_CLASS_LABELS: Record<RenderClass, string> = {
  css: "CSS / SVG",
  canvas2d: "Canvas 2D",
  webgl: "WebGL / WebGPU",
  video: "视频",
  hybrid: "混合渲染",
};

export const INTERACTION_LEVEL_LABELS: Record<InteractionLevel, string> = {
  static: "静态展示",
  interactive: "交互操作",
  continuous: "持续动画",
  unknown: "未声明",
};

export const UPDATE_POLICY_LABELS: Record<UpdatePolicy, string> = {
  onDemand: "按需",
  interval: "定时",
  animation: "连续动画",
  unknown: "未声明",
};

export const BACKGROUND_POLICY_LABELS: Record<BackgroundPolicy, string> = {
  pause: "暂停",
  throttle: "降低资源占用",
  continue: "持续运行",
  unknown: "未声明",
};

export const MULTI_MONITOR_MODE_LABELS: Record<MultiMonitorMode, string> = {
  mirror: "镜像",
  independent: "独立",
  span: "跨屏",
};

export const WINDOW_ABILITY_LABELS: Record<WindowAbility, string> = {
  drag: "可拖动",
  resize: "可缩放",
  multiInstance: "多实例",
  alwaysOnTop: "置顶",
  transparent: "透明",
};

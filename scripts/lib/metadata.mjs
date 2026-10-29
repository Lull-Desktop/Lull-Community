/**
 * 社区元数据归一化。
 *
 * 目标：输出结构稳定（字段齐全），但**不猜测**未声明的内容。
 *
 * - 能从上游清单确认的事实 → 推导（并标注来源，如 performanceEvidence）；
 * - 只有作者能声明的语义 → 只读 `item.json` 的 `meta`，缺省写 `unknown` / `[]` / `null`；
 * - `null`（CapabilitySupport）表示「未声明或未确认」，绝不与 `false`（确认不支持）混用。
 *
 * 字段定义与枚举的单一事实来源是 `schemas/community-item.schema.json`。
 */

const UNKNOWN = "unknown";

/** 能力名 → 权限名。只映射语义确定的一对一关系，不做推测。 */
const CAPABILITY_PERMISSIONS = {
  "widget.network": "network",
  "widget.media": "media",
};

/**
 * `meta` 里显式声明优先，未声明才用推导/缺省值。
 * @param {Record<string, unknown>} meta
 * @param {string} key
 * @param {unknown} fallback
 */
function declaredOr(meta, key, fallback) {
  const value = meta[key];
  return value === undefined ? fallback : value;
}

function permissionsFromCapabilities(capabilities) {
  const out = [];
  for (const capability of capabilities) {
    const permission = CAPABILITY_PERMISSIONS[capability];
    if (permission) out.push(permission);
  }
  return out;
}

/** L2 公共字段：两种资源共用。 */
function commonMeta(meta, manifest, kind) {
  const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities : [];
  const scenePerformance = kind === "scene" ? manifest.performance : null;

  const tierDeclared = meta.performanceTier;
  const tierFromManifest = scenePerformance?.tier;
  const performanceTier = declaredOr(
    meta,
    "performanceTier",
    tierFromManifest ?? "unverified",
  );
  // 等级来源单独记：manifest-declared 只说明「继承自上游清单」，不代表测过。
  const performanceEvidence = declaredOr(
    meta,
    "performanceEvidence",
    tierDeclared !== undefined
      ? "author-declared"
      : tierFromManifest !== undefined
        ? "manifest-declared"
        : "unverified",
  );

  return {
    renderType: declaredOr(meta, "renderType", UNKNOWN),
    renderTech: declaredOr(meta, "renderTech", []),
    requiredFeatures: declaredOr(meta, "requiredFeatures", []),
    optionalFeatures: declaredOr(meta, "optionalFeatures", []),
    performanceTier,
    performanceEvidence,
    hardwareLevel: declaredOr(meta, "hardwareLevel", UNKNOWN),
    powerProfile: declaredOr(meta, "powerProfile", UNKNOWN),
    // 目标帧率同样不做推测：只有清单或作者明确给了才填。
    targetFps:
      kind === "scene"
        ? (scenePerformance?.targetFps ?? null)
        : declaredOr(meta, "targetFps", null),
    supportsPause: declaredOr(meta, "supportsPause", null),
    supportsReducedMotion: declaredOr(meta, "supportsReducedMotion", null),
    platforms:
      kind === "scene"
        ? (manifest.compatibility?.platforms ?? [])
        : declaredOr(meta, "platforms", []),
    runtimeRequirements: declaredOr(meta, "runtimeRequirements", null),
    requiredPermissions: declaredOr(
      meta,
      "requiredPermissions",
      permissionsFromCapabilities(capabilities),
    ),
    optionalPermissions: declaredOr(meta, "optionalPermissions", []),
    // 资源侧只表达「支持/建议」；宿主实际执行策略不属于元数据。
    backgroundPolicy: declaredOr(meta, "backgroundPolicy", UNKNOWN),
    networkPolicy: declaredOr(meta, "networkPolicy", UNKNOWN),
    recommendedUse: declaredOr(meta, "recommendedUse", []),
  };
}

/** L3 壁纸（scene）专属字段。widget 专属键在这里不会被读取，也就不会出现在结果里。 */
function sceneMeta(meta, manifest) {
  const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities : [];
  return {
    resourceType: "scene",
    sceneType: declaredOr(meta, "sceneType", UNKNOWN),
    visualStyle: declaredOr(meta, "visualStyle", []),
    animationMode: declaredOr(meta, "animationMode", UNKNOWN),
    qualityProfiles: declaredOr(meta, "qualityProfiles", []),
    resolutionProfiles: declaredOr(meta, "resolutionProfiles", []),
    multiMonitorModes: declaredOr(meta, "multiMonitorModes", []),
    // 能力清单只说明「可以申请多屏同步」，没申请就是未确认，而不是确认不支持。
    supportsSync: declaredOr(
      meta,
      "supportsSync",
      capabilities.includes("wallpaper.sync") ? true : null,
    ),
    supportsDynamicResolution: declaredOr(meta, "supportsDynamicResolution", null),
    supportsAdaptiveFps: declaredOr(meta, "supportsAdaptiveFps", null),
  };
}

/** L3 Widget 专属字段。scene 专属键在这里不会被读取。 */
function widgetMeta(meta, manifest) {
  const win = manifest.window ?? null;
  const hasMinSize =
    win !== null && win.minWidth !== undefined && win.minHeight !== undefined;

  return {
    resourceType: "widget",
    widgetType: declaredOr(meta, "widgetType", UNKNOWN),
    subcategories: declaredOr(meta, "subcategories", []),
    interactionLevel: declaredOr(meta, "interactionLevel", UNKNOWN),
    updatePolicy: declaredOr(meta, "updatePolicy", UNKNOWN),
    defaultSize:
      win !== null && win.width !== undefined && win.height !== undefined
        ? { width: win.width, height: win.height }
        : null,
    minSize: hasMinSize ? { width: win.minWidth, height: win.minHeight } : null,
    // 窗口清单里写了就是确认值；没写才是未确认。
    resizable: declaredOr(meta, "resizable", win?.resizable ?? null),
    supportsTransparency: declaredOr(meta, "supportsTransparency", win?.transparent ?? null),
    multiInstance: declaredOr(meta, "multiInstance", null),
    alwaysOnTop: declaredOr(meta, "alwaysOnTop", null),
    supportsDrag: declaredOr(meta, "supportsDrag", null),
    supportsClickThrough: declaredOr(meta, "supportsClickThrough", null),
  };
}

/**
 * @param {{ kind: "scene" | "widget", manifest: Record<string, any>, item: Record<string, any> }} input
 * @returns {Record<string, any>} 字段齐全、可直接序列化进 catalog.json 的 meta
 */
export function deriveMeta({ kind, manifest, item }) {
  const meta = item?.meta ?? {};
  const common = commonMeta(meta, manifest, kind);
  const business = kind === "scene" ? sceneMeta(meta, manifest) : widgetMeta(meta, manifest);
  return { ...common, ...business };
}

export { UNKNOWN };

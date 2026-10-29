import { INTERACTION_LEVEL, UPDATE_POLICY, WIDGET_TYPE } from "@/generated/community-enums";

import type { CapabilitySupport, MetaBase, Size } from "./common";

export type WidgetType = (typeof WIDGET_TYPE)[number];
export type InteractionLevel = (typeof INTERACTION_LEVEL)[number];
export type UpdatePolicy = (typeof UPDATE_POLICY)[number];

/** Widget（窗口组件）的业务字段。建议值来自清单，实际窗口行为由宿主窗口管理器执行。 */
export interface WidgetMeta extends MetaBase {
  resourceType: "widget";

  widgetType: WidgetType;
  subcategories: string[];

  interactionLevel: InteractionLevel;
  updatePolicy: UpdatePolicy;

  defaultSize: Size | null;
  minSize: Size | null;

  resizable: CapabilitySupport;
  multiInstance: CapabilitySupport;
  alwaysOnTop: CapabilitySupport;
  supportsDrag: CapabilitySupport;
  supportsTransparency: CapabilitySupport;
  supportsClickThrough: CapabilitySupport;
}

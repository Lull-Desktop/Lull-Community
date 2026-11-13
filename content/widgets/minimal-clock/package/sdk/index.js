/**
 * `@lull/widget-sdk` 公共入口。
 *
 * 第三方插件只需要：
 * ```ts
 * import { connectLullWidget } from "@lull/widget-sdk";
 * ```
 * React / Vue 适配在子路径里，避免没有用到框架的插件被迫加载 peer 依赖。
 */
export { connectLullWidget, createLullWidgetClient } from "./client.js";
export { LullWidgetError } from "./errors.js";
export { isWidgetCapability, isWidgetHostMessage, normalizeViewport, WIDGET_CAPABILITIES, WIDGET_PROTOCOL, } from "./protocol.js";
export { createDomTransport, isEmbedded } from "./transport.js";
//# sourceMappingURL=index.js.map
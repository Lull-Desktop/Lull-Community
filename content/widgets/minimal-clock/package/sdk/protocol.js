/**
 * 桥协议 v1 的线上格式（wire format）。
 *
 * 这一层是插件与宿主之间唯一的契约：宿主壳（`src/components/widget-plugin-shell.tsx`）
 * 按这里的结构收发消息，插件侧只通过 postMessage 说话。改动任何字段都必须同时改宿主壳、
 * `packages/widget-sdk` 与 `docs/widget-sdk.md`，并递增 `WIDGET_PROTOCOL`。
 */
/** 桥协议版本。破坏性变更才递增；当前与宿主 `PROTOCOL_VERSION` 必须一致。 */
export const WIDGET_PROTOCOL = 1;
/** 清单允许声明的能力；宿主按 `.grants.json` 二次校验。 */
export const WIDGET_CAPABILITIES = [
    "widget.ui",
    "widget.theme",
    "widget.state",
    "widget.audio",
    "widget.media",
    "widget.network",
    "widget.chrome",
    "media.noise.library.read",
    "media.noise.session.read",
    "media.noise.session.control",
    "media.noise.tracks.read",
    "media.noise.tracks.write",
    "media.noise.volume.write",
    "media.noise.presets.read",
    "media.noise.presets.write",
    "media.player.read",
    "media.player.control",
    "media.player.volume.write",
    "media.queue.read",
    "media.queue.write",
    "media.library.read",
    "media.library.directory.read",
    "media.library.favorites.write",
    "media.library.sources.write",
    "game.state.read",
    "game.command.send",
    "game.event.read",
];
/** 能力名是否在清单白名单内（宿主下发的 `granted` 可能是任意字符串）。 */
export function isWidgetCapability(value) {
    return (typeof value === "string" &&
        WIDGET_CAPABILITIES.includes(value));
}
/** 收包的最低门槛：版本一致且带 `type`。字段级校验交给具体分支。 */
export function isWidgetHostMessage(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const record = value;
    return record.v === WIDGET_PROTOCOL && typeof record.type === "string";
}
/** 把宿主给的 `viewport` 归一化，坏数据回落到 0 尺寸而不是 NaN。 */
export function normalizeViewport(value) {
    if (typeof value !== "object" || value === null) {
        return { width: 0, height: 0, dpr: 1 };
    }
    const record = value;
    return {
        width: Number(record.width) || 0,
        height: Number(record.height) || 0,
        dpr: Number(record.dpr) || 1,
    };
}
//# sourceMappingURL=protocol.js.map
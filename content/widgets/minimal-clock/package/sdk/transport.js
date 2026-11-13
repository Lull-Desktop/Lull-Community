/**
 * 传输层：把「和宿主说话」抽象成一个可替换的接口。
 *
 * 生产环境用 `createDomTransport()`（window.postMessage）；单元测试或
 * 非 iframe 宿主（例如把插件嵌进自家 electron 壳）可以换成自己的实现。
 */
import { isWidgetHostMessage, WIDGET_PROTOCOL, } from "./protocol.js";
/**
 * 默认传输：`window.postMessage` + `message` 事件。
 * `target` 默认是 `window.parent`；只在包了一层 iframe 的宿主里才需要显式传入。
 */
export function createDomTransport(target) {
    const hostWindow = () => target ?? window.parent;
    return {
        post(message) {
            hostWindow().postMessage(message, "*");
        },
        listen(listener) {
            const onMessage = (event) => {
                // 只接受父窗口的消息：同页其它 frame 或插件自己发出的消息一律忽略。
                if (event.source !== null && event.source !== hostWindow())
                    return;
                if (!isWidgetHostMessage(event.data)) {
                    return;
                }
                listener(event.data);
            };
            window.addEventListener("message", onMessage);
            return () => {
                window.removeEventListener("message", onMessage);
            };
        },
    };
}
/** 是否真的嵌在宿主 iframe 里（SSR 与顶层页面返回 false）。 */
export function isEmbedded() {
    return typeof window !== "undefined" && window.parent !== window;
}
/** ready 消息的构造器，供自定义传输复用。 */
export function readyMessage() {
    return { v: WIDGET_PROTOCOL, type: "ready", protocol: WIDGET_PROTOCOL };
}
//# sourceMappingURL=transport.js.map
/**
 * 插件侧客户端：握手、typed request、状态 KV、主题/视口/可见性订阅。
 *
 * 只依赖 `WidgetBridgeTransport`，不假设自己跑在 iframe 里——
 * 默认传输是 `window.postMessage`，测试或其它宿主可以注入自己的实现。
 */
import { LullWidgetError } from "./errors.js";
import { isWidgetCapability, normalizeViewport, WIDGET_PROTOCOL, } from "./protocol.js";
import { createDomTransport, isEmbedded, readyMessage, } from "./transport.js";
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_INIT_TIMEOUT_MS = 10000;
let shared = null;
/**
 * 连接宿主。必须在宿主 iframe 内调用；同一页面重复调用返回同一个 Promise。
 *
 * ```ts
 * const lull = await connectLullWidget();
 * const count = await lull.getState("count", 0);
 * ```
 */
export function connectLullWidget(options = {}) {
    if (!options.transport && shared)
        return shared;
    const promise = handshake(options);
    if (!options.transport) {
        shared = promise;
        // 失败后允许重试：宿主可能只是还没加载完。
        promise.catch(() => {
            if (shared === promise)
                shared = null;
        });
    }
    return promise;
}
function handshake(options) {
    return new Promise((resolve, reject) => {
        if (!options.transport && !isEmbedded()) {
            reject(new LullWidgetError("not-embedded", "Lull Widget 必须在宿主 iframe 中运行。"));
            return;
        }
        const transport = options.transport ?? createDomTransport();
        const timeoutMs = Number.isFinite(options.timeoutMs)
            ? Number(options.timeoutMs)
            : DEFAULT_INIT_TIMEOUT_MS;
        let settled = false;
        let stop = null;
        const timer = window.setTimeout(() => {
            if (settled)
                return;
            settled = true;
            stop?.();
            reject(new LullWidgetError("init-timeout", "宿主未在超时前完成初始化。"));
        }, timeoutMs);
        stop = transport.listen((message) => {
            // 只认 init；repeat 的 init（宿主重发）在 settled 后忽略。
            if (settled || message.type !== "init")
                return;
            settled = true;
            window.clearTimeout(timer);
            stop?.();
            try {
                const client = createLullWidgetClient(message, { transport });
                // ready 可能先于宿主监听器发出而丢失；收到 init 后再补一次，
                // 让 Slot 的启动事务能可靠拿到“SDK 已就绪”信号。
                transport.post(readyMessage());
                resolve(client);
            }
            catch (error) {
                reject(error);
            }
        });
        transport.post(readyMessage());
    });
}
/**
 * 用一条已收到的 `init` 消息构造客户端。
 * 一般由 `connectLullWidget` 调用；需要自己管握手（例如多次挂载）时才直接用。
 */
export function createLullWidgetClient(init, options = {}) {
    if (init.v !== WIDGET_PROTOCOL) {
        throw new LullWidgetError("bad-init", `桥协议版本不匹配：宿主 ${String(init.v)}，SDK ${String(WIDGET_PROTOCOL)}。`);
    }
    if (typeof init.token !== "string" || init.token.length === 0) {
        throw new LullWidgetError("bad-init", "宿主 init 消息缺少 token。");
    }
    const transport = options.transport ?? createDomTransport();
    const requestTimeoutMs = Number.isFinite(options.requestTimeoutMs)
        ? Number(options.requestTimeoutMs)
        : DEFAULT_REQUEST_TIMEOUT_MS;
    const token = init.token;
    const capabilities = new Set();
    for (const capability of init.granted ?? []) {
        if (isWidgetCapability(capability))
            capabilities.add(capability);
    }
    const state = {
        theme: init.theme ?? null,
        viewport: normalizeViewport(init.viewport),
        visible: true,
        transparent: Boolean(init.window?.transparent),
        locale: init.locale ?? "zh-CN",
    };
    if (init.window?.transparent === false) {
        applyWindowBackground(false, null);
    }
    let sequence = 0;
    let disposed = false;
    const pending = new Map();
    const themeListeners = new Set();
    const viewportListeners = new Set();
    const visibilityListeners = new Set();
    const localeListeners = new Set();
    const mediaListeners = new Set();
    const windowStateListeners = new Set();
    const stopListening = transport.listen((message) => {
        switch (message.type) {
            case "theme": {
                if (!message.theme)
                    return;
                state.theme = message.theme;
                for (const listener of themeListeners)
                    listener(message.theme);
                return;
            }
            case "viewport": {
                state.viewport = normalizeViewport(message.viewport);
                for (const listener of viewportListeners)
                    listener(state.viewport);
                return;
            }
            case "visibility": {
                state.visible = message.visible !== false;
                for (const listener of visibilityListeners)
                    listener(state.visible);
                return;
            }
            case "locale": {
                state.locale = message.locale;
                for (const listener of localeListeners)
                    listener(state.locale);
                return;
            }
            case "media.event": {
                for (const listener of mediaListeners)
                    listener(message.event);
                return;
            }
            case "window.state": {
                const kind = typeof message.kind === "string" ? message.kind : "";
                if (!kind)
                    return;
                const visible = message.visible === true;
                const tab = typeof message.tab === "string" ? message.tab : undefined;
                for (const listener of windowStateListeners)
                    listener({ kind, visible, tab });
                return;
            }
            case "response": {
                if (typeof message.id !== "number")
                    return;
                const entry = pending.get(message.id);
                if (!entry)
                    return;
                pending.delete(message.id);
                window.clearTimeout(entry.timer);
                if (message.ok) {
                    entry.resolve(message.result);
                }
                else {
                    entry.reject(new LullWidgetError("host-error", message.error || "宿主请求失败"));
                }
                return;
            }
            case "init":
                // 握手已经在 connectLullWidget 完成；重复 init 不重建客户端。
                return;
        }
    });
    function request(method, params) {
        if (disposed) {
            return Promise.reject(new LullWidgetError("disposed", "客户端已销毁。"));
        }
        const id = ++sequence;
        return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
                pending.delete(id);
                reject(new LullWidgetError("timeout", `宿主未响应 ${method}。`));
            }, requestTimeoutMs);
            pending.set(id, {
                resolve: (value) => resolve(value),
                reject,
                timer,
            });
            transport.post({
                v: WIDGET_PROTOCOL,
                type: "request",
                id,
                method,
                params: (params ?? {}),
                token,
            });
        });
    }
    function getStateImpl(key, fallback) {
        return request("state.get", { key }).then((result) => {
            const value = result && typeof result === "object" && "value" in result
                ? result.value
                : null;
            return value === null || value === undefined
                ? (fallback ?? null)
                : value;
        });
    }
    const client = {
        protocol: WIDGET_PROTOCOL,
        id: init.id,
        hostApi: init.hostApi,
        minimizable: Boolean(init.minimizable),
        get transparent() {
            return state.transparent;
        },
        window: init.window ?? null,
        capabilities: [...capabilities],
        get theme() {
            return state.theme;
        },
        get viewport() {
            return state.viewport;
        },
        get visible() {
            return state.visible;
        },
        get locale() {
            return state.locale;
        },
        has(capability) {
            return capabilities.has(capability);
        },
        request,
        // 重载签名与实现签名不同，这里收窄为接口声明。
        getState: getStateImpl,
        async setState(key, value) {
            await request("state.set", { key, value });
        },
        async removeState(key) {
            await request("state.remove", { key });
        },
        async requestAudio() {
            const result = await request("audio.request", {});
            return Boolean(result?.granted);
        },
        async requestResize(options) {
            return request("resize.request", {
                width: options.width,
                height: options.height,
                anchor: options.anchor,
            });
        },
        async startDrag() {
            await request("window.startDrag", {});
        },
        async minimize() {
            await request("window.minimize", {});
        },
        async setTransparent(transparent, color = null) {
            const next = Boolean(transparent);
            const nextColor = typeof color === "string" ? color : null;
            await request("window.setTransparent", {
                transparent: next,
                color: nextColor,
            });
            applyWindowBackground(next, nextColor);
            state.transparent = next;
        },
        async alignPlayer(options) {
            return request("window.alignPlayer", {
                currentSide: options.currentSide,
                nextSide: options.nextSide,
                width: options.width,
                playerAnchor: options.playerAnchor,
            });
        },
        async close() {
            await request("close", {});
        },
        async openWindow(options) {
            await request("window.open", {
                kind: options.kind,
                tab: options.tab,
            });
        },
        async closeWindow(options) {
            await request("window.close", { kind: options.kind });
        },
        async isWindowOpen(kind) {
            const result = await request("window.isOpen", { kind });
            return Boolean(result?.visible);
        },
        log(message, level = "log") {
            void request("log", { level, message: String(message) }).catch(() => {
                // 日志失败不影响插件主流程。
            });
        },
        onTheme(listener) {
            themeListeners.add(listener);
            if (state.theme)
                listener(state.theme);
            return () => {
                themeListeners.delete(listener);
            };
        },
        onViewport(listener) {
            viewportListeners.add(listener);
            listener(state.viewport);
            return () => {
                viewportListeners.delete(listener);
            };
        },
        onVisibility(listener) {
            visibilityListeners.add(listener);
            listener(state.visible);
            return () => {
                visibilityListeners.delete(listener);
            };
        },
        onLocale(listener) {
            localeListeners.add(listener);
            listener(state.locale);
            return () => {
                localeListeners.delete(listener);
            };
        },
        onMediaEvent(listener) {
            mediaListeners.add(listener);
            return () => {
                mediaListeners.delete(listener);
            };
        },
        onWindowState(listener) {
            windowStateListeners.add(listener);
            return () => {
                windowStateListeners.delete(listener);
            };
        },
        destroy() {
            if (disposed)
                return;
            disposed = true;
            stopListening();
            for (const entry of pending.values()) {
                window.clearTimeout(entry.timer);
                entry.reject(new LullWidgetError("disposed", "客户端已销毁。"));
            }
            pending.clear();
            themeListeners.clear();
            viewportListeners.clear();
            visibilityListeners.clear();
            localeListeners.clear();
            mediaListeners.clear();
            windowStateListeners.clear();
            shared = null;
        },
    };
    return client;
}
/** 非透明窗口由插件自己铺底色，避免 WebView 透出桌面。 */
function applyWindowBackground(transparent, color) {
    if (typeof document === "undefined")
        return;
    const root = document.documentElement;
    const body = document.body;
    if (transparent) {
        root.style.removeProperty("background-color");
        body.style.removeProperty("background-color");
        return;
    }
    const value = color ?? "#f6f3ec";
    root.style.backgroundColor = value;
    body.style.backgroundColor = value;
}
//# sourceMappingURL=client.js.map
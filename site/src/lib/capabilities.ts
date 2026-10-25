/**
 * 能力说明文案。
 *
 * 词汇与分级来自 Lull 主仓库 `docs/widget-sdk.md` 与 `docs/content-format.md`：
 * 「硬约束」是宿主真正能拦住的（CSP、KV、窗口命令），「软约束」只是产品策略，
 * 页面上必须区分，不能让用户以为撤销软约束就等于沙箱隔离。
 */
export type CapabilityInfo = {
  label: string;
  detail: string;
  level: "基础" | "软约束" | "硬约束";
};

export const SCENE_CAPABILITIES: Record<string, CapabilityInfo> = {
  "wallpaper.viewport": {
    label: "视口几何",
    detail: "读取显示器尺寸、缩放与每屏区域，用来把画面铺满而不变形。",
    level: "基础",
  },
  "wallpaper.canvas": {
    label: "画布绘制",
    detail: "允许使用 Canvas / WebGL 等绘制能力；纯 CSS 场景其实用不到。",
    level: "基础",
  },
  "wallpaper.sync": {
    label: "多屏同步",
    detail: "在多个显示器之间对齐动画相位，避免同一场景在两块屏幕上错拍。",
    level: "基础",
  },
  "wallpaper.params": {
    label: "参数面板",
    detail: "在壁纸设置里暴露可调参数（颜色、强度、周期）。必须配合脚本能力。",
    level: "基础",
  },
  "wallpaper.script": {
    label: "执行脚本",
    detail:
      "场景需要 JavaScript 时声明。iframe 会放开 allow-scripts，但仍是不透明源，拿不到宿主 DOM。",
    level: "硬约束",
  },
};

export const WIDGET_CAPABILITIES: Record<string, CapabilityInfo> = {
  "widget.ui": {
    label: "界面渲染",
    detail: "在窗口里绘制自己的 UI、样式与动画。所有工具都需要它。",
    level: "基础",
  },
  "widget.theme": {
    label: "跟随主题",
    detail: "接收宿主下发的流光主题令牌。插件可以自愿忽略，不影响运行。",
    level: "软约束",
  },
  "widget.state": {
    label: "状态持久化",
    detail: "通过宿主 KV 保存状态，键按窗口 label 推导，插件伪造 id 无效。",
    level: "硬约束",
  },
  "widget.audio": {
    label: "提示音",
    detail: "请求发声前询问宿主；未授权时静音运行。iframe 仍可能自行播放，属于提示级约束。",
    level: "软约束",
  },
  "widget.media": {
    label: "导入媒体",
    detail: "通过宿主打开文件选择器；未授权时插件仍可用浏览器原生选择。",
    level: "软约束",
  },
  "widget.network": {
    label: "联网",
    detail:
      "只放行清单里声明的 https 源。未授权时 CSP 的 connect-src 只剩插件自身，外部请求直接被拦。",
    level: "硬约束",
  },
  "widget.chrome": {
    label: "自绘顶栏",
    detail: "自己绘制拖拽区与最小化/关闭按钮。撤销后窗口回退到宿主顶栏。",
    level: "硬约束",
  },
};

export function capabilityInfo(capability: string): CapabilityInfo {
  return (
    SCENE_CAPABILITIES[capability] ??
    WIDGET_CAPABILITIES[capability] ?? {
      label: capability,
      detail: "未知能力：Lull 的白名单里没有它，安装时会被拒绝。",
      level: "硬约束",
    }
  );
}

export const LEVEL_STYLE: Record<CapabilityInfo["level"], string> = {
  基础: "bg-accent-soft text-accent-deep",
  软约束: "bg-amber-50 text-amber-800",
  硬约束: "bg-rose-50 text-rose-800",
};

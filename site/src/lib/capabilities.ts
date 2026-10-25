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
  "viewport": {
    label: "视口几何",
    detail: "读取显示器尺寸、缩放与每屏区域",
    level: "基础",
  },
  "canvas": {
    label: "画布绘制",
    detail: "允许使用 Canvas / WebGL 等绘制能力",
    level: "基础",
  },
  "sync": {
    label: "多屏同步",
    detail: "在多个显示器之间对齐动画相位",
    level: "基础",
  },
  "params": {
    label: "参数面板",
    detail: "在壁纸设置里暴露可调参数",
    level: "基础",
  },
  "script": {
    label: "执行脚本",
    detail:
      "场景是否需要 JS 运行环境",
    level: "硬约束",
  },
};

export const WIDGET_CAPABILITIES: Record<string, CapabilityInfo> = {
  "widget.ui": {
    label: "界面渲染",
    detail: "在窗口里绘制自己的 UI、样式与动画",
    level: "基础",
  },
  "widget.theme": {
    label: "跟随主题",
    detail: "接收宿主样式匹配",
    level: "软约束",
  },
  "widget.state": {
    label: "状态持久化",
    detail: "通过宿主 KV 保存状态",
    level: "硬约束",
  },
  "widget.audio": {
    label: "提示音",
    detail: "授权播放音频",
    level: "软约束",
  },
  "widget.media": {
    label: "导入媒体",
    detail: "授权通过宿主打开文件选择器",
    level: "软约束"
  },
  "widget.network": {
    label: "联网",
    detail:
      "授权联网",
    level: "硬约束",
  },
  "widget.chrome": {
    label: "自绘顶栏",
    detail: "自己绘制拖拽区与最小化/关闭按钮",
    level: "硬约束",
  },
};

/**
 * 清单里的能力名带命名空间（`wallpaper.viewport`、`widget.ui`），
 * 文案表里的场景键省略了前缀。两边都要能查到，否则详情页会把
 * 合法能力当成「未知能力」误报。
 */
export function capabilityInfo(capability: string): CapabilityInfo {
  const bare = capability.replace(/^(?:wallpaper|widget)\./, "");
  return (
    SCENE_CAPABILITIES[capability] ??
    SCENE_CAPABILITIES[bare] ??
    WIDGET_CAPABILITIES[capability] ??
    WIDGET_CAPABILITIES[bare] ?? {
      label: capability,
      detail: "未知能力：Lull 的白名单里没有它，安装时会被拒绝。",
      level: "硬约束",
    }
  );
}

export const LEVEL_STYLE: Record<CapabilityInfo["level"], string> = {
  基础: "bg-primary/12 text-accent ring-1 ring-inset ring-primary/30",
  软约束: "bg-dusk/10 text-dusk ring-1 ring-inset ring-dusk/30",
  硬约束: "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-400/25",
};

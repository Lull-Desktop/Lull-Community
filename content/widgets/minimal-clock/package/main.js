import { connectLullWidget } from "./sdk/index.js";

/** Local time, updated at the next second boundary. */
const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
const hourHand = document.getElementById("hour-hand");
const minuteHand = document.getElementById("minute-hand");
const secondHand = document.getElementById("second-hand");
const dateEl = document.getElementById("date");
const timeEl = document.getElementById("time");
const pad = (value) => String(value).padStart(2, "0");

function render() {
  const now = new Date();
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  hourHand.style.transform = `rotate(${hours * 30}deg)`;
  minuteHand.style.transform = `rotate(${minutes * 6}deg)`;
  secondHand.style.transform = `rotate(${seconds * 6}deg)`;
  dateEl.textContent = `${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
  timeEl.dateTime = now.toISOString();
  timeEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(seconds)}`;
  setTimeout(render, 1000 - now.getMilliseconds());
}
render();

// The clock itself is the drag handle; window controls use the supported host bridge.
const clock = document.querySelector(".alarm-clock");
const smaller = document.getElementById("smaller");
const larger = document.getElementById("larger");
const close = document.getElementById("close");
const status = document.getElementById("status");
const sizes = [
  { width: 320, height: 300 },
  { width: 340, height: 350 },
  { width: 400, height: 420 },
  { width: 460, height: 500 },
  { width: 540, height: 600 },
];
let client = null;
let currentWidth = window.innerWidth;
let resizing = false;
let statusTimer;

function notify(message) {
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.textContent = ""; }, 3500);
}

function refreshControls() {
  smaller.disabled = resizing || currentWidth <= sizes[0].width;
  larger.disabled = resizing || currentWidth >= sizes.at(-1).width;
}

document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("selectstart", (event) => event.preventDefault());
document.addEventListener("dragstart", (event) => event.preventDefault());

clock.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (!client?.has("widget.chrome")) {
    notify("请在 Lull 中授权窗口控制");
    return;
  }
  event.preventDefault();
  void client.startDrag().catch(() => notify("无法拖动窗口，请检查窗口控制权限"));
});

async function resize(direction) {
  if (!client?.has("widget.chrome")) {
    notify("请在 Lull 中授权窗口控制");
    return;
  }
  const candidates = direction < 0 ? [...sizes].reverse() : sizes;
  const target = candidates.find(({ width }) => direction < 0 ? width < currentWidth : width > currentWidth);
  if (!target || resizing) return;
  resizing = true;
  refreshControls();
  try {
    const result = await client.requestResize(target);
    if (!result?.applied) throw new Error("resize not applied");
    currentWidth = result.width;
  } catch {
    notify("无法调整窗口大小，请检查窗口控制权限");
  } finally {
    resizing = false;
    refreshControls();
  }
}

smaller.addEventListener("click", () => void resize(-1));
larger.addEventListener("click", () => void resize(1));
close.addEventListener("click", () => {
  if (!client) { notify("请在 Lull 中关闭时钟"); return; }
  void client.close().catch(() => notify("无法关闭窗口"));
});
window.addEventListener("resize", () => { currentWidth = window.innerWidth; refreshControls(); });
refreshControls();

connectLullWidget().then((connected) => {
  client = connected;
  connected.onViewport(({ width }) => { currentWidth = width; refreshControls(); });
}).catch(() => {
  // The visual clock also runs in a normal browser without the Lull host.
});

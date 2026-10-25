/**
 * 4-7-8 呼吸引导。
 *
 * 状态机只有三段：吸气 4s → 屏息 7s → 呼气 8s，循环计数。
 * 每帧用 requestAnimationFrame 计算进度，直接写 CSS 变量与 transform，
 * 不走 setTimeout 链：窗口被挂起再唤醒时不会漂移。
 */
const PHASES = [
  { key: "inhale", label: "吸气", seconds: 4, from: 0.62, to: 1 },
  { key: "hold", label: "屏息", seconds: 7, from: 1, to: 1 },
  { key: "exhale", label: "呼气", seconds: 8, from: 1, to: 0.62 },
];

const RING_LENGTH = 653.45;

const orb = document.getElementById("orb");
const ring = document.getElementById("progress");
const phaseEl = document.getElementById("phase");
const countEl = document.getElementById("count");
const cycleEl = document.getElementById("cycle");

let phaseIndex = 0;
let phaseStartedAt = performance.now();
let cycles = 0;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function render(now) {
  const phase = PHASES[phaseIndex];
  const elapsed = (now - phaseStartedAt) / 1000;

  if (elapsed >= phase.seconds) {
    phaseStartedAt = now;
    phaseIndex += 1;
    if (phaseIndex >= PHASES.length) {
      phaseIndex = 0;
      cycles += 1;
      cycleEl.textContent = String(cycles);
    }
    requestAnimationFrame(render);
    return;
  }

  const t = Math.min(elapsed / phase.seconds, 1);
  const scale = phase.from + (phase.to - phase.from) * easeInOut(t);
  orb.style.transform = `scale(${scale.toFixed(4)})`;
  ring.style.strokeDashoffset = String(RING_LENGTH * (1 - t));

  phaseEl.textContent = phase.label;
  countEl.textContent = String(Math.max(1, Math.ceil(phase.seconds - elapsed)));

  requestAnimationFrame(render);
}

phaseEl.textContent = PHASES[0].label;
requestAnimationFrame(render);

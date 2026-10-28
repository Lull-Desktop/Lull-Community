/**
 * zip 字节的**可复现性**测试。
 *
 * 离线签名的前提是：同一份内容，在任何机器、任何时区打出来的 zip 必须逐字节相同。
 * 否则 `release.json` 里的 `zip.sha256` 在 CI 上必然对不上，而报错长得像「被篡改」，
 * 排查方向会被带偏（2026-10-28 就是这么挂的：DOS 时间字段取了本地时区）。
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createZip } from "../scripts/lib/zip.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_URL = pathToFileURL(join(ROOT, "scripts", "lib", "zip.mjs")).href;
const FIXED = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));

const entries = () => [
  { name: "catalog.json", data: Buffer.from('{"schemaVersion":1}\n') },
  { name: "scenes/demo/index.html", data: Buffer.from("<html><body>hi</body></html>\n") },
  { name: "scenes/demo/assets/a.bin", data: Buffer.from([0, 1, 2, 255, 254, 0, 7]) },
];

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

/** 在子进程里打一次包，返回 sha256；`TZ` 用来模拟别的时区。 */
const buildInChildProcess = (tz) => {
  const code = `
    import { createHash } from "node:crypto";
    const { createZip } = await import(${JSON.stringify(MODULE_URL)});
    const entries = ${JSON.stringify(
      entries().map((entry) => ({ name: entry.name, data: [...entry.data] })),
    )}.map((entry) => ({ name: entry.name, data: Buffer.from(entry.data) }));
    const buffer = createZip(entries, new Date(Date.UTC(2024, 0, 1, 0, 0, 0)));
    process.stdout.write(createHash("sha256").update(buffer).digest("hex"));
  `;
  const env = { ...process.env };
  if (tz) env.TZ = tz;
  else delete env.TZ;
  return execFileSync(process.execPath, ["--input-type=module", "-e", code], { env, encoding: "utf8" }).trim();
};

test("DOS 时间字段按 UTC 写入（不是本地时区）", () => {
  const buffer = createZip(entries(), FIXED);
  const time = buffer.readUInt16LE(10);
  const date = buffer.readUInt16LE(12);
  assert.equal(time, 0, "UTC 午夜应当写成 00:00:00；出现 08:00 说明取了本地时区（UTC+8）");
  assert.equal(1980 + (date >> 9), 2024);
  assert.equal((date >> 5) & 15, 1, "月份应当是 1 月");
  assert.equal(date & 31, 1, "日期应当是 1 日");
});

test("同一份内容在不同时区打出来字节一致", () => {
  const local = sha(createZip(entries(), FIXED));
  const utc = buildInChildProcess("UTC");
  const shanghai = buildInChildProcess("Asia/Shanghai");
  assert.equal(utc, local, "TZ=UTC 的子进程应与本进程产出同一份字节");
  assert.equal(shanghai, local, "TZ=Asia/Shanghai 的子进程应与本进程产出同一份字节");
  assert.equal(buildInChildProcess(null), local, "默认时区下也应当一致");
});

test("同样的输入连打两次字节一致", () => {
  assert.equal(sha(createZip(entries(), FIXED)), sha(createZip(entries(), FIXED)));
  // 内容变一个字节，哈希必须变（确认不是在比常量）
  const changed = entries();
  changed[0].data = Buffer.from('{"schemaVersion":2}\n');
  assert.notEqual(sha(createZip(changed, FIXED)), sha(createZip(entries(), FIXED)));
});

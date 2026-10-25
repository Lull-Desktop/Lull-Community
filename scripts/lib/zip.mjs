/**
 * 最小 ZIP 写入器：deflate + UTF-8 文件名 + 正斜杠条目 + 普通文件属性。
 *
 * 为什么不用系统压缩工具：Windows 的 `Compress-Archive` 会把条目名写成反斜杠，
 * Lull 安装器会以 `package.unsafe-entry: zip 内含反斜杠路径` 直接拒绝。
 * 所以社区站自己写 zip，保证在所有平台生成同一份结构。
 */
import { writeFileSync } from "node:fs";
import { crc32, deflateRawSync } from "node:zlib";

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time: time & 0xffff, date: day & 0xffff };
}

/**
 * @param {{ name: string, data: Buffer }[]} entries
 * @param {Date} [timestamp] 固定时间戳可生成可复现的 zip
 * @returns {Buffer}
 */
export function createZip(entries, timestamp = new Date()) {
  const { time, date } = dosDateTime(timestamp);
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const entry of entries) {
    if (entry.name.includes("\\")) {
      throw new Error(`zip 条目不能包含反斜杠：${entry.name}`);
    }
    if (entry.name.startsWith("/") || entry.name.split("/").includes("..")) {
      throw new Error(`zip 条目不能越界：${entry.name}`);
    }
    const name = Buffer.from(entry.name, "utf8");
    const raw = entry.data;
    const checksum = crc32(raw) >>> 0;
    const compressed = deflateRawSync(raw, { level: 9 });
    const useDeflate = compressed.length < raw.length;
    const payload = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // 版本
    local.writeUInt16LE(0x0800, 6); // UTF-8 文件名
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk
    central.writeUInt16LE(0, 36); // 内部属性
    central.writeUInt32LE((0o100644 * 0x10000) >>> 0, 38); // 普通文件 0644
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + payload.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, ...centrals, end]);
}

/**
 * @param {string} path
 * @param {{ name: string, data: Buffer }[]} entries
 * @returns {number} 写入字节数
 */
export function writeZip(path, entries, timestamp) {
  const buffer = createZip(entries, timestamp);
  writeFileSync(path, buffer);
  return buffer.length;
}

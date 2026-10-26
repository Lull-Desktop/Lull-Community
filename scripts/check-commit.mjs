#!/usr/bin/env node
/**
 * 提交信息校验：本地钩子与 PR 工作流共用同一份规则。
 *
 *   node scripts/check-commit.mjs --message "feat(scene): 新增「雾岚」"
 *   node scripts/check-commit.mjs --file .git/COMMIT_EDITMSG
 *   node scripts/check-commit.mjs --stdin              # 多条，用 NUL 或空行分隔
 *   node scripts/check-commit.mjs --range origin/main..HEAD
 *
 * 规则只约束「合并进 main 的那一条信息」（本仓库只用 squash，所以就是 PR 标题）：
 *
 *   type(scope): subject
 *
 * - type 必须在小写白名单里；scope 可省略，省略时不要空括号；
 * - 冒号后紧跟一个半角空格；subject 4–72 字，不以句号/分号结尾；
 * - 首行不超过 100 字符；有正文时，第二行必须空行；
 * - 破坏性变更用 `!`（`feat(scene)!: …`）或在正文写 `BREAKING CHANGE:`；
 * - `Merge …`、`Revert "…"`、`fixup! …`、`squash! …` 放行，它们不会原样进历史。
 *
 * 退出码 0 通过，1 有不合规的信息（附原因），2 用法错误。
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** 允许的 type：与 CONTRIBUTING 和投稿页的表格一一对应。 */
export const TYPES = [
  "feat", // 新作品 / 新站点能力
  "content", // 更新已有作品的清单、参数、素材
  "fix", // 修内容或站点的错误
  "docs", // 文档、注释
  "style", // 只动样式，不动行为
  "refactor", // 重构，不改变对外行为
  "perf", // 性能
  "test", // 测试与校验脚本
  "build", // 依赖、打包
  "ci", // 工作流与钩子
  "chore", // 其他杂务
  "revert", // 回滚
];

/** 允许的 scope：仓库里的模块名，不是自由文本。 */
export const SCOPES = ["scene", "widget", "content", "site", "ci", "deps", "docs", "repo"];

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9-]+)\))?(?<bang>!)?: (?<subject>.*)$/;
const BYPASS = [/^Merge /, /^Revert "/, /^fixup! /, /^squash! /];

const SUBJECT_MIN = 4;
const SUBJECT_MAX = 72;
const HEADER_MAX = 100;

/** 按码点计数，中文与 emoji 各算一个字。 */
const len = (text) => [...text].length;

/**
 * 校验一条提交信息。
 * @param {string} raw
 * @returns {{ ok: boolean, errors: string[], header: string }}
 */
export function checkMessage(raw) {
  const message = raw.replace(/\r\n/g, "\n").trim();
  const header = message.split("\n", 1)[0] ?? "";
  const errors = [];

  if (!message) return { ok: false, errors: ["提交信息为空。"], header };
  if (BYPASS.some((re) => re.test(header))) return { ok: true, errors: [], header };

  if (len(header) > HEADER_MAX) {
    errors.push(`首行 ${len(header)} 字符，超过 ${HEADER_MAX}。长说明放正文，不要挤在标题里。`);
  }

  const match = HEADER.exec(header);
  if (!match?.groups) {
    errors.push('格式应为 `type(scope): subject`，例如 `feat(scene): 新增「雾岚」静态场景`。');
    return { ok: false, errors, header };
  }

  const { type, scope, subject } = match.groups;

  if (!TYPES.includes(type)) {
    errors.push(`未知 type \`${type}\`，可选：${TYPES.join(" / ")}。`);
  }
  if (scope !== undefined && !SCOPES.includes(scope)) {
    errors.push(`未知 scope \`${scope}\`，可选：${SCOPES.join(" / ")}；不需要时整个括号省略。`);
  }
  if (!subject.trim()) {
    errors.push("subject 为空，写清楚这条提交做了什么。");
  } else {
    const length = len(subject.trim());
    if (length < SUBJECT_MIN) errors.push(`subject 只有 ${length} 字，至少 ${SUBJECT_MIN} 字。`);
    if (length > SUBJECT_MAX) {
      errors.push(`subject ${length} 字，超过 ${SUBJECT_MAX}；细节放正文。`);
    }
    if (/[。．.;；]$/.test(subject.trim())) errors.push("subject 不要以句号或分号结尾。");
  }

  const lines = message.split("\n");
  if (lines.length > 1 && lines[1].trim() !== "") {
    errors.push("首行之后要先空一行，再写正文。");
  }

  return { ok: errors.length === 0, errors, header };
}

function report(label, result) {
  if (result.ok) return true;
  console.error(`\n✗ ${label}\n  ${result.header || "(空)"}`);
  for (const error of result.errors) console.error(`  · ${error}`);
  return false;
}

function main(argv) {
  const args = [...argv];
  const messages = [];

  while (args.length > 0) {
    const flag = args.shift();
    switch (flag) {
      case "--message":
      case "-m": {
        const value = args.shift();
        if (value === undefined) return usage("--message 需要一条信息。");
        messages.push({ label: "提交信息", text: value });
        break;
      }
      case "--file":
      case "-f": {
        const path = args.shift();
        if (!path) return usage("--file 需要路径。");
        messages.push({ label: path, text: readFileSync(path, "utf8") });
        break;
      }
      case "--stdin": {
        const text = readFileSync(0, "utf8");
        for (const chunk of text.split(/\0|\n{2,}/)) {
          if (chunk.trim()) messages.push({ label: "标准输入", text: chunk });
        }
        break;
      }
      case "--range": {
        const range = args.shift();
        if (!range) return usage("--range 需要一个 git 范围，例如 origin/main..HEAD。");
        let log = "";
        try {
          log = execFileSync("git", ["log", "--format=%B%x00", range], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          });
        } catch {
          return usage(`git log ${range} 失败：范围里没有提交，或分支名不存在。`);
        }
        for (const chunk of log.split("\0")) {
          if (chunk.trim()) messages.push({ label: `git log ${range}`, text: chunk });
        }
        break;
      }
      case "--help":
      case "-h":
        return usage();
      default:
        return usage(`未知参数 ${flag}。`);
    }
  }

  if (messages.length === 0) return usage("没有可以校验的信息。");

  const failed = messages.filter(({ label, text }) => !report(label, checkMessage(text)));
  if (failed.length > 0) {
    console.error(`\n${failed.length} 条不合规。规范见 site/src/app/submit/page.tsx 的「提交规范」，`);
    console.error("或 https://lull-desktop.github.io/Lull-Community/submit#spec\n");
    process.exit(1);
  }
  console.log(`✓ ${messages.length} 条提交信息合规。`);
}

function usage(problem) {
  if (problem) console.error(`\n${problem}`);
  console.error(`
用法：node scripts/check-commit.mjs <来源>

  -m, --message <text>   校验一段信息
  -f, --file <path>      校验文件（.git/COMMIT_EDITMSG）
      --stdin            从标准输入读，多条用 NUL 或空行分隔
      --range <range>    校验一段提交历史，例如 origin/main..HEAD
  -h, --help             显示本说明

格式：type(scope): subject
type：${TYPES.join(" / ")}
scope：${SCOPES.join(" / ")}
`);
  process.exit(2);
}

// 只在直接运行时读参数，被 import 时只导出 checkMessage
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}

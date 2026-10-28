#!/usr/bin/env node
/**
 * `scripts/ci/import-submission.mjs`
 *
 * 合并作业的入口（工作流：submission-import.yml）。维护者评论 `/merge <commit>` 触发。
 *
 *   node scripts/ci/import-submission.mjs --issue <number> --body "<评论原文>"
 *
 * 这个脚本是**唯一**能写 `content/` 与 `community.json` 的自动化路径。它的顺序：
 *   ① 权限：评论者是 admin/maintain/write（或 issue 提交人本人）
 *   ② 重跑校验，并要求解析出的 commit 仍是授权的那一个（防「审完再改」）
 *   ③ 拷贝到 content/<group>/<slug>/，规范化 item.json
 *   ④ 重算摘要（digestPolicy: write）→ 再校验一遍（必须零错误）
 *   ⑤ 写 community.json
 *   ⑥ 一次提交、一次推送
 * 任何一步失败都回滚工作区，main 上不会出现半个作品。
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { createGitHub, WRITE_PERMISSIONS } from "./lib/github.mjs";
import { evaluateIssue } from "./lib/evaluate.mjs";
import { COMMENT_MARKERS, MANAGED_LABELS, parseMergeCommand, renderMergeComment } from "./lib/submission.mjs";
import { KIND_KEY, readRegistry, setEntry, writeRegistry } from "../lib/registry.mjs";
import { loadContent } from "../validate-content.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GROUP = { scene: "scenes", widget: "widgets" };

const { values } = parseArgs({ options: { issue: { type: "string" }, body: { type: "string" } } });
const issueNumber = Number(values.issue);
const command = parseMergeCommand(values.body ?? "");

if (!issueNumber || !command) {
  console.error('用法：node scripts/ci/import-submission.mjs --issue <number> --body "/merge <commit>"');
  process.exit(2);
}

const github = createGitHub();
const fail = async (reason) => {
  console.error(reason);
  try {
    await github.comment(issueNumber, `${COMMENT_MARKERS.merge}\n❌ 合并失败：${reason}\n\nmain 没有任何改动。`);
  } catch {
    /* 评论失败不该掩盖真正的原因 */
  }
  process.exit(1);
};

if (command.error) await fail("命令格式不对：应该是 `/merge <commit>`，commit 至少 7 位。");

const issue = await github.getIssue(issueNumber);
if (issue.state !== "open") await fail("这个 issue 已经关闭了。");

// ① 权限：仓库写权限，或就是提交人本人
const actor = process.env.GITHUB_ACTOR || issue.user?.login;
const permission = await github.getPermission(actor);
if (actor !== issue.user?.login && !WRITE_PERMISSIONS.has(permission)) {
  await fail(`@${actor} 没有权限合并这条 issue（需要仓库 write 及以上）。`);
}

// ② 重新校验，并确认提交没变
const evaluation = await evaluateIssue(github, { issue, baseDir: ROOT });
try {
  if (evaluation.errors.length > 0) await fail(`格式检查未通过：\n- ${evaluation.errors.join("\n- ")}`);
  if (!evaluation.source?.commit) await fail("这次评估没有解析出提交，无法合并。");
  if (!evaluation.source.commit.startsWith(command)) {
    await fail(
      `issue 现在指向 \`${evaluation.source.commit.slice(0, 12)}\`，与授权的 \`${command}\` 不一致。` +
        "作者可能刚改过 issue；请按新的提交重新审查后再合并。",
    );
  }

  const start = git(["rev-parse", "HEAD"]);
  const target = join(ROOT, "content", GROUP[evaluation.kind], evaluation.slug);
  // 更新时保留首次收录日期，新收录用今天
  const previousAddedAt = existsSync(join(target, "item.json"))
    ? JSON.parse(readFileSync(join(target, "item.json"), "utf8")).addedAt
    : null;

  try {
    // ③ 落盘
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    cpSync(evaluation.stagedDir, target, { recursive: true, verbatimSymlinks: true });
    normalizeItemJson(target, previousAddedAt);

    // ④ 重算摘要 → 复核
    const written = loadContent({ root: ROOT, digestPolicy: "write" });
    requireClean(written, "重算摘要后仍有错误");
    const verified = loadContent({ root: ROOT });
    requireClean(verified, "提交前复核未通过");

    // ⑤ 登记
    const version = evaluation.manifest.version;
    const today = new Date().toISOString().slice(0, 10);
    const registry = readRegistry(ROOT);
    const previous = evaluation.isUpdate ? registry[KIND_KEY[evaluation.kind]]?.[evaluation.itemId] : null;
    setEntry(registry, evaluation.kind, evaluation.itemId, {
      slug: evaluation.slug,
      owners: previous?.owners ?? [issue.user.login],
      submission: previous?.submission ?? issueNumber,
      source: evaluation.source.repository,
      path: evaluation.source.path ?? "",
      commit: evaluation.source.commit,
      version,
      addedAt: previous?.addedAt ?? today,
      updatedAt: today,
      ...(previous ? { lastIssue: issueNumber } : {}),
    });
    writeRegistry(registry, ROOT);

    // ⑥ 提交并推送（一次提交，main 上不出现中间态）
    const action = evaluation.isUpdate ? "更新" : "收录";
    const subject = `content(${evaluation.kind}): ${action}「${evaluation.manifest.name}」 ${evaluation.itemId}@${version}`;
    const body = [
      `Imported from ${evaluation.source.repository}@${evaluation.source.commit}${
        evaluation.source.path ? ` (${evaluation.source.path})` : ""
      }, reviewed in #${issueNumber}.`,
      "",
      `Co-authored-by: ${issue.user.login} <${issue.user.id}+${issue.user.login}@users.noreply.github.com>`,
    ].join("\n");
    git(["add", "-A", "--", `content/${GROUP[evaluation.kind]}/${evaluation.slug}`, "community.json"]);
    git(["commit", "-q", "-m", subject, "-m", body]);
    const mergeCommit = git(["rev-parse", "HEAD"]);

    try {
      git(["push", "origin", "HEAD:main"]);
    } catch (error) {
      git(["reset", "-q", "--hard", start]);
      throw new Error(
        `推送到 main 失败（可能有人同时推送了）：${String(error.stderr ?? error.message).trim().split("\n").pop()}`,
      );
    }

    await github.upsertComment(issueNumber, COMMENT_MARKERS.merge, renderMergeComment({ evaluation, mergeCommit }));
    await github.removeLabel(issueNumber, MANAGED_LABELS.awaitingReview);
    await github.removeLabel(issueNumber, MANAGED_LABELS.needsChanges);
    await github.addLabels(issueNumber, [MANAGED_LABELS.imported]);
    await github.closeIssue(issueNumber);
    console.log(`${action} ${evaluation.itemId}@${version} → ${mergeCommit}`);
  } catch (error) {
    git(["reset", "-q", "--hard", start]);
    throw error;
  }
} catch (error) {
  await fail(error.message);
} finally {
  evaluation.cleanup();
}

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "github-actions[bot]",
      GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
      GIT_COMMITTER_NAME: "github-actions[bot]",
      GIT_COMMITTER_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
    },
  }).trim();
}

/** 校验结果里只要还有 error 就抛，附上前 10 条（够定位，不至于把评论刷屏）。 */
function requireClean(result, label) {
  const errors = result.problems.filter((problem) => problem.level === "error");
  if (errors.length === 0) return;
  const detail = errors
    .slice(0, 10)
    .map((problem) => `${problem.where}：${problem.message}`)
    .join("\n- ");
  throw new Error(`${label}：\n- ${detail}${errors.length > 10 ? `\n- …另有 ${errors.length - 10} 条` : ""}`);
}

/**
 * item.json 里由维护侧决定的字段：
 * - `addedAt` 记录首次收录日期（更新时保留，新收录用今天），作者不能自己定「最新」的排序；
 * - `featured` 一律先置 false，精选由维护者在 PR 里单独改。
 * 其余字段（tags、preview、screenshots、authorUrl…）保持作者写的样子。
 */
function normalizeItemJson(dir, previousAddedAt) {
  const file = join(dir, "item.json");
  const item = JSON.parse(readFileSync(file, "utf8"));
  item.featured = false;
  item.addedAt = previousAddedAt ?? new Date().toISOString().slice(0, 10);
  writeFileSync(file, `${JSON.stringify(item, null, 2)}\n`);
}

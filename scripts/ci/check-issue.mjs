#!/usr/bin/env node
/**
 * `scripts/ci/check-issue.mjs`
 *
 * 格式检查作业的入口（工作流：submission-check.yml）。
 *
 *   node scripts/ci/check-issue.mjs --issue <number>
 *
 * 跑在 main 的检出上：规则取自 main，作者改不了。流程：
 *   重复提交（同 kind 同 id 的更早 issue）→ 关掉并指回第一条
 *   否则取回作者仓库的提交、校验、回帖、打标签；失败退出码 1。
 *
 * 作业没有 secrets，只读作者仓库，不执行其中任何内容。
 */
import { parseArgs } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createGitHub, setCheckLabels } from "./lib/github.mjs";
import { evaluateIssue } from "./lib/evaluate.mjs";
import {
  COMMENT_MARKERS,
  MANAGED_LABELS,
  SUBMISSION_LABELS,
  findEarlierSubmission,
  issueTarget,
  renderCheckComment,
  renderDuplicateComment,
  takenBySubmissionError,
} from "./lib/submission.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const { values } = parseArgs({ options: { issue: { type: "string" } } });
const issueNumber = Number(values.issue);
if (!issueNumber) {
  console.error("用法：node scripts/ci/check-issue.mjs --issue <number>");
  process.exit(2);
}

// 本地复跑时最常见的是环境变量没设；别让它变成一坨堆栈。
process.on("unhandledRejection", (error) => {
  console.error(`✗ ${error?.message ?? error}`);
  process.exit(1);
});

const github = (() => {
  try {
    return createGitHub();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    console.error('  本地复跑需要 GitHub 凭据：');
    console.error('    PS> $env:GITHUB_TOKEN = gh auth token');
    console.error('    PS> $env:GITHUB_REPOSITORY = "Lull-Desktop/Lull-Community"');
    process.exit(2);
  }
})();
const issue = await github.getIssue(issueNumber);
if (issue.state !== "open") {
  console.log(`#${issueNumber} 已关闭，跳过`);
  process.exit(0);
}
if (!issueTarget(issue)) {
  console.log(`#${issueNumber} 不是投稿 issue，跳过`);
  process.exit(0);
}

// 同一作品只留一条提交 issue：后开的那条关掉，并指回第一条。
const earlier = await findEarlierSubmissionFor(github, issue);
if (earlier?.sameAuthor) {
  await github.upsertComment(issueNumber, COMMENT_MARKERS.duplicate, renderDuplicateComment(earlier));
  await github.removeLabel(issueNumber, MANAGED_LABELS.awaitingReview);
  await github.removeLabel(issueNumber, MANAGED_LABELS.needsChanges);
  await github.addLabels(issueNumber, [MANAGED_LABELS.duplicate]);
  await github.closeIssue(issueNumber, "duplicate");
  console.log(`#${issueNumber} 已关闭：与 #${earlier.original.number} 重复（${earlier.itemId}）`);
  process.exit(0);
}

const evaluation = await evaluateIssue(github, { issue, baseDir: ROOT });
if (earlier) evaluation.errors.push(takenBySubmissionError(earlier));

try {
  const passed = evaluation.errors.length === 0;
  await github.upsertComment(
    issueNumber,
    COMMENT_MARKERS.check,
    renderCheckComment({
      errors: evaluation.errors,
      warnings: evaluation.warnings,
      evaluation,
      checkedAt: new Date().toISOString(),
    }),
  );
  await setCheckLabels(github, issueNumber, passed, MANAGED_LABELS);
  console.log(
    passed
      ? `#${issueNumber} 通过：${evaluation.source.repository}@${evaluation.source.commit}`
      : `#${issueNumber} 未通过：\n- ${evaluation.errors.join("\n- ")}`,
  );
  process.exitCode = passed ? 0 : 1;
} finally {
  evaluation.cleanup();
}

/** 只在同 kind 的提交标签里找；更新永远不算重复。 */
async function findEarlierSubmissionFor(client, current) {
  if (issueTarget(current)?.form !== "submission") return null;
  const others = [];
  for (const label of SUBMISSION_LABELS) {
    others.push(...(await client.listOpenIssues(label)));
  }
  const unique = [...new Map(others.map((item) => [item.number, item])).values()];
  return findEarlierSubmission(current, unique);
}

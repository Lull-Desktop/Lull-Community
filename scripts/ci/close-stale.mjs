#!/usr/bin/env node
/**
 * `scripts/ci/close-stale.mjs`
 *
 * 关掉「格式检查失败、且作者 14 天没回应」的投稿 issue（工作流：close-stale.yml）。
 *
 *   node scripts/ci/close-stale.mjs            # 真关
 *   node scripts/ci/close-stale.mjs --dry-run  # 只打印
 *
 * 判定在 `isStaleFailure()` 里：最后一次检查是失败的，之后既没有新检查（作者编辑或重开），
 * 也没有作者本人的评论。检查通过后维护者打的 needs-changes 属于审查反馈，不会被这里关掉。
 */
import { createGitHub } from "./lib/github.mjs";
import {
  COMMENT_MARKERS,
  MANAGED_LABELS,
  STALE_DAYS,
  SUBMISSION_LABELS,
  isStaleFailure,
  renderStaleComment,
} from "./lib/submission.mjs";

const dryRun = process.argv.includes("--dry-run");
const github = createGitHub();

const open = [];
for (const label of SUBMISSION_LABELS) {
  open.push(...(await github.listOpenIssues(label)));
}
const issues = [...new Map(open.map((issue) => [issue.number, issue])).values()];
console.log(`扫描 ${issues.length} 条 open 的投稿 issue（阈值 ${STALE_DAYS} 天）`);

let closed = 0;
for (const issue of issues) {
  const comments = await github.listComments(issue.number);
  if (!isStaleFailure({ issue, comments })) continue;
  if (dryRun) {
    console.log(`  · 将关闭 #${issue.number} ${issue.title}`);
    continue;
  }
  await github.upsertComment(issue.number, COMMENT_MARKERS.stale, renderStaleComment());
  await github.removeLabel(issue.number, MANAGED_LABELS.awaitingReview);
  await github.removeLabel(issue.number, MANAGED_LABELS.needsChanges);
  await github.closeIssue(issue.number, "not_planned");
  closed += 1;
  console.log(`  · 已关闭 #${issue.number} ${issue.title}`);
}

console.log(dryRun ? `空跑结束：${closed} 条会被关闭` : `完成：关闭 ${closed} 条`);

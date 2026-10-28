/**
 * `scripts/ci/lib/evaluate.mjs`
 *
 * 把一条投稿 issue 变成「一份可以直接提交的目录 + 一份检查结果」。
 *
 *   issue（表单） → 字段校验 → ref 解析成 commit → 浅取作者仓库
 *   → stage 成 content/<group>/<slug>/ → 用仓库自己的 validate-content 复核
 *   → 与登记表 / 已收录版本交叉核对
 *
 * 检查作业与合并作业调用的是同一个函数，所以「检查通过」与「合并时再验一次」看到的是同一份东西：
 * 维护者评论 `/merge <commit>` 之后，合并作业会重新跑一遍，并要求解析出的 commit 仍然是它。
 *
 * 这里**不执行**作者仓库里的任何内容：只有 git 取回、JSON 解析与字节哈希。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { listPackageFiles } from "../../lib/digest.mjs";
import { getEntry, readRegistry } from "../../lib/registry.mjs";
import { loadContent } from "../../validate-content.mjs";
import { WRITE_PERMISSIONS } from "./github.mjs";
import {
  FORM_FIELDS,
  checkIssueTitle,
  compareVersions,
  issueTarget,
  missingCapabilityNotes,
  parseSubmissionIssue,
  unexplainedNetworkHosts,
} from "./submission.mjs";
import { fetchCommit, resolveRef, reviewLinks, stageItemFiles } from "./source.mjs";

const GROUP = { scene: "scenes", widget: "widgets" };

const kindLabel = (kind) => (kind === "scene" ? "壁纸" : "插件");

/**
 * 仓库里现有的组件市场，按 `kind:id` 索引。
 * 顺带拿到 slug（目录名）与版本，供「id 是否已占用」「版本是否递增」使用。
 */
export const loadExisting = (baseDir) => {
  const result = loadContent({ root: baseDir, digestPolicy: "skip" });
  const byKey = new Map();
  const bySlug = new Map();
  for (const item of result.items) {
    const record = { kind: item.kind, slug: item.slug, id: item.manifest.id, version: item.manifest.version, manifest: item.manifest, dir: item.dir };
    byKey.set(`${item.kind}:${item.manifest.id}`, record);
    bySlug.set(`${item.kind}:${item.slug}`, record);
  }
  return { items: result.items, byKey, bySlug, result };
};

/** 目录内全部文件的相对路径（用于评论里的「将要收录的文件」）。符号链接会让它抛错。 */
const filesOf = (dir) => listPackageFiles(dir).map((file) => file.name);

const emptyResult = (target) => ({
  kind: target?.kind ?? null,
  form: target?.form ?? null,
  itemId: null,
  slug: null,
  manifest: null,
  isUpdate: target?.form === "update",
  previousVersion: null,
  source: null,
  stagedDir: null,
  files: [],
  digest: null,
  links: null,
  errors: [],
  warnings: [],
  cleanup: () => {},
});

/**
 * 评估一条 issue。
 *
 * @param {ReturnType<import('./github.mjs').createGitHub> | null} github
 * @param {{ issue: any, baseDir: string, fetchUrlFor?: (url: string) => string, allowLocal?: boolean }} options
 * @returns {Promise<ReturnType<typeof emptyResult>>}
 */
export const evaluateIssue = async (github, { issue, baseDir, fetchUrlFor = (url) => url, allowLocal = false }) => {
  const target = issueTarget(issue);
  const result = emptyResult(target);
  if (!target) {
    result.errors.push("这个 issue 不是壁纸/插件的提交或更新：请用对应的 issue 模板新建");
    return result;
  }

  const { fields, errors, warnings } = parseSubmissionIssue(issue.body, target);
  result.errors.push(...errors);
  result.warnings.push(...warnings);
  result.itemId = fields.itemId || null;
  result.slug = fields.slug || null;

  const titleError = checkIssueTitle(issue.title, target);
  if (titleError) result.errors.unshift(titleError);

  if (result.errors.length > 0) return result;

  const existing = loadExisting(baseDir);
  let registry;
  try {
    registry = readRegistry(baseDir);
  } catch (error) {
    result.errors.push(`community.json 读不出来：${error.message}`);
    return result;
  }

  const entry = getEntry(registry, target.kind, fields.itemId);
  let repository;
  let itemPath;
  let previous = null;
  // 更新时 slug 取登记的，不看表单（表单也没有这个字段）。
  let slug = fields.slug;

  if (target.form === "submission") {
    const taken = existing.byKey.get(`${target.kind}:${fields.itemId}`);
    if (taken) {
      result.errors.push(
        `${kindLabel(target.kind)} id \`${fields.itemId}\` 已被收录（content/${GROUP[target.kind]}/${taken.slug}）；更新已收录作品请用「${kindLabel(target.kind)}更新」`,
      );
    }
    const slugTaken = existing.bySlug.get(`${target.kind}:${fields.slug}`);
    if (slugTaken) {
      result.errors.push(`目录名 \`${fields.slug}\` 已被 ${slugTaken.id} 占用；同一 kind 下 slug 必须唯一`);
    }
    repository = fields.repository;
    itemPath = fields.path;
  } else {
    if (!entry) {
      result.errors.push(`\`${fields.itemId}\` 不是已收录的${kindLabel(target.kind)}；新作品请用「${kindLabel(target.kind)}提交」`);
      return result;
    }
    previous = existing.byKey.get(`${target.kind}:${fields.itemId}`) ?? null;
    if (!previous) {
      result.errors.push(`community.json 登记了 \`${fields.itemId}\`，但 content/ 里找不到它；请联系维护者`);
      return result;
    }
    result.previousVersion = previous.version;
    const owners = Array.isArray(entry.owners) ? entry.owners : [];
    const author = issue.user?.login;
    const isOwner = author && owners.includes(author);
    if (!isOwner) {
      const permission = github ? await github.getPermission(author) : "none";
      if (!WRITE_PERMISSIONS.has(permission)) {
        result.errors.push(
          `只有登记的作者（${owners.map((owner) => `@${owner}`).join("、") || "无"}）或维护者可以提交更新`,
        );
      }
    }
    if (!entry.source) {
      result.errors.push(`\`${fields.itemId}\` 没有登记源码仓库，请联系维护者补上`);
      return result;
    }
    repository = entry.source;
    itemPath = entry.path ?? "";
    slug = entry.slug ?? previous.slug;
    result.slug = slug;
  }

  if (result.errors.length > 0) return result;

  let commit;
  try {
    commit = resolveRef(fetchUrlFor(repository), fields.ref, { allowLocal });
  } catch (error) {
    result.errors.push(
      error.message.startsWith("仓库") ? error.message : `无法访问源码仓库：${String(error.stderr ?? error.message).trim().split("\n").pop()}`,
    );
    return result;
  }
  result.source = { repository, path: itemPath, ref: fields.ref, commit };

  let checkout;
  try {
    checkout = fetchCommit(fetchUrlFor(repository), commit, { ref: fields.ref, allowLocal });
  } catch (error) {
    result.errors.push(error.message);
    return result;
  }

  // 「作品目录」留空的含义是「就在仓库根」。但绝大多数投稿按推荐结构放在
  // content/<group>/<slug>/ 下，留空只会得到「根目录里没有作品」这种没法自救的报错。
  // 这里先探一眼，把该填什么直接告诉作者。
  if (!itemPath) {
    const guess = `content/${GROUP[target.kind]}/${slug}`;
    if (!fs.existsSync(path.join(checkout, "package")) && fs.existsSync(path.join(checkout, guess, "package"))) {
      result.errors.push(
        `仓库根目录没有 \`package/\`；看起来作品在 \`${guess}\`——请把「${FORM_FIELDS.path}」填成 \`${guess}\``,
      );
      fs.rmSync(checkout, { recursive: true, force: true });
      return result;
    }
  }

  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lull-stage-"));
  const stagedRoot = path.join(stagingRoot, "content", GROUP[target.kind]);
  fs.mkdirSync(stagedRoot, { recursive: true });
  result.cleanup = () => fs.rmSync(stagingRoot, { recursive: true, force: true });

  try {
    result.stagedDir = stageItemFiles(checkout, itemPath, slug, stagedRoot);
  } catch (error) {
    result.errors.push(error.message);
    return result;
  } finally {
    fs.rmSync(checkout, { recursive: true, force: true });
  }

  // 用仓库自己的规则复核：摘要策略设为 skip——作者不需要跑 content:hash，摘要在合并时重算。
  const staged = loadContent({ root: stagingRoot, digestPolicy: "skip", verifyDigest: false });
  for (const problem of staged.problems) {
    if (problem.level === "error") result.errors.push(`${problem.where}：${problem.message}`);
    else if (problem.level === "warn") result.warnings.push(`${problem.where}：${problem.message}`);
  }
  if (staged.items.length !== 1) {
    result.errors.push(
      `作品目录里应当恰好有一个作品（package/ 里一份清单），当前识别到 ${staged.items.length} 个`,
    );
    return result;
  }

  const item = staged.items[0];
  result.manifest = item.manifest;
  result.digest = item.digest;
  if (item.kind !== target.kind) {
    result.errors.push(`清单看起来是${kindLabel(item.kind)}，但表单提交的是${kindLabel(target.kind)}`);
  }
  if (item.manifest.id !== fields.itemId) {
    result.errors.push(
      `「作品 id / Item id」（\`${fields.itemId}\`）与清单里的 id（\`${item.manifest.id}\`）不一致`,
    );
  }
  if (item.slug !== slug) {
    result.errors.push(`目录名 \`${slug}\` 与作品目录里的 slug（\`${item.slug}\`）不一致`);
  }

  if (target.form === "submission") {
    const license = String(item.manifest.license ?? "").trim();
    if (license.toLowerCase() !== String(fields.license ?? "").trim().toLowerCase()) {
      result.errors.push(
        `「许可证 / License」（${fields.license || "空"}）与清单里的 license（${license || "空"}）不一致`,
      );
    }
    const missing = missingCapabilityNotes(item.manifest.capabilities, fields.capabilities);
    for (const capability of missing) {
      result.errors.push(`「能力说明 / Capabilities」里没有解释 \`${capability}\` 为什么需要`);
    }
    const hosts = unexplainedNetworkHosts(item.manifest.network, fields.capabilities);
    if (hosts.length > 0) {
      result.warnings.push(`网络白名单里的 ${hosts.join("、")} 没在能力说明里出现，审查时确认一下用途`);
    }
  } else if (previous) {
    const order = compareVersions(item.manifest.version, previous.version);
    if (!(order > 0)) {
      result.errors.push(`更新必须提升版本号：已收录 ${previous.version}，提交的是 ${item.manifest.version}`);
    }
    if (item.slug !== previous.slug) {
      result.errors.push(`slug 不能改：已收录 \`${previous.slug}\`，提交的是 \`${item.slug}\``);
    }
  }

  try {
    result.files = filesOf(item.dir);
  } catch (error) {
    result.errors.push(`目录无法收录：${error.message}（不能包含符号链接或特殊文件）`);
  }
  result.links = reviewLinks(repository, commit, itemPath, entry?.commit ?? null);

  return result;
};

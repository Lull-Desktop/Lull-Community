/**
 * `scripts/ci/lib/submission.mjs`
 *
 * 社区投稿的规则，全部是纯函数：怎么读四份 issue 表单、字段怎么归一化与校验、
 * 哪条 issue 是重复提交、什么时候该因为没人回应关掉、机器人的评论长什么样。
 * 这里没有网络也没有 git，所以每条规则都能被单测覆盖（test/submission.test.mjs）。
 *
 * 一条纪律：**表单 label 文本就是协议**。FORM_FIELDS 的 value 与
 * `.github/ISSUE_TEMPLATE/*.yml` 里的 `label:` 必须逐字相同，
 * `test/forms.test.mjs` 会扫模板文件核对，改一边不改另一边会红。
 */
import { ID_PATTERNS, SLUG } from "../../validate-content.mjs";
import { isValidRef, normalizeItemPath, normalizeRepositoryUrl } from "./source.mjs";

export const KINDS = ["scene", "widget"];
export const FORMS = ["submission", "update"];

/** 四条 kind 标签：kind 与表单种类的唯一判定依据（模板自动打）。 */
export const LABELS = {
  "scene-submission": { kind: "scene", form: "submission" },
  "scene-update": { kind: "scene", form: "update" },
  "widget-submission": { kind: "widget", form: "submission" },
  "widget-update": { kind: "widget", form: "update" },
};

/** 机器人维护的流程标签。 */
export const MANAGED_LABELS = {
  awaitingReview: "awaiting-review",
  needsChanges: "needs-changes",
  imported: "imported",
  duplicate: "duplicate",
};

export const SUBMISSION_LABELS = Object.keys(LABELS);

/** 模板往标题里填的前缀；作者要在后面补上作品名字。 */
export const TITLE_PREFIXES = {
  "scene-submission": "[壁纸提交]",
  "scene-update": "[壁纸更新]",
  "widget-submission": "[插件提交]",
  "widget-update": "[插件更新]",
};

/**
 * 表单 label（逐字）。四份模板共用一套，语义由模板的 description 区分。
 * 改动这里必须同步改模板，反之亦然。
 */
export const FORM_FIELDS = {
  itemId: "作品 id / Item id",
  slug: "目录名 slug / Slug",
  repository: "源码仓库 / Source repository",
  ref: "版本 / Version (tag or commit)",
  path: "作品目录 / Item directory",
  description: "作品说明 / Description",
  capabilities: "能力说明 / Capabilities",
  license: "许可证 / License",
  changes: "更新说明 / What changed",
  screenshot: "运行截图 / Screenshot",
  confirmations: "确认 / Confirmations",
};

/** 各模板应当出现的字段 key（供测试与自检使用；顺序不影响解析）。 */
export const FORM_TEMPLATE_FIELDS = {
  "scene-submission": [
    "itemId",
    "slug",
    "repository",
    "ref",
    "path",
    "description",
    "capabilities",
    "license",
    "screenshot",
    "confirmations",
  ],
  "scene-update": ["itemId", "ref", "changes", "confirmations"],
  "widget-submission": [
    "itemId",
    "repository",
    "ref",
    "path",
    "description",
    "capabilities",
    "license",
    "screenshot",
    "confirmations",
  ],
  "widget-update": ["itemId", "ref", "changes", "confirmations"],
};

/** 标题前缀，全角方括号与半角等价。 */
const TITLE_PREFIX = /^[[【]\s*(?:壁纸|插件)(?:提交|更新)\s*[\]】]/;

export const titleKey = (target) => `${target.kind}-${target.form}`;

const labelNames = (issue) =>
  (issue?.labels ?? []).map((label) => (typeof label === "string" ? label : label?.name)).filter(Boolean);

/**
 * 这条 issue 是什么：`{ kind, form }`，或 null（不是投稿类 issue）。
 * 同时带提交与更新两条标签时按 update 处理——与 folium 一致，宁可少收一次新作品，
 * 也不要把一次更新当成新作品重新收录。
 */
export const issueTarget = (issue) => {
  const found = labelNames(issue)
    .map((name) => LABELS[name])
    .filter(Boolean);
  return found.find((target) => target.form === "update") ?? found[0] ?? null;
};

/** 标题不能只有模板前缀；返回错误文案或 null。 */
export const checkIssueTitle = (title, target) => {
  const rest = String(title ?? "")
    .trim()
    .replace(TITLE_PREFIX, "")
    .trim();
  if (rest) return null;
  const prefix = TITLE_PREFIXES[titleKey(target)];
  return `issue 标题不能只有「${prefix}」，请在后面写上作品的名字，例如「${prefix} 极光帷幕」`;
};

/**
 * issue form 渲染成 `### <label>\n\n<value>` 段。返回 `{ sections, duplicates }`：
 * - 空的可选字段被 GitHub 写成 `_No response_`，这里当空串；
 * - 同一个 label 出现两次 → 记进 `duplicates`。表单本身不会产生重复段，
 *   出现重复意味着有人在正文里手写了 `### 源码仓库 / Source repository` 想顶掉真实值。
 */
export const parseIssueFormSections = (body) => {
  const sections = {};
  const duplicates = [];
  const parts = String(body ?? "")
    .replace(/\r\n/g, "\n")
    .split(/^### +/m)
    .slice(1);
  for (const part of parts) {
    const newline = part.indexOf("\n");
    const label = (newline === -1 ? part : part.slice(0, newline)).trim();
    let value = newline === -1 ? "" : part.slice(newline + 1).trim();
    if (value === "_No response_") value = "";
    if (Object.hasOwn(sections, label)) duplicates.push(label);
    sections[label] = value;
  }
  return { sections, duplicates };
};

/**
 * 只认 GitHub 自己托管的图：拖进表单上传（user-attachments / 老 user-images），
 * 或仓库 assets 链接。外链（图床、raw.githubusercontent）一律不算——
 * 那些图随时会被换掉，起不到「运行截图」的作用。
 */
const UPLOADED_IMAGE_URL =
  /^https:\/\/(?:github\.com\/(?:user-attachments\/assets|[\w.-]+\/[\w.-]+\/assets)\/|(?:private-)?user-images\.githubusercontent\.com\/)/;

/** 一段 markdown 里上传到 GitHub 的图片 URL。 */
export const findUploadedImages = (text) => {
  const source = String(text ?? "");
  const urls = [
    ...[...source.matchAll(/!\[[^\]]*\]\(\s*<?([^\s)>]+)/g)].map((match) => match[1]),
    ...[...source.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]),
  ];
  return urls.filter((url) => UPLOADED_IMAGE_URL.test(url));
};

const checkedAll = (text) => /- \[[xX]\]/.test(text) && !/- \[ \]/.test(text);

/**
 * 读一张提交/更新表单。
 *
 * 返回 `{ target, fields, errors, warnings }`；`fields` 里：
 * - `itemId`、`ref`、`slug`（scene 必填，widget 取 id）、`form`、`kind` 一定有；
 * - submission 额外有 `repository`、`path`（`""` 表示仓库根）、`description`、`capabilities`、`license`；
 * - update 额外有 `changes`；`repository` / `path` / `slug` 由登记表提供，这里不读。
 */
export const parseSubmissionIssue = (body, target) => {
  const { sections, duplicates } = parseIssueFormSections(body);
  const errors = [];
  const warnings = [];
  const { kind, form } = target;

  const read = (key) => (sections[FORM_FIELDS[key]] ?? "").trim();

  for (const label of duplicates) {
    errors.push(`表单里「${label}」出现了不止一次：请不要在正文里手写 \`### ${label}\`，改动请直接改上面的输入框`);
  }

  const itemId = read("itemId");
  const idPattern = ID_PATTERNS[kind];
  if (!idPattern.test(itemId)) {
    errors.push(
      `「${FORM_FIELDS.itemId}」必须是清单里的 id（${
        kind === "scene" ? "小写字母、数字与 . _ -，建议「作者.场景」" : "小写字母开头，字母、数字与连字符"
      }），当前是 \`${itemId || "空"}\``,
    );
  }

  const rawSlug = read("slug");
  let slug = "";
  if (kind === "widget") {
    slug = itemId;
  } else if (form === "submission") {
    slug = rawSlug;
    if (!SLUG.test(slug)) {
      errors.push(`「${FORM_FIELDS.slug}」必须是 2–32 位小写字母、数字与连字符（同时是站点 URL 段），当前是 \`${slug || "空"}\``);
    }
  } else if (rawSlug) {
    warnings.push(`更新不需要填「${FORM_FIELDS.slug}」，已忽略；slug 以 community.json 的登记为准`);
  }

  const ref = read("ref");
  if (!isValidRef(ref)) {
    errors.push(`「${FORM_FIELDS.ref}」必须是 tag、分支名或完整的 40 位 commit，当前是 \`${ref || "空"}\``);
  }

  const fields = { kind, form, itemId, slug, ref, repository: null, path: null, description: "", capabilities: "", license: "", changes: "" };

  if (form === "submission") {
    const repository = normalizeRepositoryUrl(read("repository"));
    if (!repository) {
      errors.push(`「${FORM_FIELDS.repository}」必须是公开仓库的 https 地址（如 https://github.com/you/lull-wallpapers）`);
    }
    const itemPath = normalizeItemPath(read("path"));
    if (itemPath === null) {
      errors.push(`「${FORM_FIELDS.path}」必须是仓库内的相对路径，根目录留空`);
    }

    const description = read("description");
    if ([...description].length < 4) {
      errors.push(`「${FORM_FIELDS.description}」至少写 4 个字，说清它是什么`);
    }

    const capabilities = read("capabilities");
    if ([...capabilities].length < 20) {
      errors.push(`「${FORM_FIELDS.capabilities}」逐条说明清单里每个能力为什么需要（至少 20 字）`);
    }

    const license = read("license");
    if (!license) {
      errors.push(`「${FORM_FIELDS.license}」必填，且要与作品目录里的 LICENSE 一致`);
    } else if ([...license].length > 64) {
      errors.push(`「${FORM_FIELDS.license}」太长（${[...license].length} 字符），写 SPDX 标识或短语即可`);
    }

    if (findUploadedImages(read("screenshot")).length === 0) {
      errors.push(
        `「${FORM_FIELDS.screenshot}」需要一张真实运行的截图：把图片拖进这个框上传（外部图片链接不算）`,
      );
    }

    Object.assign(fields, {
      repository,
      path: itemPath ?? "",
      description,
      capabilities,
      license,
    });
  } else {
    const changes = read("changes");
    if ([...changes].length < 8) {
      errors.push(`「${FORM_FIELDS.changes}」至少写 8 个字，说明这个版本改了什么`);
    }
    fields.changes = changes;
  }

  if (!checkedAll(read("confirmations"))) {
    errors.push(`请勾选「${FORM_FIELDS.confirmations}」里的全部项目`);
  }

  return { target, fields, errors, warnings };
};

/** 清单里的每个能力都必须在「能力说明」里出现过——把「申请了什么」和「为什么需要」绑在一起。 */
export const missingCapabilityNotes = (capabilities, text) => {
  const body = String(text ?? "");
  return (Array.isArray(capabilities) ? capabilities : []).filter((capability) => !body.includes(capability));
};

/** 网络白名单里的每条 host 也应当被解释过（只警告，不阻断）。 */
export const unexplainedNetworkHosts = (network, text) => {
  const body = String(text ?? "");
  return (Array.isArray(network) ? network : []).filter((source) => {
    try {
      return !body.includes(new URL(source).host);
    } catch {
      return true;
    }
  });
};

const parseVersion = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version ?? ""));
  return match ? match.slice(1).map(Number) : null;
};

/** 语义化版本的 MAJOR.MINOR.PATCH 比较：负 / 零 / 正；不可解析返回 NaN。 */
export const compareVersions = (left, right) => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return Number.NaN;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
};

/** 表单里写的 id（不做正则校验），用于「同一作品只留一条提交」的比对。 */
export const formItemId = (body) => {
  const { sections } = parseIssueFormSections(body);
  return (sections[FORM_FIELDS.itemId] ?? "").trim();
};

/**
 * 同一作品更早的一条提交 issue，或 null。只有「同 kind、同 id、更早、open」才算，
 * 所以两条重复提交里后开的那条是重复的。更新永远不算重复：一个作品可以同时开多条更新。
 */
export const findEarlierSubmission = (issue, others) => {
  const target = issueTarget(issue);
  if (!target || target.form !== "submission") return null;
  const itemId = formItemId(issue.body);
  if (!itemId) return null;
  const original = (others ?? [])
    .filter((other) => !other.pull_request && other.state === "open" && other.number < issue.number)
    .filter((other) => {
      const otherTarget = issueTarget(other);
      return otherTarget?.kind === target.kind && otherTarget.form === "submission" && formItemId(other.body) === itemId;
    })
    .sort((a, b) => a.number - b.number)[0];
  if (!original) return null;
  return { original, itemId, sameAuthor: original.user?.login === issue.user?.login };
};

export const COMMENT_MARKERS = {
  check: "<!-- lull-bot:check -->",
  checkFailed: "<!-- lull-bot:check-failed -->",
  merge: "<!-- lull-bot:merge -->",
  duplicate: "<!-- lull-bot:duplicate -->",
  stale: "<!-- lull-bot:stale -->",
};

/** 格式检查失败且作者没回应的天数。 */
export const STALE_DAYS = 14;

const CHECKED_AT = /<!-- lull-bot:checked-at=(\S+) -->/;

/** 机器人上一次检查的时间：评论自己记的优先，否则用评论时间戳。 */
export const checkTime = (comment) => {
  const recorded = CHECKED_AT.exec(comment?.body ?? "")?.[1];
  const time = Date.parse(recorded ?? comment?.updated_at ?? comment?.created_at ?? "");
  return Number.isNaN(time) ? null : time;
};

/**
 * 这条 open 的提交/更新是否该因为没人回应而关掉：最后一次格式检查是失败的，
 * 且此后既没有新检查（作者编辑或重开）也没有作者本人的评论。
 * 检查通过之后维护者打的 needs-changes 属于审查反馈，不在这里关。
 */
export const isStaleFailure = ({ issue, comments, now = Date.now(), days = STALE_DAYS }) => {
  if (!issue || issue.state !== "open" || issue.pull_request || !issueTarget(issue)) return false;
  const check = (comments ?? [])
    .filter((comment) => comment.user?.type === "Bot" && comment.body?.includes(COMMENT_MARKERS.check))
    .pop();
  if (!check?.body.includes(COMMENT_MARKERS.checkFailed)) return false;
  const author = issue.user?.login;
  const times = [
    checkTime(check),
    ...(comments ?? [])
      .filter((comment) => comment.user?.login === author)
      .map((comment) => Date.parse(comment.created_at)),
  ].filter((time) => Number.isFinite(time));
  if (times.length === 0) return false;
  return now - Math.max(...times) >= days * 24 * 60 * 60 * 1000;
};

/** `/merge <commit>`：只认评论首行，其余内容永远不参与解释。 */
export const parseMergeCommand = (body) => {
  const firstLine = String(body ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")[0]
    .trim();
  if (!/^\/merge(\s|$)/.test(firstLine)) return null;
  const match = /^\/merge\s+([0-9a-fA-F]{7,40})$/.exec(firstLine);
  return match ? match[1].toLowerCase() : { error: true };
};

export const renderDuplicateComment = ({ itemId, original }) =>
  [
    COMMENT_MARKERS.duplicate,
    `作品 \`${itemId}\` 已经在 #${original.number} 里提交过了。同一个作品只保留一条提交 issue，这个 issue 关闭。`,
    "",
    `请回到 #${original.number} 更新：直接编辑那个 issue（例如换成新的 tag、补上截图），CI 会自动重新检查。`,
  ].join("\n");

export const takenBySubmissionError = ({ itemId, original }) =>
  `作品 id \`${itemId}\` 已经在 #${original.number}（@${original.user?.login}）里申请收录；请换一个 id，或到 #${original.number} 与对方沟通`;

export const renderStaleComment = ({ days = STALE_DAYS } = {}) =>
  [
    COMMENT_MARKERS.stale,
    `格式检查未通过，且 ${days} 天内没有回应，这个 issue 自动关闭。`,
    "",
    "修改好之后，请重新开一个 issue。",
  ].join("\n");

const kindLabel = (kind) => (kind === "scene" ? "壁纸" : "插件");

/**
 * 检查结果评论。通过时给出「将要收录的文件清单 + 摘要 + 维护者命令」，
 * 并记一条 `checked-at` 供过期关闭作业读取。
 */
export const renderCheckComment = ({ errors, warnings = [], evaluation = null, checkedAt = null }) => {
  const lines = [COMMENT_MARKERS.check];
  if (checkedAt) lines.push(`<!-- lull-bot:checked-at=${checkedAt} -->`);
  const source = evaluation?.source;
  const at = source?.commit
    ? `（\`${source.repository}\` @ \`${source.commit.slice(0, 12)}\`）`
    : "";

  if (errors.length === 0) {
    lines.push(`✅ 格式检查通过${at}。请等待维护者审查。`);
    if (evaluation) {
      const manifest = evaluation.manifest ?? {};
      const capabilities =
        Array.isArray(manifest.capabilities) && manifest.capabilities.length > 0
          ? manifest.capabilities.join(", ")
          : "无";
      lines.push("");
      lines.push(
        `${kindLabel(evaluation.kind)}：\`${manifest.id}\` ${
          evaluation.isUpdate ? `${evaluation.previousVersion} → ${manifest.version}` : manifest.version
        } · 能力：${capabilities} · 目录 \`${evaluation.slug}\``,
      );
      if (source?.path) lines.push(`来源目录：\`${source.path}\``);
      if (evaluation.links?.compare) lines.push(`与已收录版本对比：${evaluation.links.compare}`);
      if (evaluation.links?.tree) lines.push(`源码：${evaluation.links.tree}`);
      lines.push("");
      lines.push(
        `<details><summary>将要收录的 ${evaluation.files.length} 个文件（摘要 \`${evaluation.digest}\`）</summary>`,
      );
      lines.push("");
      lines.push("```");
      evaluation.files.slice(0, 200).forEach((line) => lines.push(String(line).trimEnd()));
      if (evaluation.files.length > 200) lines.push(`…（另有 ${evaluation.files.length - 200} 个）`);
      lines.push("```");
      lines.push("</details>");
      lines.push("");
      const short = String(source?.commit ?? "").slice(0, 12);
      if (short) {
        lines.push(
          `维护者审查这个提交后，在本 issue 评论 \`/merge ${short}\` 即可合并；作者修改 issue 指向新的提交后，需要按新提交重新审查。`,
        );
      }
    }
  } else {
    lines.push(COMMENT_MARKERS.checkFailed);
    lines.push(`❌ 格式检查未通过${at}，请修改后编辑本 issue，会自动重新检查：`);
    lines.push("");
    errors.forEach((error) => lines.push(`- ${error}`));
    lines.push("");
    lines.push(`${STALE_DAYS} 天内没有回应（编辑 issue 或在这里评论）的话，这个 issue 会被自动关闭。`);
  }

  if (warnings.length > 0) {
    lines.push("");
    lines.push("需要维护者留意：");
    warnings.forEach((warning) => lines.push(`- ${warning}`));
  }
  return lines.join("\n");
};

/** 合并成功的评论。 */
export const renderMergeComment = ({ evaluation, commit, mergeCommit = null }) => {
  const manifest = evaluation.manifest ?? {};
  const action = evaluation.isUpdate ? `已更新到 ${manifest.version}` : `已收录 ${manifest.version}`;
  const lines = [
    COMMENT_MARKERS.merge,
    `✅ \`${manifest.id}\` ${action}，已合入 main${mergeCommit ? `（${mergeCommit.slice(0, 12)}）` : ""}。`,
    "",
    `来源：${evaluation.source.repository} @ \`${evaluation.source.commit.slice(0, 12)}\` · 摘要 \`${evaluation.digest}\``,
    "",
    "站点会在部署完成后更新；下载包与来源信息可在作品详情页看到。",
  ];
  if (commit) lines.push("", commit);
  return lines.join("\n");
};

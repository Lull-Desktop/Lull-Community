/**
 * 投稿规则的单元测试。夹具按 FORM_FIELDS 反渲染表单——这正是 GitHub 的渲染格式
 * （`### <label>` + 空行 + 原文），所以解析器可以在不联网的情况下被完整覆盖。
 *
 * 断言粒度到「错误条数 + 具体文案」：错误文案就是对作者的接口，作者照着它改；
 * 文案变了而测试没变，说明改的人没意识到自己在改协议。
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  FORM_FIELDS,
  FORM_TEMPLATE_FIELDS,
  STALE_DAYS,
  checkIssueTitle,
  compareVersions,
  findEarlierSubmission,
  findUploadedImages,
  isStaleFailure,
  issueTarget,
  missingCapabilityNotes,
  parseIssueFormSections,
  parseMergeCommand,
  parseSubmissionIssue,
  renderCheckComment,
  unexplainedNetworkHosts,
} from "../scripts/ci/lib/submission.mjs";
import {
  isValidRef,
  normalizeItemPath,
  normalizeRepositoryUrl,
  pickCommitFromLsRemote,
} from "../scripts/ci/lib/source.mjs";

const DEFAULTS = {
  itemId: "alice.aurora",
  slug: "aurora",
  repository: "https://github.com/alice/lull-wallpapers",
  ref: "v1.0.0",
  path: "lull/aurora",
  description: "一张安静的极光壁纸，Canvas 绘制。",
  capabilities: "wallpaper.viewport：铺满屏幕；wallpaper.canvas：用 Canvas 画光带",
  license: "CC-BY-4.0",
  screenshot: "![shot](https://github.com/user-attachments/assets/0b5f6c1e-1111-4222-8333-944455556666)",
  changes: "修了多屏下的相位偏移",
  confirmations: "- [x] 作者\n- [x] 无远程\n- [x] 素材\n- [x] 重审",
};

const targetOf = (key) => {
  const [kind, form] = key.split("-");
  return { kind, form };
};

/** 按模板的字段顺序渲染一份 issue 正文。`overrides` 里 undefined 表示删掉该段。 */
const bodyOf = (key, overrides = {}) => {
  const values = { ...DEFAULTS, ...overrides };
  return FORM_TEMPLATE_FIELDS[key]
    .filter((field) => values[field] !== undefined)
    .map((field) => `### ${FORM_FIELDS[field]}\n\n${values[field]}`)
    .join("\n\n");
};

const parse = (key, overrides = {}) => parseSubmissionIssue(bodyOf(key, overrides), targetOf(key));

const issueFor = (key, body, author = "alice", number = 1) => ({
  number,
  state: "open",
  title: `[${key}] x`,
  labels: [{ name: key }],
  body,
  user: { login: author, id: 1 },
});

test("正常提交能读出全部字段", () => {
  const submission = parse("scene-submission", { repository: "https://github.com/dev/cool.git/", path: "./lull/aurora/" });
  assert.deepEqual(submission.errors, []);
  assert.equal(submission.fields.itemId, "alice.aurora");
  assert.equal(submission.fields.slug, "aurora");
  assert.equal(submission.fields.repository, "https://github.com/dev/cool");
  assert.equal(submission.fields.path, "lull/aurora");
  assert.equal(submission.fields.license, "CC-BY-4.0");

  // 根目录：空与 _No response_ 都归一到 ''
  assert.equal(parse("scene-submission", { path: "" }).fields.path, "");
  assert.equal(parse("scene-submission", { path: "_No response_" }).fields.path, "");
});

test("插件不填 slug，目录名等于 id", () => {
  const widget = parse("widget-submission", { itemId: "breathing", slug: undefined });
  assert.deepEqual(widget.errors, []);
  assert.equal(widget.fields.slug, "breathing");
  assert.equal(widget.fields.itemId, "breathing");
});

test("更新表单只读 id / ref / 更新说明 / 确认", () => {
  const update = parse("widget-update", { itemId: "breathing", ref: "v1.1.0" });
  assert.deepEqual(update.errors, []);
  assert.equal(update.target.form, "update");
  assert.equal(update.fields.changes, "修了多屏下的相位偏移");
  assert.equal(update.fields.repository, null);
  // 更新不读截图，也不因为没有截图报错
  assert.deepEqual(parse("scene-update", {}).errors, []);
});

test("坏字段逐条报错，且文案说清怎么改", () => {
  const bad = parse("scene-submission", {
    itemId: "Cool Wall",
    repository: "http://x.test/a/b",
    ref: "a..b",
    path: "../escape",
    screenshot: "![x](https://i.imgur.com/a.png)",
    confirmations: "- [ ] 作者",
  });
  const text = bad.errors.join("\n");
  assert.match(text, /「作品 id \/ Item id」必须是清单里的 id/);
  assert.match(text, /「源码仓库 \/ Source repository」必须是公开仓库的 https 地址/);
  assert.match(text, /「版本 \/ Version \(tag or commit\)」必须是 tag、分支名或完整的 40 位 commit/);
  assert.match(text, /「作品目录 \/ Item directory」必须是仓库内的相对路径/);
  assert.match(text, /「运行截图 \/ Screenshot」需要一张真实运行的截图/);
  assert.match(text, /请勾选「确认 \/ Confirmations」里的全部项目/);
  assert.equal(bad.errors.length, 6);
});

test("scene 的 slug 必填；widget 的 id 必须字母开头", () => {
  assert.match(parse("scene-submission", { slug: "" }).errors.join("\n"), /「目录名 slug \/ Slug」必须是 2–32 位/);
  assert.match(parse("widget-submission", { itemId: "9lives", slug: undefined }).errors.join("\n"), /「作品 id \/ Item id」/);
});

test("有人在正文里手写 ### label 顶替字段时拒绝", () => {
  const body = `${bodyOf("scene-submission")}\n\n### ${FORM_FIELDS.repository}\n\nhttps://github.com/evil/x`;
  const injected = parseSubmissionIssue(body, targetOf("scene-submission"));
  assert.match(injected.errors.join("\n"), /出现了不止一次/);
  const { sections, duplicates } = parseIssueFormSections(body);
  assert.deepEqual(duplicates, [FORM_FIELDS.repository]);
  assert.equal(sections[FORM_FIELDS.repository], "https://github.com/evil/x");
});

test("运行截图只认 GitHub 托管的图", () => {
  assert.equal(findUploadedImages(DEFAULTS.screenshot).length, 1);
  assert.equal(
    findUploadedImages(
      "![a](https://github.com/user-attachments/assets/a)\n![b](https://user-images.githubusercontent.com/1/2.png)",
    ).length,
    2,
  );
  assert.equal(findUploadedImages('![x](https://private-user-images.githubusercontent.com/1/2.png?jwt=t)').length, 1);
  assert.equal(findUploadedImages('![x](https://github.com/dev/cool/assets/1/abc)').length, 1);
  for (const text of [
    "",
    "无",
    "![x](https://i.imgur.com/a.png)",
    "![x](https://raw.githubusercontent.com/dev/cool/main/preview.png)",
    "[shot.zip](https://github.com/user-attachments/files/1/shot.zip)",
    "https://github.com/user-attachments/assets/abc",
  ]) {
    assert.deepEqual(findUploadedImages(text), [], text);
  }
  for (const body of [
    bodyOf("scene-submission", { screenshot: "_No response_" }),
    bodyOf("scene-submission", { screenshot: undefined }),
    bodyOf("scene-submission", { screenshot: "![x](https://i.imgur.com/a.png)" }),
  ]) {
    assert.match(parseSubmissionIssue(body, targetOf("scene-submission")).errors.join("\n"), /运行截图/);
  }
});

test("kind 由 label 判定，更新优先", () => {
  assert.deepEqual(issueTarget({ labels: [{ name: "widget-update" }] }), { kind: "widget", form: "update" });
  assert.deepEqual(issueTarget({ labels: ["scene-submission"] }), { kind: "scene", form: "submission" });
  assert.equal(issueTarget({ labels: ["content-issue"] }), null);
  assert.equal(issueTarget({ labels: [] }), null);
  // 两条标签同时存在时按更新处理
  assert.deepEqual(
    issueTarget({ labels: [{ name: "scene-submission" }, { name: "scene-update" }] }),
    { kind: "scene", form: "update" },
  );
});

test("标题不能只有模板前缀", () => {
  assert.equal(checkIssueTitle("[壁纸提交] 极光帷幕", targetOf("scene-submission")), null);
  assert.equal(checkIssueTitle("【插件更新】breathing", targetOf("widget-update")), null);
  assert.equal(checkIssueTitle("随便写个名字", targetOf("scene-submission")), null);
  for (const bare of ["[壁纸提交] ", "[壁纸提交]", "  【壁纸提交】  ", ""]) {
    assert.match(checkIssueTitle(bare, targetOf("scene-submission")), /不能只有「\[壁纸提交\]」/);
  }
});

test("同一作品的重复提交：后开的算重复，跨 kind 不算，更新不算", () => {
  const open = (number, key, body, author = "alice") => issueFor(key, body, author, number);
  const first = open(5, "scene-submission", bodyOf("scene-submission"));
  const later = open(9, "scene-submission", bodyOf("scene-submission", { ref: "v1.0.1" }));
  const others = [
    first,
    later,
    open(3, "scene-submission", bodyOf("scene-submission", { itemId: "alice.other", slug: "other" })),
    open(4, "scene-update", bodyOf("scene-update")),
    open(6, "widget-submission", bodyOf("widget-submission")),
  ];
  assert.deepEqual(findEarlierSubmission(later, others), { original: first, itemId: "alice.aurora", sameAuthor: true });
  assert.equal(findEarlierSubmission(first, others), null, "第一条是原始提交");
  assert.equal(findEarlierSubmission(open(10, "scene-update", bodyOf("scene-update")), others), null);
  assert.equal(findEarlierSubmission(later, [{ ...first, state: "closed" }]), null, "关掉的提交不阻塞新的");
  assert.equal(findEarlierSubmission(later, [{ ...first, pull_request: {} }]), null);
  const stranger = open(11, "scene-submission", bodyOf("scene-submission"), "mallory");
  assert.equal(findEarlierSubmission(stranger, others).sameAuthor, false);
  assert.equal(findEarlierSubmission(stranger, others).original.number, 5);
});

test("格式检查失败且 14 天无回应 → 过期", () => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-11-01T00:00:00Z");
  const at = (days) => new Date(now - days * day).toISOString();
  const issue = issueFor("scene-submission", bodyOf("scene-submission"), "alice", 7);
  const check = (failed, days) => ({
    user: { login: "github-actions[bot]", type: "Bot" },
    body: renderCheckComment(
      failed
        ? { errors: ["坏了"], checkedAt: at(days) }
        : { errors: [], evaluation: null, checkedAt: at(days) },
    ),
    created_at: at(30),
    updated_at: at(30),
  });
  const said = (login, days) => ({ user: { login, type: "User" }, body: "hi", created_at: at(days), updated_at: at(days) });

  assert.match(check(true, 0).body, /lull-bot:check-failed/);
  assert.match(check(true, 0).body, new RegExp(`${STALE_DAYS} 天内没有回应`));
  assert.equal(isStaleFailure({ issue, comments: [check(true, 15)], now }), true);
  assert.equal(isStaleFailure({ issue, comments: [check(true, 13)], now }), false, "作者刚编辑过");
  assert.equal(isStaleFailure({ issue, comments: [check(true, 15), said("alice", 3)], now }), false);
  assert.equal(isStaleFailure({ issue, comments: [check(true, 15), said("boss", 3)], now }), true, "只认作者的回应");
  assert.equal(isStaleFailure({ issue, comments: [check(false, 30)], now }), false, "通过后的 needs-changes 是审查反馈");
  assert.equal(isStaleFailure({ issue, comments: [], now }), false);
  assert.equal(isStaleFailure({ issue: { ...issue, state: "closed" }, comments: [check(true, 30)], now }), false);
  // 老评论没有 checked-at，退回评论时间戳
  const legacy = { ...check(true, 0), body: "<!-- lull-bot:check -->\n<!-- lull-bot:check-failed -->\n❌", updated_at: at(20) };
  assert.equal(isStaleFailure({ issue, comments: [legacy], now }), true);
});

test("/merge 只认首行", () => {
  assert.equal(parseMergeCommand("/merge abc1234"), "abc1234");
  assert.equal(parseMergeCommand("/merge ABCDEF1234567890"), "abcdef1234567890");
  assert.deepEqual(parseMergeCommand("/merge"), { error: true });
  assert.deepEqual(parseMergeCommand("/merge abc"), { error: true });
  assert.equal(parseMergeCommand("看这里 /merge abc1234"), null);
  assert.equal(parseMergeCommand("> /merge abc1234"), null, "引用别人的话不触发");
  assert.equal(parseMergeCommand(""), null);
});

test("版本比较", () => {
  assert.ok(compareVersions("1.1.0", "1.0.9") > 0);
  assert.equal(compareVersions("2.0.0", "2.0.0"), 0);
  assert.ok(compareVersions("1.0.0", "1.0.1") < 0);
  assert.ok(Number.isNaN(compareVersions("1.0", "1.0.0")));
});

test("能力说明必须覆盖清单里每个能力", () => {
  assert.deepEqual(missingCapabilityNotes(["widget.ui", "widget.state"], "widget.ui 自绘界面，widget.state 记住选择"), []);
  assert.deepEqual(missingCapabilityNotes(["widget.ui", "widget.state"], "widget.ui 自绘界面"), ["widget.state"]);
  assert.deepEqual(unexplainedNetworkHosts(["https://api.example.com/x"], "连 https://api.example.com 取待办"), []);
  assert.deepEqual(unexplainedNetworkHosts(["https://api.example.com/x"], "连一个接口"), ["https://api.example.com/x"]);
});

test("来源字段的归一化与校验", () => {
  assert.equal(normalizeRepositoryUrl("https://github.com/a/b"), "https://github.com/a/b");
  assert.equal(normalizeRepositoryUrl("https://github.com/a/b.git/"), "https://github.com/a/b");
  assert.equal(normalizeRepositoryUrl("http://github.com/a/b"), null);
  assert.equal(normalizeRepositoryUrl("https://user:pw@github.com/a/b"), null);
  assert.equal(normalizeRepositoryUrl("https://github.com/a/b?x=1"), null);
  assert.equal(normalizeRepositoryUrl("https://github.com/a"), null);

  assert.equal(normalizeItemPath(""), "");
  assert.equal(normalizeItemPath("./lull/aurora/"), "lull/aurora");
  assert.equal(normalizeItemPath("../escape"), null);
  assert.equal(normalizeItemPath("/abs"), null);
  assert.equal(normalizeItemPath("lull\\aurora"), null);
  assert.equal(normalizeItemPath("C:/x"), null);

  assert.equal(isValidRef("v1.0.0"), true);
  assert.equal(isValidRef("feat/x"), true);
  assert.equal(isValidRef("a".repeat(40)), true);
  assert.equal(isValidRef("a..b"), false);
  assert.equal(isValidRef("x.lock"), false);
  assert.equal(isValidRef(""), false);
});

test("附注标签取剥开后的 commit；tag 优先于同名分支", () => {
  const output = [
    "1111111111111111111111111111111111111111\trefs/heads/v1.0.0",
    "2222222222222222222222222222222222222222\trefs/tags/v1.0.0",
    "3333333333333333333333333333333333333333\trefs/tags/v1.0.0^{}",
  ].join("\n");
  assert.equal(pickCommitFromLsRemote(output, "v1.0.0"), "3333333333333333333333333333333333333333");
  assert.equal(pickCommitFromLsRemote(output, "nope"), null);
});

test("检查通过的评论包含文件清单与 /merge 命令", () => {
  const body = renderCheckComment({
    errors: [],
    evaluation: {
      kind: "scene",
      slug: "aurora",
      isUpdate: false,
      previousVersion: null,
      digest: "deadbeef",
      files: ["package/catalog.json", "item.json"],
      manifest: { id: "alice.aurora", version: "1.0.0", capabilities: ["wallpaper.canvas"] },
      source: { repository: "https://github.com/alice/x", path: "lull/aurora", commit: "a".repeat(40) },
      links: { tree: "https://github.com/alice/x/tree/aaa", compare: null },
    },
    checkedAt: "2026-11-01T00:00:00.000Z",
  });
  assert.match(body, /✅ 格式检查通过/);
  assert.match(body, /将要收录的 2 个文件/);
  assert.match(body, /`wallpaper.canvas`|wallpaper\.canvas/);
  assert.match(body, /\/merge aaaaaaaaaaaa/);
  assert.match(body, /lull-bot:checked-at=2026-11-01/);
  assert.doesNotMatch(body, /check-failed/);
});

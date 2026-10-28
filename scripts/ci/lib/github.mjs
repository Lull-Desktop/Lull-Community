/**
 * `scripts/ci/lib/github.mjs`
 *
 * 只包住机器人在 issue 上要用的那几个动作：读 issue、读/写评论、加减标签、关单、
 * 查某人的仓库权限。不引第三方 SDK——少一个依赖，也少一处看不见的网络行为。
 *
 * 所有请求都是同步语义的 async 调用，出错直接抛（调用方决定是不是要吞）。
 */
const API = "https://api.github.com";

const json = async (response) => {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!response.ok) {
    const detail = body?.message ?? response.statusText;
    throw new Error(`GitHub API ${response.status}：${detail}`);
  }
  return body;
};

/**
 * @param {{ token?: string, repository?: string, fetchImpl?: typeof fetch }} [options]
 */
export const createGitHub = (options = {}) => {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const repository = options.repository ?? process.env.GITHUB_REPOSITORY;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!token) throw new Error("缺少 GITHUB_TOKEN");
  if (!repository || !repository.includes("/")) throw new Error("缺少 GITHUB_REPOSITORY（owner/repo）");

  const call = (path, init = {}) =>
    fetchImpl(`${API}/repos/${repository}${path}`, {
      ...init,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
        "user-agent": "lull-community-bot",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    }).then(json);

  return {
    repository,

    getIssue: (number) => call(`/issues/${number}`),

    /** 某个标签下的 open issue（不含 PR，API 会一起返回，调用方自己滤）。 */
    async listOpenIssues(label) {
      const issues = await call(`/issues?state=open&per_page=100&labels=${encodeURIComponent(label)}`);
      return (issues ?? []).filter((issue) => !issue.pull_request);
    },

    async listComments(number) {
      return (await call(`/issues/${number}/comments?per_page=100`)) ?? [];
    },

    comment: (number, body) => call(`/issues/${number}/comments`, { method: "POST", body: JSON.stringify({ body }) }),

    /**
     * 按 marker 更新或新建评论。每次检查都调它，所以同一条 issue 上不会堆出一串机器人回复。
     * 内容没变就不发请求。
     */
    async upsertComment(number, marker, body) {
      const comments = await this.listComments(number);
      const existing = comments.filter((comment) => comment.user?.type === "Bot" && comment.body?.includes(marker)).pop();
      if (!existing) {
        await this.comment(number, body);
        return { created: true };
      }
      if (existing.body === body) return { created: false, unchanged: true };
      await call(`/issues/comments/${existing.id}`, { method: "PATCH", body: JSON.stringify({ body }) });
      return { created: false, updated: true };
    },

    addLabels: (number, labels) =>
      call(`/issues/${number}/labels`, { method: "POST", body: JSON.stringify({ labels }) }),

    async removeLabel(number, label) {
      try {
        await call(`/issues/${number}/labels/${encodeURIComponent(label)}`, { method: "DELETE" });
        return true;
      } catch {
        // 本来就没有这个标签：不是错误
        return false;
      }
    },

    closeIssue: (number, reason = "completed") =>
      call(`/issues/${number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: reason }) }),

    /** 某人在本仓库的权限级别：admin / maintain / write / read / none。 */
    async getPermission(login) {
      try {
        const data = await call(`/collaborators/${encodeURIComponent(login)}/permission`);
        return data?.permission ?? "none";
      } catch (error) {
        if (String(error.message).includes("404")) return "none";
        throw error;
      }
    },
  };
};

/** 能签/能合并的权限级别。 */
export const WRITE_PERMISSIONS = new Set(["admin", "maintain", "write"]);

/** 检查通过/失败时要落的标签；只动自己管的那两个，不碰作者或维护者加的标签。 */
export const setCheckLabels = async (github, number, passed, labels) => {
  if (passed) {
    await github.removeLabel(number, labels.needsChanges);
    await github.addLabels(number, [labels.awaitingReview]);
  } else {
    await github.removeLabel(number, labels.awaitingReview);
    await github.addLabels(number, [labels.needsChanges]);
  }
};

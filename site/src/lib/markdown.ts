import MarkdownIt from "markdown-it";

/**
 * README 在构建时渲染成 HTML，客户端不带 markdown 运行时。
 *
 * `html: false`：作者写的裸 HTML 会被转义，只保留 markdown 语法。
 * 内容经过 PR 审核，但没必要为此打开一个注入面。
 */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
});

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const href = token.attrGet("href") ?? "";
  if (/^https?:\/\//.test(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noreferrer noopener");
  }
  return defaultLinkOpen(tokens, index, options, env, self);
};

/**
 * README 的第一行通常是自己的一级标题（`# 雾岚 · Mist`），
 * 而详情页已经有标题了，重复渲染会显得笨重。这里只去掉开头的那个 h1。
 */
function stripLeadingTitle(source: string): string {
  return source.replace(/^\s*#\s+.*(?:\r?\n)+/, "");
}

export function renderMarkdown(source: string): string {
  return md.render(stripLeadingTitle(source));
}
